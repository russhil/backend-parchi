"""
Parchi.ai — FastAPI Backend (MVP)
Now with Supabase database and Google AI Studio (Gemma-3-27b-it) integration.
"""

import json
import os
import uuid
import io
from contextlib import asynccontextmanager
from auth import User
from datetime import datetime, timedelta
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, UploadFile, File, WebSocket, WebSocketDisconnect, Header, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import google.generativeai as genai
import auth

import asyncio
import logging
import traceback
from transcription import transcribe_audio
from llm_provider import init_llm, get_llm
from database import (
    verify_login,
    get_patient,
    get_all_patients,
    search_patients,
    create_patient,
    update_patient,
    get_appointments_for_patient,
    get_todays_appointments,
    get_all_appointments,
    create_appointment,
    update_appointment,
    get_appointment_with_details,
    get_appointments_summary_for_patient,
    get_ai_intake_summary_for_appointment,
    get_differential_diagnosis_for_appointment,
    get_clinical_dumps_for_appointment,
    get_visits_for_patient,
    create_visit,
    get_documents_for_patient,
    create_document,
    search_documents,
    get_consults_for_patient,
    create_consult_session,
    update_consult_session,
    get_consult_session,
    get_ai_intake_summary,
    create_ai_intake_summary,
    get_differential_diagnosis,
    get_report_insights,
    create_prescription,
    get_prescriptions_for_patient,
    create_note,
    get_notes_for_patient,
    save_differential_diagnoses,
    create_clinical_dump,
    update_clinical_dump,
    get_clinical_dumps_for_patient,
    get_clinical_dump,
    find_patient_duplicate,
    find_existing_appointment,
    create_intake_token,
    get_intake_token,
    update_intake_token,
    get_supabase,
    delete_patient,
    delete_appointment_retain,
    delete_appointment_purge,
)
from supabase_storage import upload_file
from prompts import (
    CONSULT_ANALYSIS_PROMPT,
    DIFFERENTIAL_CANDIDATES_PROMPT,
    DIFFERENTIAL_SCORING_PROMPT,
    PATIENT_QA_PROMPT,
    MASTER_PATIENT_PROMPT,
    SUMMARY_CHIEF_COMPLAINT_PROMPT,
    SUMMARY_ONSET_PROMPT,
    SUMMARY_SEVERITY_PROMPT,
    SUMMARY_FINDINGS_PROMPT,

    SUMMARY_CONTEXT_PROMPT,
    SEARCH_CANDIDATES_PROMPT,
    SEARCH_REASONING_PROMPT,
    CHAT_SUGGESTIONS_PROMPT,
)
from gemini_live import GeminiLive, TOOL_DECLARATIONS, TOOL_MAPPING
from consult_transcription import ConsultTranscriber
from ocr_utils import extract_text_from_url, extract_text_from_bytes
from whatsapp_utils import send_intake_whatsapp

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"), override=True)

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
MODEL_NAME = os.getenv("MODEL_NAME", "gemma-3-27b-it")

# Gemini Live (Vertex AI) configuration
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID", "")
GCP_LOCATION = os.getenv("GCP_LOCATION", "us-central1")
GEMINI_LIVE_MODEL = os.getenv("GEMINI_LIVE_MODEL", "gemini-2.5-flash-native-audio-preview-12-2025")

# Configure logging
logger = logging.getLogger(__name__)


SELF_PING_URL = os.getenv(
    "SELF_PING_URL", "https://backend-parchi.onrender.com/health"
)
SELF_PING_INTERVAL = int(os.getenv("SELF_PING_INTERVAL", "300"))  # seconds (default 5 min)


async def _keep_alive_ping():
    """Background task: pings the Render deployment every N seconds to prevent spin-down."""
    import urllib.request
    import urllib.error

    logger.info(
        "Keep-alive pinger started — hitting %s every %d s",
        SELF_PING_URL,
        SELF_PING_INTERVAL,
    )
    while True:
        try:
            await asyncio.sleep(SELF_PING_INTERVAL)
            req = urllib.request.Request(SELF_PING_URL, method="GET")
            with urllib.request.urlopen(req, timeout=10) as resp:
                logger.info(
                    "Keep-alive ping → %s  (status %s)", SELF_PING_URL, resp.status
                )
        except urllib.error.URLError as e:
            logger.warning("Keep-alive ping failed (URLError): %s", e)
        except asyncio.CancelledError:
            logger.info("Keep-alive pinger stopped.")
            return
        except Exception as e:
            logger.warning("Keep-alive ping error: %s", e)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle for the FastAPI app."""
    # -- Startup --
    logger.info("Starting backend with PORT=%s", os.environ.get("PORT", "8000"))

    # Ensure Supabase Storage bucket exists
    try:
        from supabase_storage import ensure_bucket_exists
        ensure_bucket_exists()
    except Exception as e:
        logger.warning("Could not ensure storage bucket: %s", e)

    # Start keep-alive self-ping background task
    ping_task = asyncio.create_task(_keep_alive_ping())

    yield

    # -- Shutdown --
    ping_task.cancel()
    try:
        await ping_task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="Parchi.ai API", version="1.0.0", lifespan=lifespan)

# CORS Configuration
cors_origins_str = os.getenv("CORS_ORIGINS", "*")
origins = [origin.strip() for origin in cors_origins_str.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize global LLM provider
init_llm()

def get_model_legacy():
    """Fallback for any direct genai usage if still needed, though should be avoided."""
    import google.generativeai as genai
    return genai.GenerativeModel(MODEL_NAME)


# --- Request/Response Models ---


class SearchRequest(BaseModel):
    query: str


class ConsultStartRequest(BaseModel):
    patient_id: str


class ConsultStopRequest(BaseModel):
    transcript_text: str


class ChatRequest(BaseModel):
    patient_id: str
    message: str
    history: list[dict] = []


class AppointmentRequest(BaseModel):
    patient_id: str
    start_time: str
    reason: str
    status: str = "scheduled"


class LoginRequest(BaseModel):
    username: str
    password: str
    clinic_slug: str


class PrescriptionRequest(BaseModel):
    patient_id: str
    medications: list[dict]  # [{name, dosage, frequency, duration, instructions}]
    diagnosis: str = ""
    notes: str = ""


class NoteRequest(BaseModel):
    patient_id: str
    content: str
    note_type: str = "general"


class MarkSeenRequest(BaseModel):
    appointment_id: str


class SaveDumpRequest(BaseModel):
    dump_id: str
    manual_notes: str = ""
    appointment_id: str | None = None
    analyze: bool = True


class PatientRequest(BaseModel):
    name: str
    age: int | None = None
    gender: str | None = None
    phone: str | None = None
    email: str | None = None
    address: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    conditions: list[str] = []
    medications: list[str] = []
    allergies: list[str] = []
    vitals: dict = {}


class IntakeCheckRequest(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    dob: str | None = None


class IntakeOtpRequest(BaseModel):
    email: str


class IntakeVerifyRequest(BaseModel):
    user_json_url: str

class IntakeSubmitRequest(BaseModel):
    # Patient Data
    patient_id: str | None = None
    name: str

    dob: str
    gender: str
    phone: str
    email: str
    address: str
    height_cm: float | None = None
    weight_kg: float | None = None
    conditions: list[str] = []
    medications: list[str] = []
    allergies: list[str] = []
    history: str
    
    # Visit Data
    reason: str
    symptoms: str
    
    # Documents
    documents: list[dict] = [] # [{url, name, type}]


class SetupIntakeRequest(BaseModel):
    phone: str
    name: str
    appointment_time: str
    patient_id: str | None = None

class ParchiEntry(BaseModel):
    name: str
    phone: str
    appointment_time: str  # ISO format

class ParchiProcessRequest(BaseModel):
    entries: list[ParchiEntry]



class IntakeTokenSubmitRequest(BaseModel):
    token: str
    
    # Patient Data (Optional updates)
    dob: str | None = None
    gender: str | None = None
    email: str | None = None
    address: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    conditions: list[str] = []
    medications: list[str] = []
    allergies: list[str] = []
    history: str | None = None
    
    # Visit Data
    reason: str
    symptoms: str
    
    # Documents
    documents: list[dict] = []


# --- Helper Functions ---


def safe_list_to_string(value) -> str:
    """Safely convert a list (or other type) to a comma-separated string."""
    if value is None:
        return "None"
    if isinstance(value, str):
        return value
    if isinstance(value, (list, tuple)):
        return ", ".join(str(v) for v in value if v)
    return str(value)


def build_patient_context(patient_id: str) -> dict:
    """Build full patient context for LLM prompts."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    documents = get_documents_for_patient(patient_id)
    visits = get_visits_for_patient(patient_id)
    consults = get_consults_for_patient(patient_id)
    clinical_dumps = get_clinical_dumps_for_patient(patient_id)

    return {
        "patient": patient,
        "documents": documents,
        "visits": visits,
        "consults": consults,
        "clinical_dumps": clinical_dumps,
    }



def generate_ai_response(prompt: str, max_tokens: int = 1000) -> str:
    """Generate AI response using the global LLM provider."""
    llm = get_llm()
    if not llm:
        return "AI is not configured. Please set GOOGLE_API_KEY in your environment."
    return llm.generate(prompt, max_tokens)


async def generate_ai_response_async(prompt: str, max_tokens: int = 1000) -> str:
    """Generate AI response using the global LLM provider (Asynchronous)."""
    llm = get_llm()
    if not llm:
        return "AI is not configured. Please set GOOGLE_API_KEY in your environment."
    return await llm.generate_async(prompt, max_tokens)



# --- Routes: Auth ---


@app.post("/login")
def login(req: LoginRequest):
    """Login endpoint — returns JWT access token."""
    logger.info(f"Login attempt for user: {req.username} at clinic: {req.clinic_slug}")
    try:
        user_info = verify_login(req.username, req.password, req.clinic_slug)
        logger.info(f"Login result for {req.username}: {bool(user_info)}")
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = auth.create_access_token(
            data={
                "sub": user_info["username"],
                "user_id": user_info["user_id"], # Fixed key from "id" to "user_id"
                "clinic_id": user_info["clinic_id"],
                "doctor_id": user_info["doctor_id"],
                "role": user_info["role"]
            },
            expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "clinic_id": user_info["clinic_id"],
            "clinic_name": user_info["clinic_name"],
            "doctor_id": user_info["doctor_id"],
            "doctor_name": user_info["doctor_name"],
            "role": user_info["role"],
        }
    except Exception as e:
        logger.error(f"Login failed for user {req.username} at clinic {req.clinic_slug}: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )


@app.get("/me")
def get_current_user_info(user: User = Depends(auth.get_current_user)):
    """Return current logged-in user info."""
    return {
        "user_id": user.id,
        "username": user.username,
        "clinic_id": user.clinic_id,
        "doctor_id": user.doctor_id,
        "role": user.role,
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "model": MODEL_NAME, "ai_configured": bool(GOOGLE_API_KEY)}


@app.get("/health/gemini-live")
def gemini_live_health():
    """Pre-validate Gemini Live configuration."""
    issues = []
    auth_mode = "api_key" if GOOGLE_API_KEY else "vertex_ai"

    if not GOOGLE_API_KEY and not GCP_PROJECT_ID:
        issues.append("No GOOGLE_API_KEY or GCP_PROJECT_ID set")
    if not GEMINI_LIVE_MODEL:
        issues.append("GEMINI_LIVE_MODEL not set")

    return {
        "status": "ok" if not issues else "misconfigured",
        "auth_mode": auth_mode,
        "model": GEMINI_LIVE_MODEL,
        "project_id": GCP_PROJECT_ID if auth_mode == "vertex_ai" else None,
        "issues": issues or None,
    }


# --- Routes: Gemini Live Voice Chat ---


@app.websocket("/ws/gemini-live")
async def gemini_live_websocket(websocket: WebSocket):
    """WebSocket endpoint for Gemini Live voice chat.
    Binary messages = audio PCM, Text messages = JSON events.
    """
    await websocket.accept()
    logger.info("[WS] Gemini Live connection accepted")

    audio_input_queue = asyncio.Queue()
    text_input_queue = asyncio.Queue()

    async def audio_output_callback(data):
        """Send raw PCM bytes back to browser."""
        await websocket.send_bytes(data)

    from google.genai import types as genai_types
    gemini = GeminiLive(
        project_id=GCP_PROJECT_ID,
        location=GCP_LOCATION,
        model=GEMINI_LIVE_MODEL,
        input_sample_rate=16000,
        tools=[genai_types.Tool(function_declarations=TOOL_DECLARATIONS)],
        tool_mapping=TOOL_MAPPING,
        api_key=GOOGLE_API_KEY,
    )

    async def receive_from_client():
        try:
            while True:
                message = await websocket.receive()
                if message.get("bytes"):
                    await audio_input_queue.put(message["bytes"])
                elif message.get("text"):
                    await text_input_queue.put(message["text"])
        except WebSocketDisconnect:
            logger.info("[WS] Client disconnected")
        except Exception as e:
            logger.error(f"[WS] Error receiving from client: {e}")

    receive_task = asyncio.create_task(receive_from_client())

    try:
        async for event in gemini.start_session(
            audio_input_queue=audio_input_queue,
            text_input_queue=text_input_queue,
            audio_output_callback=audio_output_callback,
        ):
            if event:
                await websocket.send_json(event)
    except WebSocketDisconnect:
        logger.info("[WS] Client disconnected during session")
    except Exception as e:
        logger.error(f"[WS] Error in Gemini session: {e}")
        logger.error(traceback.format_exc())
        # Classify error and send user-friendly message to client
        err_str = str(e).lower()
        if "api key" in err_str or "authenticate" in err_str or "permission" in err_str or "403" in err_str:
            user_msg = "Authentication failed. Check your GOOGLE_API_KEY."
        elif "not found" in err_str or "404" in err_str or "model" in err_str:
            user_msg = f"Model not found: {GEMINI_LIVE_MODEL}. Check GEMINI_LIVE_MODEL env var."
        elif "quota" in err_str or "rate" in err_str or "429" in err_str:
            user_msg = "API quota exceeded. Please try again later."
        elif "connect" in err_str or "timeout" in err_str or "network" in err_str:
            user_msg = "Network error connecting to Gemini API."
        else:
            user_msg = f"Gemini session error: {e}"
        try:
            await websocket.send_json({"type": "error", "error": user_msg})
        except Exception:
            pass
    finally:
        receive_task.cancel()
        try:
            await websocket.close()
        except:
            pass
        logger.info("[WS] WebSocket handler finished")


# --- Routes: Patients ---


@app.get("/patients")
def list_patients(current_user: auth.User = Depends(auth.get_current_user)):
    """List all patients, scoped to clinic."""
    patients = get_all_patients(clinic_id=current_user.clinic_id)
    return {"patients": patients}


@app.get("/patient/{patient_id}")
def get_patient_details(patient_id: str, current_user: auth.User = Depends(auth.get_current_user)):
    """Return patient + related data for the patient profile page."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    # Security check: Ensure patient belongs to current user's clinic
    if patient.get("clinic_id") and patient.get("clinic_id") != current_user.clinic_id:
         # If patient has a clinic_id and it doesn't match, deny access
         # Note: Legacy patients with NULL clinic_id might be accessible if logic permits,
         # but migration moves them to 'cl-default'.
         if patient.get("clinic_id") != current_user.clinic_id:
             raise HTTPException(status_code=403, detail="Access denied to this patient")

    # Get appointment summary list for patient page sidebar
    appointments_summary = get_appointments_summary_for_patient(patient_id)
    
    # Full appointments for backward compatibility
    appointments = get_appointments_for_patient(patient_id)
    visits = get_visits_for_patient(patient_id)
    documents = get_documents_for_patient(patient_id)
    consults = get_consults_for_patient(patient_id)
    prescriptions = get_prescriptions_for_patient(patient_id)
    notes = get_notes_for_patient(patient_id)
    
    # Get AI-generated data (patient-level for the profile)
    ai_intake = get_ai_intake_summary(patient_id)
    differential = get_differential_diagnosis(patient_id)
    report_insights = get_report_insights(patient_id)

    return {
        "patient": patient,
        "appointments_summary": appointments_summary or [],  # For patient page list
        "appointments": sorted(appointments, key=lambda x: x.get("start_time", "")) if appointments else [],
        "visits": sorted(visits, key=lambda x: x.get("visit_time", ""), reverse=True) if visits else [],
        "documents": documents or [],
        "consult_sessions": consults or [],
        "prescriptions": prescriptions or [],
        "notes": notes or [],
        "ai_intake_summary": ai_intake,
        "differential_diagnosis": differential or [],
        "report_insights": report_insights,
    }


@app.post("/patients")
def create_new_patient(req: PatientRequest, current_user: auth.User = Depends(auth.get_current_user)):
    """Create a new patient."""
    try:
        logger.info(f"Creating patient with name: {req.name}")
        patient_id = f"p-{uuid.uuid4().hex[:8]}"
        
        patient_data = {
            "id": patient_id,
            "name": req.name,
        }
        
        # Add optional fields if provided
        # Note: Only including fields that exist in the current database schema
        if req.age is not None:
            patient_data["age"] = req.age
        if req.gender:
            patient_data["gender"] = req.gender
        if req.phone:
            patient_data["phone"] = req.phone
        if req.email:
            patient_data["email"] = req.email
        if req.address:
            patient_data["address"] = req.address
        if req.height_cm is not None:
            patient_data["height_cm"] = req.height_cm
        if req.weight_kg is not None:
            patient_data["weight_kg"] = req.weight_kg
        if req.conditions:
            patient_data["conditions"] = req.conditions
        if req.medications:
            patient_data["medications"] = req.medications
        if req.allergies:
            patient_data["allergies"] = req.allergies
        if req.vitals:
            patient_data["vitals"] = req.vitals
        
        logger.info(f"Patient data prepared: {patient_data}")
        patient = create_patient(patient_data, clinic_id=current_user.clinic_id)
        logger.info(f"Patient created successfully: {patient}")
        
        # Include the phone in the response even if not stored in DB yet
        response_patient = {**patient}
        if req.phone:
            response_patient["phone"] = req.phone
        if req.email:
            response_patient["email"] = req.email
        if req.address:
            response_patient["address"] = req.address
            
        return {"patient": response_patient}
    except Exception as e:
        logger.error(f"Error creating patient: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create patient: {str(e)}")

# --- Routes: Search ---


@app.post("/search")
async def search(req: SearchRequest, current_user: auth.User = Depends(auth.get_current_user)):
    """
    AI-powered search across all patient data.
    1. Feeds patient summaries to AI to find matches.
    2. Asks AI for relevance reason for each match.
    """
    query = req.query.strip()
    if not query:
        return {"results": []}

    # 1. Fetch all patients and build context
    all_patients = get_all_patients(clinic_id=current_user.clinic_id)
    if not all_patients:
        return {"results": []}

    # Fetch appointments to include in context
    all_appointments = get_all_appointments(clinic_id=current_user.clinic_id)
    appt_map = {}
    for appt in all_appointments:
        pid = appt.get("patient_id")
        if pid not in appt_map:
            appt_map[pid] = []
        
        # Format: Date: Reason (Status)
        try:
            date_str = appt.get("start_time", "").split("T")[0]
        except:
            date_str = "Unknown date"
            
        reason = appt.get("reason", "No reason provided")
        status = appt.get("status", "unknown")
        appt_map[pid].append(f"{date_str}: {reason} ({status})")

    patient_summaries = []
    patient_map = {p["id"]: p for p in all_patients}
    
    # Pre-fetch contexts (optimization: could be parallelized or cached)
    # For MVP, we'll do lightweight fetch
    for p in all_patients:
        # Get latest visit note or summary
        visits = get_visits_for_patient(p["id"])
        last_visit = visits[0].get("summary_ai", "") if visits else "No visits"
        
        # Get documents
        docs = get_documents_for_patient(p["id"])
        doc_titles = ", ".join([d["title"] for d in docs[:3]])  # First 3 docs
        
        # Get recent appointments
        p_appts = appt_map.get(p["id"], [])
        recent_appts = " | ".join(p_appts[:3]) if p_appts else "No recent appointments"

        context = (
            f"ID: {p['id']}\n"
            f"Name: {p['name']}\n"
            f"Age: {p.get('age', '?')}, Gender: {p.get('gender', '?')}\n"
            f"Conditions: {safe_list_to_string(p.get('conditions'))}\n"
            f"Meds: {safe_list_to_string(p.get('medications'))}\n"
            f"Allergies: {safe_list_to_string(p.get('allergies'))}\n"
            f"Recent Appts: {recent_appts}\n"
            f"Last Visit: {last_visit[:200]}...\n"
            f"Documents: {doc_titles}\n"
            "---"
        )
        patient_summaries.append(context)

    full_context_str = "\n".join(patient_summaries)

    # 2. Step 1: Identify Candidates
    prompt = SEARCH_CANDIDATES_PROMPT.format(
        query=query,
        patient_summaries=full_context_str
    )
    
    # Use async generation
    response_text = await generate_ai_response_async(prompt, max_tokens=500)
    
    try:
        # cleanup json
        text = response_text.replace("```json", "").replace("```", "").strip()
        start = text.find("[")
        end = text.rfind("]") + 1
        candidate_ids = json.loads(text[start:end])
    except:
        # Fallback: exact name match if AI fails
        candidate_ids = [p["id"] for p in all_patients if query.lower() in p["name"].lower()]

    results = []
    
    # 3. Step 2: Generate Relevance Reason
    import asyncio
    
    async def get_reason(pid):
        if pid not in patient_map:
            return None
        
        p = patient_map[pid]
        
        # Get recent appointments for this specific patient
        p_appts = appt_map.get(pid, [])
        recent_appts_str = " | ".join(p_appts[:5])

        # Rebuild context for specific patient (can be more detailed here)
        p_context = (
            f"Name: {p['name']}, Conditions: {p.get('conditions')}, "
            f"Meds: {p.get('medications')}, Notes: {p.get('vitals')}, "
            f"Appointments: {recent_appts_str}"
        )
        
        reason_prompt = SEARCH_REASONING_PROMPT.format(
            patient_context=p_context,
            query=query
        )
        
        reason = await generate_ai_response_async(reason_prompt, max_tokens=50)
        return {
            "patient_id": pid,
            "patient_name": p["name"],
            "matched_snippets": [reason.strip().replace('"', '')]
        }

    tasks = [get_reason(pid) for pid in candidate_ids if pid in patient_map]
    if tasks:
        results = await asyncio.gather(*tasks)
        results = [r for r in results if r]  # Filter None
    
    if not results and not candidate_ids:
         # If AI found nothing, try legacy exact match for safety
         for p in all_patients:
            if query.lower() in p["name"].lower():
                results.append({
                    "patient_id": p["id"],
                    "patient_name": p["name"],
                    "matched_snippets": ["Name match"]
                })

    return {"results": results}


# --- Routes: Appointments ---


@app.get("/appointments")
def list_appointments(current_user: auth.User = Depends(auth.get_current_user)):
    """List all appointments, scoped to clinic."""
    appointments = get_all_appointments(clinic_id=current_user.clinic_id)
    return {"appointments": appointments}


@app.get("/appointments/today")
def list_todays_appointments(current_user: auth.User = Depends(auth.get_current_user)):
    """List today's appointments, scoped to clinic."""
    appointments = get_todays_appointments(clinic_id=current_user.clinic_id)
    return {"appointments": appointments}


@app.post("/appointments")
def create_new_appointment(req: AppointmentRequest, current_user: auth.User = Depends(auth.get_current_user)):
    """Create a new appointment."""
    patient = get_patient(req.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Check patient access
    if patient.get("clinic_id") and patient.get("clinic_id") != current_user.clinic_id:
        raise HTTPException(status_code=403, detail="Access denied to this patient")
    
    appointment_id = f"a-{uuid.uuid4().hex[:8]}"
    appointment = create_appointment({
        "id": appointment_id,
        "patient_id": req.patient_id,
        "start_time": req.start_time,
        "status": req.status,
        "reason": req.reason,
    }, clinic_id=current_user.clinic_id)
    return {"appointment": appointment}
    
@app.post("/appointments/mark-seen")
def mark_patient_seen(req: MarkSeenRequest, current_user: auth.User = Depends(auth.get_current_user)):
    """Mark an appointment as seen/completed."""
    # Ideally check appointment ownership here
    updated = update_appointment(req.appointment_id, {"status": "completed"})
    if not updated:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"success": True, "appointment": updated}


@app.get("/appointment/{appointment_id}")
def get_appointment_page_data(appointment_id: str):
    """Get full appointment details for the appointment page view.
    Includes patient info, vitals, AI intake summary, differential diagnosis, etc.
    """
    appointment = get_appointment_with_details(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    patient = appointment.get("patients")
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found for appointment")
    
    patient_id = patient["id"]
    
    # Get appointment-specific AI data, falling back to patient-level if not found
    ai_intake = get_ai_intake_summary_for_appointment(appointment_id)
    if not ai_intake:
        ai_intake = get_ai_intake_summary(patient_id)
    
    differential = get_differential_diagnosis_for_appointment(appointment_id)
    if not differential:
        differential = get_differential_diagnosis(patient_id)
    
    # Map DB field names to frontend-friendly names
    differential_mapped = [
        {
            "condition": d.get("condition_name", d.get("condition", "")),
            "match_pct": d.get("match_pct", 0),
            "reasoning": d.get("rationale", d.get("reasoning", "")),
        }
        for d in (differential or [])
    ]
    
    # Get additional data
    documents = get_documents_for_patient(patient_id)
    clinical_dumps = get_clinical_dumps_for_appointment(appointment_id)
    report_insights = get_report_insights(patient_id)
    
    # Determine if this is an archived (completed) appointment
    is_archived = appointment.get("status") == "completed"
    
    # Remove nested patients object and return flat structure
    appointment_flat = {k: v for k, v in appointment.items() if k != "patients"}
    
    return {
        "appointment": appointment_flat,
        "patient": patient,
        "ai_intake_summary": ai_intake,
        "differential_diagnosis": differential_mapped,
        "documents": documents or [],
        "clinical_dumps": clinical_dumps or [],
        "report_insights": report_insights,
        "is_archived": is_archived,
    }


@app.post("/appointment/{appointment_id}/start")
def start_appointment(appointment_id: str):
    """Set appointment status to in-progress."""
    appointment = get_appointment_with_details(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    updated = update_appointment(appointment_id, {"status": "in-progress"})
    return {"success": True, "appointment": updated}


@app.post("/appointment/{appointment_id}/complete")
def complete_appointment(appointment_id: str):
    """Mark appointment as completed."""
    appointment = get_appointment_with_details(appointment_id)
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    updated = update_appointment(appointment_id, {"status": "completed"})
    return {"success": True, "appointment": updated}

# --- Helpers: Consult ---


def _parse_consult_insights(raw_response: str, transcript_text: str) -> dict:
    """Parse LLM JSON response into consult insights, with fallback."""
    try:
        json_str = raw_response
        if "```json" in raw_response:
            json_str = raw_response.split("```json")[1].split("```")[0]
        elif "```" in raw_response:
            json_str = raw_response.split("```")[1].split("```")[0]
        return json.loads(json_str)
    except (json.JSONDecodeError, IndexError):
        return {
            "clean_transcript": transcript_text,
            "soap": {
                "subjective": "See transcript",
                "objective": "See transcript",
                "assessment": "Pending review",
                "plan": "Pending review",
            },
            "extracted_facts": {
                "symptoms": [],
                "duration": "See transcript",
                "medications_discussed": [],
                "allergies_mentioned": [],
            },
            "follow_up_questions": ["Unable to parse AI response. Please review transcript manually."],
            "differential_suggestions": [],
            "disclaimer": "These are AI-generated suggestions for reference only. Clinical judgment is required.",
            "raw_response": raw_response,
        }


# --- Routes: Consult Sessions ---


@app.post("/consult/start")
def start_consult(req: ConsultStartRequest):
    """Create a new consult session."""
    patient = get_patient(req.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    session_id = f"cs-{uuid.uuid4().hex[:8]}"
    session = create_consult_session({
        "id": session_id,
        "patient_id": req.patient_id,
        "started_at": datetime.now().isoformat(),
    })
    return {"consult_session_id": session_id}


@app.post("/consult/{session_id}/stop")
def stop_consult(session_id: str, req: ConsultStopRequest):
    """Stop consult session, analyze transcript with AI."""
    session = get_consult_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Consult session not found")

    patient = get_patient(session["patient_id"])
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    vitals = patient.get("vitals", {})

    # Build prompt
    prompt = CONSULT_ANALYSIS_PROMPT.format(
        patient_name=patient["name"],
        patient_age=patient.get("age", "Unknown"),
        patient_gender=patient.get("gender", "Unknown"),
        conditions=safe_list_to_string(patient.get("conditions")),
        medications=safe_list_to_string(patient.get("medications")),
        allergies=safe_list_to_string(patient.get("allergies")),
        vitals=f"BP {vitals.get('bp_systolic', 'N/A')}/{vitals.get('bp_diastolic', 'N/A')}, SpO2 {vitals.get('spo2', 'N/A')}%, HR {vitals.get('heart_rate', 'N/A')}, Temp {vitals.get('temperature_f', 'N/A')}°F",
        transcript=req.transcript_text,
    )

    raw_response = generate_ai_response(prompt, max_tokens=2000)
    insights = _parse_consult_insights(raw_response, req.transcript_text)

    # Update session
    update_consult_session(session_id, {
        "ended_at": datetime.now().isoformat(),
        "transcript_text": req.transcript_text,
        "soap_note": insights.get("soap"),
        "insights_json": insights,
    })

    return {
        "session_id": session_id,
        "transcript": insights.get("clean_transcript", req.transcript_text),
        "soap": insights.get("soap"),
        "insights": insights,
    }


@app.post("/consult/{session_id}/transcribe")
async def transcribe_consult(session_id: str, file: UploadFile = File(...)):
    """Transcribe an audio recording and generate SOAP note for a consult session."""
    session = get_consult_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Consult session not found")

    patient = get_patient(session["patient_id"])
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Read audio bytes
    audio_bytes = await file.read()
    filename = file.filename or "recording.webm"

    # Step 1: Transcribe audio
    import asyncio
    transcript_text = await asyncio.to_thread(transcribe_audio, audio_bytes, filename)

    # Step 2: Analyze transcript with LLM
    vitals = patient.get("vitals", {})
    prompt = CONSULT_ANALYSIS_PROMPT.format(
        patient_name=patient["name"],
        patient_age=patient.get("age", "Unknown"),
        patient_gender=patient.get("gender", "Unknown"),
        conditions=safe_list_to_string(patient.get("conditions")),
        medications=safe_list_to_string(patient.get("medications")),
        allergies=safe_list_to_string(patient.get("allergies")),
        vitals=f"BP {vitals.get('bp_systolic', 'N/A')}/{vitals.get('bp_diastolic', 'N/A')}, SpO2 {vitals.get('spo2', 'N/A')}%, HR {vitals.get('heart_rate', 'N/A')}, Temp {vitals.get('temperature_f', 'N/A')}°F",
        transcript=transcript_text,
    )

    raw_response = await generate_ai_response_async(prompt, max_tokens=2000)
    insights = _parse_consult_insights(raw_response, transcript_text)

    # Step 3: Persist results
    update_consult_session(session_id, {
        "ended_at": datetime.now().isoformat(),
        "transcript_text": transcript_text,
        "soap_note": insights.get("soap"),
        "insights_json": insights,
    })

    return {
        "session_id": session_id,
        "transcript": insights.get("clean_transcript", transcript_text),
        "soap": insights.get("soap"),
        "insights": insights,
    }


# --- Routes: Consult Live Transcription ---


@app.websocket("/ws/consult-transcribe/{session_id}")
async def consult_transcribe_websocket(websocket: WebSocket, session_id: str):
    """WebSocket for live consult transcription via Gemini.
    Binary messages = audio PCM, Text messages = JSON control events.
    """
    logger.info("[WS-Transcribe] ======== NEW CONNECTION ========")
    logger.info("[WS-Transcribe] Session ID: %s", session_id)

    await websocket.accept()
    logger.info("[WS-Transcribe] ✓ WebSocket connection accepted")

    # Validate session
    logger.debug("[WS-Transcribe] Validating session...")
    session = get_consult_session(session_id)
    if not session:
        logger.error("[WS-Transcribe] ✗ Session not found: %s", session_id)
        await websocket.send_json({"type": "error", "error": "Consult session not found"})
        await websocket.close()
        return

    patient_id = session["patient_id"]
    logger.info("[WS-Transcribe] ✓ Session validated, patient_id: %s", patient_id)

    # Create clinical dump record
    dump_id = f"cd-{uuid.uuid4().hex[:8]}"
    logger.debug("[WS-Transcribe] Creating clinical dump: %s", dump_id)
    create_clinical_dump({
        "id": dump_id,
        "patient_id": patient_id,
        "consult_session_id": session_id,
    })

    await websocket.send_json({"type": "session_info", "dump_id": dump_id})
    logger.info("[WS-Transcribe] ✓ Session info sent to client")

    audio_input_queue = asyncio.Queue()
    accumulated_transcript = []

    logger.info("[WS-Transcribe] Creating ConsultTranscriber...")
    logger.debug("[WS-Transcribe] Config: model=%s, api_key=%s, project=%s",
                 GEMINI_LIVE_MODEL, "***" if GOOGLE_API_KEY else None, GCP_PROJECT_ID)

    transcriber = ConsultTranscriber(
        project_id=GCP_PROJECT_ID,
        location=GCP_LOCATION,
        model=GEMINI_LIVE_MODEL,
        input_sample_rate=16000,
        api_key=GOOGLE_API_KEY,
    )
    logger.info("[WS-Transcribe] ✓ ConsultTranscriber created")

    stop_event = asyncio.Event()

    async def receive_from_client():
        try:
            logger.debug("[WS-Transcribe] receive_from_client: Starting")
            while not stop_event.is_set():
                message = await websocket.receive()
                if message.get("bytes"):
                    bytes_len = len(message["bytes"])
                    logger.debug("[WS-Transcribe] Received %d bytes of audio", bytes_len)
                    await audio_input_queue.put(message["bytes"])
                elif message.get("text"):
                    try:
                        data = json.loads(message["text"])
                        logger.debug("[WS-Transcribe] Received text message: %s", data.get("type"))
                        if data.get("type") == "stop":
                            logger.info("[WS-Transcribe] Stop signal received")
                            stop_event.set()
                            await audio_input_queue.put(None)  # Sentinel
                        elif data.get("type") == "manual_note":
                            note_text = data.get("text", "")
                            if note_text:
                                logger.debug("[WS-Transcribe] Manual note: %s", note_text[:50])
                                accumulated_transcript.append(f"[Note: {note_text}]")
                                await websocket.send_json({
                                    "type": "manual_note_ack",
                                    "text": note_text,
                                })
                    except json.JSONDecodeError as e:
                        logger.warning("[WS-Transcribe] JSON decode error: %s", e)
        except WebSocketDisconnect:
            logger.info("[WS-Transcribe] Client disconnected")
            stop_event.set()
            await audio_input_queue.put(None)
        except Exception as e:
            logger.error("[WS-Transcribe] Receive error: %s", e, exc_info=True)
            stop_event.set()

    logger.debug("[WS-Transcribe] Creating receive_from_client task")
    receive_task = asyncio.create_task(receive_from_client())

    logger.info("[WS-Transcribe] Starting Gemini transcription session...")
    try:
        async for event in transcriber.start_session(audio_input_queue=audio_input_queue):
            logger.debug("[WS-Transcribe] Received event from transcriber: %s",
                        event.get("type") if isinstance(event, dict) else event)
            if event and event.get("type") == "transcript":
                logger.info("[WS-Transcribe] ✓ Transcript: %s", event["text"])
                accumulated_transcript.append(event["text"])
                await websocket.send_json(event)
            elif event and event.get("type") == "error":
                logger.error("[WS-Transcribe] ✗ Error event: %s", event.get("error"))
                await websocket.send_json(event)
                break
    except WebSocketDisconnect:
        logger.info("[WS-Transcribe] Client disconnected during transcription")
    except Exception as e:
        logger.error("[WS-Transcribe] Transcription error: %s", e)
        logger.error(traceback.format_exc())

        # Classify error and send user-friendly message to client
        err_str = str(e).lower()
        if "api key" in err_str or "authenticate" in err_str or "permission" in err_str or "403" in err_str:
            user_msg = "Authentication failed. Please check your GOOGLE_API_KEY or set up GCP credentials."
        elif "not found" in err_str or "404" in err_str or "model" in err_str:
            user_msg = f"Model not found: {GEMINI_LIVE_MODEL}. This model may require Vertex AI access."
        elif "quota" in err_str or "rate" in err_str or "429" in err_str:
            user_msg = "API quota exceeded. Please try again later."
        elif "connect" in err_str or "timeout" in err_str or "network" in err_str:
            user_msg = "Network error connecting to Gemini API."
        else:
            user_msg = f"Transcription error: {e}"

        try:
            await websocket.send_json({"type": "error", "error": user_msg})
        except Exception:
            pass
    finally:
        receive_task.cancel()

        # Persist accumulated transcript
        full_transcript = " ".join(accumulated_transcript)
        if full_transcript.strip():
            update_clinical_dump(dump_id, {
                "transcript_text": full_transcript,
                "updated_at": datetime.now().isoformat(),
            })
            update_consult_session(session_id, {
                "transcript_text": full_transcript,
            })

        try:
            await websocket.close()
        except Exception:
            pass
        logger.info("[WS-Transcribe] Handler finished for session %s", session_id)


@app.post("/consult/{session_id}/save-dump")
async def save_consult_dump(session_id: str, req: SaveDumpRequest):
    """Save and optionally analyze a clinical dump (transcript + manual notes)."""
    session = get_consult_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Consult session not found")

    dump = get_clinical_dump(req.dump_id)
    if not dump:
        raise HTTPException(status_code=404, detail="Clinical dump not found")

    patient_id = session["patient_id"]
    transcript_text = dump.get("transcript_text", "") or ""
    manual_notes = req.manual_notes or ""

    # Build combined dump
    parts = []
    if transcript_text.strip():
        parts.append(f"[Transcript]\n{transcript_text}")
    if manual_notes.strip():
        parts.append(f"[Manual Notes]\n{manual_notes}")
    combined_dump = "\n\n".join(parts)

    # Update the dump record
    dump_updates = {
        "manual_notes": manual_notes,
        "combined_dump": combined_dump,
        "updated_at": datetime.now().isoformat(),
    }
    if req.appointment_id:
        dump_updates["appointment_id"] = req.appointment_id

    update_clinical_dump(req.dump_id, dump_updates)

    result = {"dump_id": req.dump_id, "combined_dump": combined_dump}

    # Optionally analyze
    if req.analyze and combined_dump.strip():
        patient = get_patient(patient_id)
        if patient:
            vitals = patient.get("vitals", {})
            prompt = CONSULT_ANALYSIS_PROMPT.format(
                patient_name=patient["name"],
                patient_age=patient.get("age", "Unknown"),
                patient_gender=patient.get("gender", "Unknown"),
                conditions=safe_list_to_string(patient.get("conditions")),
                medications=safe_list_to_string(patient.get("medications")),
                allergies=safe_list_to_string(patient.get("allergies")),
                vitals=f"BP {vitals.get('bp_systolic', 'N/A')}/{vitals.get('bp_diastolic', 'N/A')}, SpO2 {vitals.get('spo2', 'N/A')}%, HR {vitals.get('heart_rate', 'N/A')}, Temp {vitals.get('temperature_f', 'N/A')}°F",
                transcript=combined_dump,
            )
            raw_response = await generate_ai_response_async(prompt, max_tokens=2000)
            insights = _parse_consult_insights(raw_response, combined_dump)

            update_consult_session(session_id, {
                "ended_at": datetime.now().isoformat(),
                "transcript_text": combined_dump,
                "soap_note": insights.get("soap"),
                "insights_json": insights,
            })
            result["insights"] = insights

    return result


@app.get("/clinical-dumps/{patient_id}")
def list_clinical_dumps(patient_id: str):
    """Get all clinical dumps for a patient."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    dumps = get_clinical_dumps_for_patient(patient_id)
    return {"clinical_dumps": dumps}


# --- Routes: Chat ---


@app.post("/chat")
def chat(req: ChatRequest):
    """Patient Q&A chat with AI."""
    ctx = build_patient_context(req.patient_id)
    patient = ctx["patient"]
    vitals = patient.get("vitals", {})

    # Build document summaries
    doc_texts = "\n\n".join(
        f"--- {d['title']} ({d.get('doc_type', 'document')}) ---\n{d.get('extracted_text', '')}"
        for d in ctx["documents"]
    ) or "No documents on file."

    # Build visit summaries
    visit_texts = "\n\n".join(
        f"--- Visit {v.get('visit_time', 'Unknown date')} ---\n{v.get('summary_ai', v.get('doctor_notes_text', ''))}"
        for v in ctx["visits"]
    ) or "No previous visits."

    # Build consult summaries (include transcripts and extracted facts)
    consult_parts = []
    for c in ctx["consults"]:
        lines = [f"--- Consult {c.get('started_at', 'Unknown')} ---"]
        if c.get("transcript_text"):
            lines.append(f"Transcript: {c['transcript_text'][:1000]}")
        if c.get("soap_note"):
            lines.append(f"SOAP: {json.dumps(c['soap_note'])}")
        if c.get("insights_json") and isinstance(c["insights_json"], dict):
            facts = c["insights_json"].get("extracted_facts", {})
            if facts:
                lines.append(f"Extracted facts: {json.dumps(facts)}")
        consult_parts.append("\n".join(lines))
    consult_texts = "\n\n".join(consult_parts) if consult_parts else "No recent consult sessions."

    # Build clinical dump summaries
    dump_parts = []
    for d in ctx.get("clinical_dumps", []):
        text = d.get("combined_dump") or d.get("transcript_text") or ""
        if text:
            dump_parts.append(f"--- Dump {d.get('created_at', 'Unknown')} ---\n{text[:1000]}")
    dump_texts = "\n\n".join(dump_parts) if dump_parts else "No clinical dumps."

    system_prompt = PATIENT_QA_PROMPT.format(
        patient_name=patient["name"],
        patient_age=patient.get("age", "Unknown"),
        patient_gender=patient.get("gender", "Unknown"),
        height_cm=patient.get("height_cm", "N/A"),
        weight_kg=patient.get("weight_kg", "N/A"),
        conditions=safe_list_to_string(patient.get("conditions")),
        medications=safe_list_to_string(patient.get("medications")),
        allergies=safe_list_to_string(patient.get("allergies")),
        bp=f"{vitals.get('bp_systolic', 'N/A')}/{vitals.get('bp_diastolic', 'N/A')}",
        spo2=vitals.get("spo2", "N/A"),
        hr=vitals.get("heart_rate", "N/A"),
        temp=vitals.get("temperature_f", "N/A"),
        documents=doc_texts,
        visits=visit_texts,
        consults=consult_texts,
        clinical_dumps=dump_texts,
    )

    # Build conversation history
    conversation = system_prompt + "\n\n"
    for msg in req.history:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "user":
            conversation += f"Doctor: {content}\n"
        else:
            conversation += f"Assistant: {content}\n"
    conversation += f"Doctor: {req.message}\nAssistant:"

    reply = generate_ai_response(conversation, max_tokens=500)
    
    return {"reply": reply}


@app.get("/ai/chat-suggestions/{patient_id}")
async def generate_chat_suggestions(patient_id: str):
    """Generate 3 contextual questions that a doctor would likely want to ask about this patient."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Get latest AI summary info if available
    ai_intake = get_ai_intake_summary(patient_id)
    # Get chief complaint or fallback
    if ai_intake and ai_intake.get("chief_complaint"):
        chief_complaint = ai_intake.get("chief_complaint")
    else:
        # Fallback to appointment reason
        appointments = get_appointments_for_patient(patient_id)
        if appointments:
            chief_complaint = appointments[0].get("reason", "General checkup")
        else:
            chief_complaint = "General checkup"

    findings = ai_intake.get("findings", []) if ai_intake else []
    findings_str = ", ".join(findings) if isinstance(findings, list) else str(findings)

    vitals = patient.get("vitals", {})

    # Construct the prompt
    prompt = CHAT_SUGGESTIONS_PROMPT.format(
        patient_name=patient["name"],
        patient_age=patient.get("age", "?"),
        patient_gender=patient.get("gender", "?"),
        conditions=safe_list_to_string(patient.get("conditions")),
        medications=safe_list_to_string(patient.get("medications")),
        allergies=safe_list_to_string(patient.get("allergies")),
        bp=f"{vitals.get('bp_systolic', 'N/A')}/{vitals.get('bp_diastolic', 'N/A')}",
        spo2=vitals.get("spo2", "N/A"),
        hr=vitals.get("heart_rate", "N/A"),
        temp=vitals.get("temperature_f", "N/A"),
        chief_complaint=chief_complaint,
        findings=findings_str
    )

    # Generate the response
    raw_response = await generate_ai_response_async(prompt, max_tokens=250)
    
    # Parse line-separated suggestions
    suggestions = []
    try:
        # Split by newlines and clean up
        lines = [line.strip() for line in raw_response.split('\n') if line.strip()]
        # Remove any potential numbering (e.g., "1. Question")
        import re
        suggestions = [re.sub(r'^\d+[\.\)\-]\s*', '', line) for line in lines]
        # Filter out empty strings
        suggestions = [s for s in suggestions if s]
    except Exception:
        pass
    
    # Fallback if AI fails or returns malformed data
    if not suggestions:
        suggestions = [
            "Are there any drug interactions?",
            "Summarize the recent findings",
            "What is the recommended treatment plan?"
        ]
        
    return {"suggestions": suggestions[:3]}


# --- Routes: AI Summary Generation (SSE Streaming) ---


@app.get("/ai/generate-summary/{patient_id}")
async def generate_ai_summary_stream(patient_id: str):
    """Generate AI intake summary with real-time progress logs via SSE."""
    
    async def event_stream() -> AsyncGenerator[str, None]:
        import asyncio
        
        def emit(event_type: str, message: str, data: dict = None):
            event = {"type": event_type, "message": message, "timestamp": datetime.now().isoformat()}
            if data:
                event["data"] = data
            return f"data: {json.dumps(event)}\n\n"
        
        try:
            # Step 1: Validate patient
            yield emit("info", f"🔍 Fetching patient {patient_id}...")
            await asyncio.sleep(0.1)
            
            patient = get_patient(patient_id)
            if not patient:
                yield emit("error", f"❌ Patient {patient_id} not found")
                return
            
            yield emit("success", f"✓ Found patient: {patient['name']}")
            await asyncio.sleep(0.1)
            
            # Step 2: Fetch visits
            yield emit("info", "📋 Loading visit history...")
            visits = get_visits_for_patient(patient_id)
            yield emit("success", f"✓ Found {len(visits)} previous visits")
            
            # Step 3: Fetch documents
            yield emit("info", "📄 Loading patient documents...")
            documents = get_documents_for_patient(patient_id)
            yield emit("success", f"✓ Found {len(documents)} documents")
            
            # Step 4: Get appointments to find reason
            yield emit("info", "📅 Checking appointment reason...")
            appointments = get_appointments_for_patient(patient_id)
            scheduled = [a for a in appointments if a.get("status") == "scheduled"]
            appointment_reason = scheduled[0].get("reason", "General consultation") if scheduled else "Follow-up visit"
            yield emit("success", f"✓ Appointment reason: {appointment_reason}")
            
            # Step 5: Build prompt context
            yield emit("info", "🔧 Building AI prompt context...")
            
            patient_profile = json.dumps({
                "name": patient["name"],
                "age": patient.get("age", "Unknown"),
                "gender": patient.get("gender", "Unknown"),
                "conditions": patient.get("conditions", []),
                "medications": patient.get("medications", []),
                "allergies": patient.get("allergies", []),
                "vitals": patient.get("vitals", {}),
            }, indent=2)
            
            doc_texts = "\n".join(
                f"- {d['title']} ({d.get('doc_type', 'document')}): {d.get('extracted_text', '')[:500]}"
                for d in documents
            ) or "No documents available."
            
            visit_texts = "\n".join(
                f"- {v.get('visit_time', 'Unknown')}: {v.get('summary_ai', v.get('doctor_notes_text', ''))}"
                for v in visits[:5]  # Last 5 visits
            ) or "No previous visits."

            # Fetch consult transcripts for richer context
            consults = get_consults_for_patient(patient_id)
            consult_parts = []
            for c in consults[:5]:
                parts = [f"- Consult {c.get('started_at', 'Unknown')}:"]
                if c.get("transcript_text"):
                    parts.append(f"  Transcript excerpt: {c['transcript_text'][:500]}")
                if c.get("soap_note"):
                    parts.append(f"  SOAP: {json.dumps(c['soap_note'])[:300]}")
                if c.get("insights_json") and isinstance(c["insights_json"], dict):
                    facts = c["insights_json"].get("extracted_facts", {})
                    if facts:
                        parts.append(f"  Extracted facts: {json.dumps(facts)[:300]}")
                consult_parts.append("\n".join(parts))
            consult_texts = "\n".join(consult_parts) or "No past consult transcripts."

            # Fetch clinical dumps for richer context
            clinical_dumps = get_clinical_dumps_for_patient(patient_id)
            dump_parts = []
            for d in clinical_dumps[:5]:
                text = d.get("combined_dump") or d.get("transcript_text") or ""
                if text:
                    dump_parts.append(f"- Dump {d.get('created_at', 'Unknown')}: {text[:500]}")
            dump_texts = "\n".join(dump_parts) or "No clinical dumps."

            full_context = f"""
**Patient Profile:**
{patient_profile}

**Documents:**
{doc_texts}

**Recent Visits:**
{visit_texts}

**Past Consult Transcripts:**
{consult_texts}

**Clinical Dumps (Raw transcripts & notes):**
{dump_texts}
"""
            
            yield emit("success", "✓ Context prepared")
            
            # Step 7: Granular generation
            yield emit("info", "🚀 Starting AI Analysis...")
            
            # 7a. Chief Complaint
            yield emit("ai_request", "Analyzing Chief Complaint...")
            cc_prompt = SUMMARY_CHIEF_COMPLAINT_PROMPT.format(reason=appointment_reason, patient_context=full_context)
            chief_complaint = await generate_ai_response_async(cc_prompt, max_tokens=100)
            chief_complaint = chief_complaint.strip()
            yield emit("success", "✓ Chief Complaint identified", {"chief_complaint": chief_complaint})
            
            # 7b. Parallel execution of other fields
            yield emit("ai_request", "Analyzing details (Onset, Severity, Findings, Context)...")
            
            onset_prompt = SUMMARY_ONSET_PROMPT.format(chief_complaint=chief_complaint, patient_context=full_context)
            severity_prompt = SUMMARY_SEVERITY_PROMPT.format(chief_complaint=chief_complaint, patient_context=full_context)
            findings_prompt = SUMMARY_FINDINGS_PROMPT.format(chief_complaint=chief_complaint, patient_context=full_context)
            context_prompt = SUMMARY_CONTEXT_PROMPT.format(chief_complaint=chief_complaint, patient_context=full_context)
            
            # Launch parallel tasks
            onset_task = generate_ai_response_async(onset_prompt, max_tokens=50)
            severity_task = generate_ai_response_async(severity_prompt, max_tokens=50)
            findings_task = generate_ai_response_async(findings_prompt, max_tokens=300)
            context_task = generate_ai_response_async(context_prompt, max_tokens=400)
            
            onset, severity, findings_raw, context = await asyncio.gather(onset_task, severity_task, findings_task, context_task)
            
            # Parse findings (JSON list)
            try:
                # simple cleanup for json
                findings_str = findings_raw.replace("```json", "").replace("```", "").strip()
                findings_start = findings_str.find("[")
                findings_end = findings_str.rfind("]") + 1
                if findings_start != -1 and findings_end != -1:
                    findings_str = findings_str[findings_start:findings_end]
                    findings = json.loads(findings_str)
                else:
                    findings = [findings_raw]
                
                if not isinstance(findings, list):
                    findings = [str(findings)]
            except Exception as e:
                findings = [findings_raw] # Fallback
            
            yield emit("success", "✓ All sections analyzed")

            # Step 8: Save to database
            yield emit("info", "💾 Saving to database...")
            
            summary_id = str(uuid.uuid4())
            summary_data = {
                "id": summary_id,
                "patient_id": patient_id,
                "chief_complaint": chief_complaint.replace('"', '').strip(),
                "onset": onset.replace('"', '').strip(),
                "severity": severity.replace('"', '').strip(),
                "findings": findings,
                "context": context.replace('"', '').strip(),
                "created_at": datetime.now().isoformat(),
            }
            
            try:
                create_ai_intake_summary(summary_data)
                yield emit("success", f"✓ Summary saved with ID: {summary_id}")
            except Exception as db_err:
                yield emit("warning", f"⚠ Database save failed: {str(db_err)}")
            
            # Step 9: Complete
            yield emit("complete", "🎉 AI Summary generation complete!", {"summary": summary_data})
            
        except Exception as e:
            yield emit("error", f"❌ Unexpected error: {str(e)}")
    
    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
        }
    )



# --- Routes: Differential Diagnosis ---


@app.post("/ai/generate-differential/{patient_id}")
async def generate_differential_diagnosis(patient_id: str, appointment_id: str | None = None):
    """Generate differential diagnosis using 2-step AI process (Candidates -> Scoring)."""
    import re as _re

    # 1. Fetch Patient Context
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    # Find latest Chief Complaint from AI Intake if available
    ai_intake = get_ai_intake_summary(patient_id)
    chief_complaint = ai_intake.get("chief_complaint", "Not recorded") if ai_intake else "Not recorded"

    # Or try to find from appointments
    if chief_complaint == "Not recorded":
        appointments = get_appointments_for_patient(patient_id)
        if appointments:
            chief_complaint = appointments[0].get("reason", "Not recorded")

    history = f"Conditions: {safe_list_to_string(patient.get('conditions'))}\nMedications: {safe_list_to_string(patient.get('medications'))}"
    findings = ai_intake.get("findings", []) if ai_intake else []
    findings_str = "\n".join(findings) if isinstance(findings, list) else str(findings)

    # Enrich findings with symptoms extracted from recent consults
    consults = get_consults_for_patient(patient_id)
    for c in consults[:3]:
        insights_json = c.get("insights_json")
        if isinstance(insights_json, dict):
            facts = insights_json.get("extracted_facts", {})
            symptoms = facts.get("symptoms", [])
            if symptoms:
                findings_str += "\nConsult-reported symptoms: " + safe_list_to_string(symptoms)
            duration = facts.get("duration", "")
            if duration:
                findings_str += f"\nDuration: {duration}"

    # Enrich findings with clinical dump content
    clinical_dumps = get_clinical_dumps_for_patient(patient_id)
    for d in clinical_dumps[:3]:
        text = d.get("combined_dump") or d.get("transcript_text") or ""
        if text:
            findings_str += f"\nClinical dump: {text[:300]}"

    logger.info("[Differential] Generating candidates for patient %s (appointment=%s)", patient_id, appointment_id)
    logger.debug("[Differential] Chief complaint: %s", chief_complaint)
    logger.debug("[Differential] Findings context: %s", findings_str[:200])

    # ── Step 1: Generate Candidates ──
    candidates_prompt = DIFFERENTIAL_CANDIDATES_PROMPT.format(
        patient_name=patient['name'],
        patient_age=patient.get('age', '?'),
        patient_gender=patient.get('gender', '?'),
        chief_complaint=chief_complaint,
        history=history,
        findings=findings_str
    )

    raw_candidates = await generate_ai_response_async(candidates_prompt, max_tokens=300)
    logger.debug("[Differential] Raw candidates response: %s", raw_candidates[:500])

    # Robust parsing: try JSON first, then regex-extract quoted strings
    candidate_list = []
    try:
        text = raw_candidates.replace("```json", "").replace("```", "").strip()
        bracket_start = text.find("[")
        bracket_end = text.rfind("]") + 1
        if bracket_start >= 0 and bracket_end > bracket_start:
            candidate_list = json.loads(text[bracket_start:bracket_end])
    except (json.JSONDecodeError, ValueError):
        pass

    if not candidate_list:
        # Fallback: extract quoted strings from the response
        candidate_list = _re.findall(r'"([^"]{3,60})"', raw_candidates)

    if not candidate_list:
        logger.warning("[Differential] Could not parse candidates, using context-based fallback")
        candidate_list = ["Condition requiring further evaluation"]

    # Limit to 5 candidates max
    candidate_list = candidate_list[:5]
    logger.info("[Differential] Parsed %d candidates: %s", len(candidate_list), candidate_list)

    # ── Step 2: Score Each Candidate ──
    async def score_condition(cond: str) -> dict:
        prompt = DIFFERENTIAL_SCORING_PROMPT.format(
            condition=cond,
            patient_name=patient['name'],
            patient_age=patient.get('age', '?'),
            patient_gender=patient.get('gender', '?'),
            chief_complaint=chief_complaint,
            history=history,
            findings=findings_str
        )
        resp = await generate_ai_response_async(prompt, max_tokens=250)
        logger.debug("[Differential] Score response for '%s': %s", cond, resp[:300])

        match_pct = 50
        reasoning = "Analysis pending."

        try:
            text = resp.replace("```json", "").replace("```", "").strip()
            brace_start = text.find("{")
            brace_end = text.rfind("}") + 1
            if brace_start >= 0 and brace_end > brace_start:
                data = json.loads(text[brace_start:brace_end])
                match_pct = int(data.get("match_pct", 50))
                reasoning = data.get("reasoning", reasoning)
        except (json.JSONDecodeError, ValueError, TypeError):
            # Regex fallback: extract match_pct number
            pct_match = _re.search(r'match[_ ]?pct["\s:]+\s*(\d+)', resp, _re.IGNORECASE)
            if pct_match:
                match_pct = int(pct_match.group(1))
            # Extract reasoning text
            reason_match = _re.search(r'reasoning["\s:]+\s*"([^"]+)"', resp, _re.IGNORECASE)
            if reason_match:
                reasoning = reason_match.group(1)

        # Clamp percentage
        match_pct = max(0, min(100, match_pct))

        return {
            "condition_name": cond,
            "match_pct": match_pct,
            "rationale": reasoning,
        }

    # Run scoring in parallel
    tasks = [score_condition(c) for c in candidate_list]
    scored_results = await asyncio.gather(*tasks)

    # Sort by match %
    scored_results = sorted(scored_results, key=lambda x: x["match_pct"], reverse=True)

    logger.info("[Differential] Final results: %s", [(r["condition_name"], r["match_pct"]) for r in scored_results])

    # ── Step 3: Save to DB ──
    save_differential_diagnoses(patient_id, list(scored_results), appointment_id=appointment_id)

    # Return with frontend-friendly field names
    frontend_data = [
        {
            "condition": r["condition_name"],
            "match_pct": r["match_pct"],
            "reasoning": r["rationale"],
        }
        for r in scored_results
    ]

    return {"status": "success", "data": frontend_data}


# --- Routes: Delete Patient / Appointment ---


@app.delete("/patients/{patient_id}")
def delete_patient_endpoint(patient_id: str):
    """Delete a patient and all their related data (appointments, documents, etc.)."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    success = delete_patient(patient_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete patient")
    
    return {"success": True, "message": f"Patient {patient.get('name', patient_id)} and all related data deleted"}


@app.delete("/appointments/{appointment_id}")
def delete_appointment_endpoint(appointment_id: str, retain: bool = False):
    """
    Delete an appointment.
    If retain=true, booking history is saved as a clinical dump in the patient file.
    If retain=false, all related data (clinical dumps, intake summaries, diagnoses) is purged.
    """
    from database import get_appointment_with_details
    appt = get_appointment_with_details(appointment_id)
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    if retain:
        success = delete_appointment_retain(appointment_id)
    else:
        success = delete_appointment_purge(appointment_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete appointment")
    
    return {
        "success": True,
        "retained": retain,
        "message": "Appointment deleted. Booking history retained in patient file." if retain else "Appointment and all related data deleted.",
    }


# --- Routes: Prescriptions ---


@app.post("/prescriptions")
def create_new_prescription(req: PrescriptionRequest):
    """Create a new prescription."""
    patient = get_patient(req.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    prescription = create_prescription({
        "patient_id": req.patient_id,
        "medications": req.medications,
        "diagnosis": req.diagnosis,
        "notes": req.notes,
    })
    return {"prescription": prescription}


@app.get("/prescriptions/{patient_id}")
def get_patient_prescriptions(patient_id: str):
    """Get prescriptions for a patient."""
    prescriptions = get_prescriptions_for_patient(patient_id)
    return {"prescriptions": prescriptions}


# --- Routes: Notes ---


@app.post("/notes")
def create_new_note(req: NoteRequest):
    """Create a manual note."""
    patient = get_patient(req.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    note = create_note({
        "patient_id": req.patient_id,
        "content": req.content,
        "note_type": req.note_type,
    })
    return {"note": note}


@app.get("/notes/{patient_id}")
def get_patient_notes(patient_id: str):
    """Get notes for a patient."""
    notes = get_notes_for_patient(patient_id)
    return {"notes": notes}


# --- Routes: Documents ---


@app.post("/documents/upload")
async def upload_document(
    patient_id: str,
    title: str,
    doc_type: str = "general",
    file: UploadFile = File(...)
):
    """Upload a document for a patient with OCR text extraction."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Read file content
    content = await file.read()
    extracted_text = ""
    content_type = file.content_type or ""
    filename = file.filename or ""
    
    # Limit text to 10000 characters for storage
    extracted_text = extract_text_from_bytes(content, filename, content_type)
    
    doc_id = f"d-{uuid.uuid4().hex[:8]}"
    document = create_document({
        "id": doc_id,
        "patient_id": patient_id,
        "title": title,
        "doc_type": doc_type,
        "extracted_text": extracted_text,
    })
    return {"document": document, "extracted_text_length": len(extracted_text)}


# --- Routes: Parchi Upload (OCR + AI Extraction + WhatsApp) ---


@app.post("/parchi/upload")
async def upload_parchi(file: UploadFile = File(...)):
    """
    Upload a photo of a handwritten appointment chit (parchi).
    Uses a SINGLE Gemini Vision call to do OCR + structured extraction together.
    Returns a list of extracted appointment entries for review.
    """
    from google import genai
    from google.genai import types as genai_types

    # 1. Read the uploaded image
    content = await file.read()
    content_type = file.content_type or "image/jpeg"
    filename = file.filename or "parchi.jpg"

    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Please upload an image file (JPG, PNG, etc.)")

    logger.info("[Parchi] Processing uploaded image: %s (%d bytes)", filename, len(content))

    # 2. Single Gemini Vision call — OCR + structured extraction in one shot
    #    Uses OAuth credentials from env vars (higher quota than AI Studio key)
    from google.oauth2.credentials import Credentials
    from google.auth.transport.requests import Request

    refresh_token = os.getenv("GOOGLE_OAUTH_REFRESH_TOKEN")
    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET")

    if not (refresh_token and client_id and client_secret):
        raise HTTPException(status_code=500, detail="OAuth env vars not configured. Set GOOGLE_OAUTH_REFRESH_TOKEN, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET in .env")

    creds = Credentials(
        token=None,
        refresh_token=refresh_token,
        client_id=client_id,
        client_secret=client_secret,
        token_uri="https://oauth2.googleapis.com/token",
    )

    try:
        creds.refresh(Request())
        logger.info("[Parchi] OAuth token refreshed successfully")
    except Exception as e:
        logger.error("[Parchi] Token refresh failed: %s", e)
        raise HTTPException(status_code=500, detail=f"OAuth token refresh failed: {e}. Check your GOOGLE_OAUTH_REFRESH_TOKEN.")

    today = datetime.now().strftime("%Y-%m-%d")

    extraction_prompt = (
        "You are looking at a photo of a handwritten appointment chit (called a 'parchi') "
        "from a doctor's clinic. It contains patient appointments with names, phone numbers, "
        "and appointment times.\n\n"
        "Read the handwriting carefully and extract ALL patient appointments.\n\n"
        "For each appointment, extract:\n"
        "- name: the patient's full name\n"
        "- phone: the phone number (assume +91 country code for India if not written)\n"
        f"- date: appointment date in YYYY-MM-DD format (use {today} if not specified)\n"
        "- time: appointment time in HH:MM 24-hour format (use 09:00 if not specified)\n\n"
        "Return ONLY a valid JSON array with no other text. Example:\n"
        '[{"name": "Ramesh Kumar", "phone": "+919876543210", "date": "2026-02-14", "time": "10:30"}]'
    )

    try:
        project_id = os.getenv("GCP_PROJECT_ID", "gen-lang-client-0151448461")
        location = os.getenv("GCP_LOCATION", "us-central1")

        # Use Vertex AI endpoint (uses Google Cloud billing/credits, higher quota)
        client = genai.Client(
            vertexai=True,
            project=project_id,
            location=location,
            credentials=creds,
        )
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                genai_types.Content(
                    role="user",
                    parts=[
                        genai_types.Part(
                            inline_data=genai_types.Blob(
                                data=content,
                                mime_type=content_type,
                            )
                        ),
                        genai_types.Part(text=extraction_prompt),
                    ]
                )
            ],
            config=genai_types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=2000,
            ),
        )

        ai_response = response.text.strip() if response.text else ""
        logger.info("[Parchi] Gemini Vision response: %s", ai_response[:500])

    except Exception as e:
        logger.error("[Parchi] Gemini Vision call failed: %s", e)
        raise HTTPException(status_code=500, detail=f"AI processing failed: {str(e)}")

    if not ai_response:
        raise HTTPException(status_code=422, detail="AI returned empty response for the image")

    # 3. Parse the JSON response
    entries = []
    try:
        cleaned = ai_response.replace("```json", "").replace("```", "").strip()
        bracket_start = cleaned.find("[")
        bracket_end = cleaned.rfind("]") + 1
        if bracket_start >= 0 and bracket_end > bracket_start:
            entries = json.loads(cleaned[bracket_start:bracket_end])
    except (json.JSONDecodeError, ValueError) as e:
        logger.error("[Parchi] Failed to parse AI response: %s", e)
        raise HTTPException(
            status_code=422,
            detail=f"Could not parse structured data from image. AI response: {ai_response[:300]}"
        )

    if not entries:
        raise HTTPException(
            status_code=422,
            detail=f"No appointments found in the image. AI response: {ai_response[:300]}"
        )

    # 4. Normalize entries
    normalized = []
    for entry in entries:
        date_str = entry.get("date", today)
        time_str = entry.get("time", "09:00")
        try:
            dt = datetime.strptime(f"{date_str}T{time_str}", "%Y-%m-%dT%H:%M")
            appointment_time = dt.isoformat()
        except ValueError:
            appointment_time = f"{date_str}T{time_str}:00"

        normalized.append({
            "name": entry.get("name", "Unknown"),
            "phone": entry.get("phone", ""),
            "appointment_time": appointment_time,
            "date": date_str,
            "time": time_str,
        })

    return {
        "success": True,
        "raw_text": ai_response,
        "entries": normalized,
        "count": len(normalized),
    }


@app.post("/parchi/process")
def process_parchi(req: ParchiProcessRequest, x_clinic_id: str = Header(None), x_doctor_id: str = Header(None)):
    """
    Process reviewed parchi entries:
    1. For each entry: check patient (by phone), create if new
    2. Create appointment (scoped to clinic + doctor)
    3. Create intake token (scoped to clinic + doctor)
    4. Send WhatsApp with intake link
    """
    results = []
    base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

    for entry in req.entries:
        entry_result = {
            "name": entry.name,
            "phone": entry.phone,
            "appointment_time": entry.appointment_time,
            "is_new_patient": False,
            "is_duplicate": False,
            "patient_id": None,
            "appointment_id": None,
            "intake_link": None,
            "whatsapp_sent": False,
            "whatsapp_error": None,
            "error": None,
        }

        try:
            # 1. Check if patient exists by phone — scoped to this clinic
            clean_phone = entry.phone.replace("+", "").replace(" ", "").replace("-", "")
            existing = find_patient_duplicate(phone=clean_phone, clinic_id=x_clinic_id)
            if not existing:
                # Also try with the original format
                existing = find_patient_duplicate(phone=entry.phone, clinic_id=x_clinic_id)

            if existing:
                pid = existing["id"]
                entry_result["is_new_patient"] = False
            else:
                # Create new patient
                entry_result["is_new_patient"] = True
                p_data = {
                    "id": f"p-{uuid.uuid4().hex[:8]}",
                    "name": entry.name,
                    "phone": entry.phone,
                }
                new_patient = create_patient(p_data, clinic_id=x_clinic_id)
                pid = new_patient["id"]

            entry_result["patient_id"] = pid

            # 2. Check for duplicate appointment — scoped to this clinic
            existing_appt = find_existing_appointment(pid, entry.appointment_time, clinic_id=x_clinic_id)
            if existing_appt:
                logger.info("[Parchi] Duplicate appointment found for %s at %s — skipping", entry.name, entry.appointment_time)
                entry_result["is_duplicate"] = True
                entry_result["appointment_id"] = existing_appt["id"]
                continue  # Skip creating appointment, token, and WhatsApp

            # 3. Create appointment — tagged with clinic + doctor
            appt_id = f"a-{uuid.uuid4().hex[:8]}"
            appt_data = {
                "id": appt_id,
                "patient_id": pid,
                "start_time": entry.appointment_time,
                "status": "scheduled",
                "reason": "Intake Pending",
            }
            create_appointment(appt_data, clinic_id=x_clinic_id, doctor_id=x_doctor_id)
            entry_result["appointment_id"] = appt_id

            # 4. Create intake token — tagged with clinic + doctor
            token_str = str(uuid.uuid4())
            token_data = {
                "token": token_str,
                "patient_id": pid,
                "appointment_id": appt_id,
                "phone": entry.phone,
            }
            create_intake_token(token_data, clinic_id=x_clinic_id, doctor_id=x_doctor_id)

            intake_link = f"{base_url}/intake/{token_str}"
            entry_result["intake_link"] = intake_link

            # 5. Format appointment time for display
            try:
                appt_dt = datetime.fromisoformat(entry.appointment_time)
                display_time = appt_dt.strftime("%B %d, %Y at %I:%M %p")
            except ValueError:
                display_time = entry.appointment_time

            # 6. Send WhatsApp
            wa_result = send_intake_whatsapp(
                phone=entry.phone,
                patient_name=entry.name,
                appointment_time=display_time,
                intake_link=intake_link,
            )
            entry_result["whatsapp_sent"] = wa_result.get("success", False)
            if not wa_result.get("success"):
                entry_result["whatsapp_error"] = wa_result.get("error", "Unknown error")

        except Exception as e:
            logger.error("[Parchi] Error processing entry %s: %s", entry.name, e)
            entry_result["error"] = str(e)

        results.append(entry_result)

    # Summary
    total = len(results)
    duplicates = sum(1 for r in results if r.get("is_duplicate"))
    successful = sum(1 for r in results if r["error"] is None and not r.get("is_duplicate"))
    whatsapp_sent = sum(1 for r in results if r["whatsapp_sent"])

    return {
        "success": True,
        "results": results,
        "summary": {
            "total": total,
            "processed": successful,
            "duplicates": duplicates,
            "whatsapp_sent": whatsapp_sent,
            "errors": total - successful - duplicates,
        },
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

# --- Routes: Intake Form ---

@app.post("/intake/check")
def check_patient_duplicate(req: IntakeCheckRequest, x_clinic_id: str = Header(None)):
    """Check if patient exists — scoped to the requesting clinic."""
    existing = find_patient_duplicate(email=req.email, phone=req.phone, name=req.name, clinic_id=x_clinic_id)
    if existing:
        return {"exists": True, "patient_id": existing["id"], "name": existing["name"]}
    return {"exists": False}


@app.post("/intake/verify-phone")
def verify_phone_token(req: IntakeVerifyRequest):
    """
    Verify phone.email token by fetching the user JSON from the provided URL.
    Returns the verified phone number and country code.
    """
    import urllib.request
    import json
    
    try:
        user_json_url = req.user_json_url
        if not user_json_url:
             raise HTTPException(status_code=400, detail="Missing user_json_url")

        # Read JSON data from the URL
        with urllib.request.urlopen(user_json_url) as url:
            data = json.loads(url.read().decode())
            
        user_country_code = data.get("user_country_code")
        user_phone_number = data.get("user_phone_number")
        
        # We can also get first/last name if needed, but we mostly care about the phone
        # user_first_name = data.get("user_first_name")
        # user_last_name = data.get("user_last_name")
        
        full_phone = f"{user_country_code}{user_phone_number}"
        
        # Check if this phone number exists in our DB
        existing = find_patient_duplicate(phone=full_phone)
        
        return {
            "success": True, 
            "phone": full_phone, 
            "country_code": user_country_code, 
            "number": user_phone_number,
            "existing_patient": existing
        }
        
    except Exception as e:
        logger.error(f"Phone verification failed: {e}")
        raise HTTPException(status_code=400, detail="Verification failed")



@app.post("/upload")
async def upload_file_endpoint(file: UploadFile = File(...)):
    """Upload file to storage."""
    try:
        content = await file.read()
        # Sanitize filename
        safe_filename = "".join(c for c in file.filename if c.isalnum() or c in "._-").strip()
        if not safe_filename:
            safe_filename = "unnamed_file"
            
        filename = f"{uuid.uuid4()}-{safe_filename}"
        
        # Determine content type
        content_type = file.content_type or "application/octet-stream"
        
        public_url = upload_file(content, filename, content_type)
        return {"url": public_url}
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        # Log stack trace for debugging
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/intake/submit")
def submit_intake(req: IntakeSubmitRequest, x_clinic_id: str = Header(None)):
    """Handle final intake submission — scoped to clinic."""
    try:
        patient_id = req.patient_id
        
        # 1. Create/Update Patient
        if not patient_id:
            # Calculate Age
            try:
                birth_date = datetime.strptime(req.dob, "%Y-%m-%d")
                today = datetime.now()
                age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            except:
                age = 0
                
            patient_data = {
                "name": req.name,
                "age": age,
                "gender": req.gender,
                "phone": req.phone,
                "email": req.email,
                "address": req.address,
                "height_cm": req.height_cm,
                "weight_kg": req.weight_kg,
                "conditions": req.conditions,
                "medications": req.medications,
                "allergies": req.allergies,
            }
            patient = create_patient(patient_data, clinic_id=x_clinic_id)
            patient_id = patient["id"]
        
        # 2. Create Appointment — scoped to clinic
        tomorrow = datetime.now() + timedelta(days=1)
        tomorrow_9am = tomorrow.replace(hour=9, minute=0, second=0, microsecond=0)
        
        appt_data = {
            "patient_id": patient_id,
            "start_time": tomorrow_9am.isoformat(),
            "reason": req.reason,
            "status": "scheduled"
        }
        appt = create_appointment(appt_data, clinic_id=x_clinic_id)
        
        # 3. Create Documents
        for doc in req.documents:
            doc_data = {
                "patient_id": patient_id,
                "title": doc.get("name", "Uploaded Document"),
                "doc_type": "patient_upload",
                "file_url": doc["url"],
                "extracted_text": "" # Pending OCR
            }
            if x_clinic_id:
                doc_data["clinic_id"] = x_clinic_id
            create_document(doc_data)
            
        # 4. Create Clinical Dump (Symptoms + History) — tagged with clinic
        dump_text = f"Patient Reported Symptoms:\n{req.symptoms}\n\nPatient Reported History:\n{req.history}"
        dump_data = {
            "id": f"dump-{uuid.uuid4()}",
            "patient_id": patient_id,
            "appointment_id": appt["id"],
            "manual_notes": dump_text,
            "combined_dump": dump_text
        }
        if x_clinic_id:
            dump_data["clinic_id"] = x_clinic_id
        create_clinical_dump(dump_data)
        
        return {"success": True, "patient_id": patient_id, "appointment_id": appt["id"]}
        
    except Exception as e:
        logger.error(f"Intake submission failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/patients/search-simple")
def simple_search_patients(q: str, x_clinic_id: str = Header(None)):
    """Simple search for patients by name or phone — scoped to clinic."""
    client = get_supabase()
    
    # Build query scoped to clinic
    base_query = client.table("patients").select("id, name, phone")
    if x_clinic_id:
        base_query = base_query.eq("clinic_id", x_clinic_id)
    res = base_query.or_(f"name.ilike.%{q}%,phone.ilike.%{q}%").execute()
    
    # De-duplicate by phone to avoid showing the same person multiple times
    seen_phones = set()
    unique_results = []
    for p in res.data:
        p_phone = p.get("phone")
        if p_phone not in seen_phones:
            unique_results.append({
                "patient_id": p["id"],
                "patient_name": p["name"],
                "phone": p_phone
            })
            seen_phones.add(p_phone)
    
    return {"results": unique_results}


# --- Routes: Intake Setup (Receptionist) & Public Intake ---

@app.post("/setup-intake/create")
def create_setup_intake(req: SetupIntakeRequest, x_clinic_id: str = Header(None), x_doctor_id: str = Header(None)):
    """
    Receptionist creates an intake request (token).
    1. Creates/Gets Patient — scoped to clinic.
    2. Creates Appointment — tagged with clinic + doctor.
    3. Creates Token — tagged with clinic + doctor.
    """
    # 1. Handle Patient
    is_new = False
    if req.patient_id:
        patient = get_patient(req.patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        # Security: verify patient belongs to this clinic
        if patient.get("clinic_id") and x_clinic_id and patient["clinic_id"] != x_clinic_id:
            raise HTTPException(status_code=403, detail="Patient does not belong to this clinic")
        pid = req.patient_id
    else:
        existing = find_patient_duplicate(phone=req.phone, clinic_id=x_clinic_id)
        if existing:
            pid = existing["id"]
        else:
            is_new = True
            try:
                p_data = {
                    "id": f"p-{uuid.uuid4().hex[:8]}",
                    "name": req.name,
                    "phone": req.phone
                }
                new_p = create_patient(p_data, clinic_id=x_clinic_id)
                pid = new_p["id"]
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to create patient: {e}")

    # 2. Check for Duplicate Appointment — scoped to clinic
    try:
        existing_appt = find_existing_appointment(pid, req.appointment_time, clinic_id=x_clinic_id)
            
        if existing_appt:
            # We already have an appointment. Let's see if there's a token for it.
            appt_id = existing_appt["id"]
            client = get_supabase()
            existing_token = client.table("intake_tokens") \
                .select("token") \
                .eq("appointment_id", appt_id) \
                .execute()
            
            if existing_token.data:
                base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
                link = f"{base_url}/intake/{existing_token.data[0]['token']}"
                return {"success": True, "link": link, "token": existing_token.data[0]["token"], "reused": True}

        # No duplicate found, proceed to create
        appt_id = f"a-{uuid.uuid4().hex[:8]}"
        appt_data = {
            "id": appt_id,
            "patient_id": pid,
            "start_time": req.appointment_time,
            "status": "scheduled",
            "reason": "Intake Pending"
        }
        create_appointment(appt_data, clinic_id=x_clinic_id, doctor_id=x_doctor_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to handle appointment: {e}")

    # 3. Create Token — tagged with clinic + doctor
    try:
        token_data = {
            "token": str(uuid.uuid4()),
            "patient_id": pid,
            "appointment_id": appt_id,
            "phone": req.phone
        }
        create_intake_token(token_data, clinic_id=x_clinic_id, doctor_id=x_doctor_id)
        
        # Return link
        base_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        link = f"{base_url}/intake/{token_data['token']}"
        return {"success": True, "link": link, "token": token_data["token"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create token: {e}")

@app.get("/intake/token/{token}")
def get_intake_token_details(token: str):
    """Validate token and return context."""
    data = get_intake_token(token)
    if not data:
        raise HTTPException(status_code=404, detail="Invalid token")
    
    # Check expiry (simple check)
    expires = datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00"))
    if datetime.now(expires.tzinfo) > expires:
         # Optionally allow if status is pending? no, strict expiry
         raise HTTPException(status_code=400, detail="Token expired")
         
    if data["status"] != "pending":
         raise HTTPException(status_code=400, detail="Token already used")

    patient = data.get("patients")
    
    # Mask data? Or just return what is needed.
    # We need name/phone for verification UI.
    return {
        "valid": True,
        "phone_masked": data["phone"][-4:] if data["phone"] else "xxxx", 
        "patient_name": patient["name"],
        "appointment_time": data["appointments"]["start_time"],
        "is_new_patient": data.get("is_new_patient", False),
        "patient_details": {
            "dob": patient.get("dob"), 
            "gender": patient.get("gender"),
            "has_history": bool(patient.get("conditions") or patient.get("medications"))
        }
    }



@app.post("/intake/token/submit")
def submit_intake_token(req: IntakeTokenSubmitRequest):
    """Submit the intake form via token — all records tagged with token's clinic."""
    data = get_intake_token(req.token)
    if not data or data["status"] != "pending":
        raise HTTPException(status_code=400, detail="Invalid or used token")
        
    pid = data["patient_id"]
    appt_id = data["appointment_id"]
    
    # Resolve clinic_id from the token's linked appointment
    token_clinic_id = data.get("clinic_id")
    if not token_clinic_id:
        # Fallback: get clinic_id from the appointment
        appt_data = data.get("appointments")
        if appt_data and isinstance(appt_data, dict):
            token_clinic_id = appt_data.get("clinic_id")
    
    # Update Patient
    p_updates = {}
    if req.dob:
        try:
            dob_dt = datetime.strptime(req.dob, "%Y-%m-%d")
            today = datetime.now()
            age = today.year - dob_dt.year - ((today.month, today.day) < (dob_dt.month, dob_dt.day))
            p_updates["age"] = age
        except:
            pass

    if req.gender: p_updates["gender"] = req.gender
    if req.address: p_updates["address"] = req.address
    if req.height_cm: p_updates["height_cm"] = req.height_cm
    if req.weight_kg: p_updates["weight_kg"] = req.weight_kg
    if req.conditions: p_updates["conditions"] = req.conditions
    if req.medications: p_updates["medications"] = req.medications
    if req.allergies: p_updates["allergies"] = req.allergies
    
    if p_updates:
        update_patient(pid, p_updates)
        
    # Update Appointment
    update_appointment(appt_id, {
        "reason": req.reason,
        "status": "confirmed"
    })
    
    # Save History/Symptoms as Note — tagged with clinic
    note_content = f"Intake Form Submission:\n\nHistory: {req.history}\nSymptoms: {req.symptoms}\nReason: {req.reason}"
    note_data = {
        "patient_id": pid,
        "content": note_content,
        "note_type": "intake"
    }
    if token_clinic_id:
        note_data["clinic_id"] = token_clinic_id
    create_note(note_data)

    # Also create clinical dump for AI processing — tagged with clinic
    dump_data = {
        "id": f"dump-{uuid.uuid4()}",
        "patient_id": pid,
        "appointment_id": appt_id,
        "manual_notes": note_content,
        "combined_dump": note_content
    }
    if token_clinic_id:
        dump_data["clinic_id"] = token_clinic_id
    create_clinical_dump(dump_data)
    
    # Save Documents — tagged with clinic
    for doc in req.documents:
        file_url = doc.get("url")
        extracted_text = ""
        if file_url:
            extracted_text = extract_text_from_url(file_url)
            
        doc_data = {
            "patient_id": pid,
            "title": doc.get("name", "Intake Document"),
            "doc_type": "patient_upload",
            "file_url": file_url,
            "extracted_text": extracted_text
        }
        if token_clinic_id:
            doc_data["clinic_id"] = token_clinic_id
        create_document(doc_data)
        
    # Mark token used
    update_intake_token(req.token, {"status": "completed"})
    
    return {"success": True}

