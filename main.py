"""
ClinicOS/Parchi.ai — FastAPI Backend (MVP)
Now with Supabase database and Google AI Studio (Gemma-3-27b-it) integration.
"""

import json
import os
import uuid
from datetime import datetime
from typing import AsyncGenerator

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import google.generativeai as genai

from database import (
    get_patient,
    get_all_patients,
    search_patients,
    get_appointments_for_patient,
    get_todays_appointments,
    get_all_appointments,
    create_appointment,
    update_appointment,
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
)
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
)

load_dotenv()

app = FastAPI(title="Parchi.ai API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Google AI
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# Use Gemma-3-27b-it model
MODEL_NAME = "gemma-3-27b-it"


def get_model():
    """Get the configured Gemini/Gemma model."""
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


# --- Helper Functions ---


def build_patient_context(patient_id: str) -> dict:
    """Build full patient context for LLM prompts."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    documents = get_documents_for_patient(patient_id)
    visits = get_visits_for_patient(patient_id)
    consults = get_consults_for_patient(patient_id)

    return {
        "patient": patient,
        "documents": documents,
        "visits": visits,
        "consults": consults,
    }



def generate_ai_response(prompt: str, max_tokens: int = 1000) -> str:
    """Generate AI response using Google Gemma (Synchronous)."""
    if not GOOGLE_API_KEY:
        return "AI is not configured. Please set GOOGLE_API_KEY in your environment."
    
    try:
        model = get_model()
        response = model.generate_content(
            prompt,
            generation_config=genai.GenerationConfig(
                temperature=0.3,
                max_output_tokens=max_tokens,
            )
        )
        return response.text
    except Exception as e:
        return f"AI error: {str(e)}"


async def generate_ai_response_async(prompt: str, max_tokens: int = 1000) -> str:
    """Generate AI response using Google Gemma (Asynchronous)."""
    import asyncio
    return await asyncio.to_thread(generate_ai_response, prompt, max_tokens)



# --- Routes: Health Check ---


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "model": MODEL_NAME, "ai_configured": bool(GOOGLE_API_KEY)}


# --- Routes: Patients ---


@app.get("/patients")
def list_patients():
    """List all patients."""
    patients = get_all_patients()
    return {"patients": patients}


@app.get("/patient/{patient_id}")
def get_patient_details(patient_id: str):
    """Return patient + related data."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    appointments = get_appointments_for_patient(patient_id)
    visits = get_visits_for_patient(patient_id)
    documents = get_documents_for_patient(patient_id)
    consults = get_consults_for_patient(patient_id)
    prescriptions = get_prescriptions_for_patient(patient_id)
    notes = get_notes_for_patient(patient_id)
    
    # Get AI-generated data
    ai_intake = get_ai_intake_summary(patient_id)
    differential = get_differential_diagnosis(patient_id)
    report_insights = get_report_insights(patient_id)

    return {
        "patient": patient,
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


# --- Routes: Search ---


@app.post("/search")
def search(req: SearchRequest):
    """Search across patient data, documents, visit notes."""
    query = req.query.strip()
    if not query:
        return {"results": []}

    results = search_patients(query)

    # Also search in documents
    all_patients = get_all_patients()
    for patient in all_patients:
        doc_matches = search_documents(patient["id"], query)
        if doc_matches:
            # Check if patient already in results
            existing = next((r for r in results if r["patient_id"] == patient["id"]), None)
            if existing:
                for dm in doc_matches:
                    existing["matched_snippets"].append(dm["snippet"])
            else:
                results.append({
                    "patient_id": patient["id"],
                    "patient_name": patient["name"],
                    "matched_snippets": [dm["snippet"] for dm in doc_matches],
                })

    if not results:
        results.append({
            "patient_id": "",
            "patient_name": "",
            "matched_snippets": [f'No results found for "{query}"'],
        })

    return {"results": results}


# --- Routes: Appointments ---


@app.get("/appointments")
def list_appointments():
    """List all appointments."""
    appointments = get_all_appointments()
    return {"appointments": appointments}


@app.get("/appointments/today")
def list_todays_appointments():
    """List today's appointments."""
    appointments = get_todays_appointments()
    return {"appointments": appointments}


@app.post("/appointments")
def create_new_appointment(req: AppointmentRequest):
    """Create a new appointment."""
    patient = get_patient(req.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    appointment_id = f"a-{uuid.uuid4().hex[:8]}"
    appointment = create_appointment({
        "id": appointment_id,
        "patient_id": req.patient_id,
        "start_time": req.start_time,
        "status": req.status,
        "reason": req.reason,
    })
    return {"appointment": appointment}


@app.post("/appointments/mark-seen")
def mark_patient_seen(req: MarkSeenRequest):
    """Mark an appointment as seen/completed."""
    updated = update_appointment(req.appointment_id, {"status": "completed"})
    if not updated:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return {"success": True, "appointment": updated}


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
        conditions=", ".join(patient.get("conditions", [])) or "None",
        medications=", ".join(patient.get("medications", [])) or "None",
        allergies=", ".join(patient.get("allergies", [])) or "None",
        vitals=f"BP {vitals.get('bp_systolic', 'N/A')}/{vitals.get('bp_diastolic', 'N/A')}, SpO2 {vitals.get('spo2', 'N/A')}%, HR {vitals.get('heart_rate', 'N/A')}, Temp {vitals.get('temperature_f', 'N/A')}°F",
        transcript=req.transcript_text,
    )

    raw_response = generate_ai_response(prompt, max_tokens=2000)

    # Try to parse JSON from response
    try:
        json_str = raw_response
        if "```json" in raw_response:
            json_str = raw_response.split("```json")[1].split("```")[0]
        elif "```" in raw_response:
            json_str = raw_response.split("```")[1].split("```")[0]
        insights = json.loads(json_str)
    except (json.JSONDecodeError, IndexError):
        insights = {
            "clean_transcript": req.transcript_text,
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

    # Build consult summaries
    consult_texts = "\n\n".join(
        f"--- Consult {c.get('started_at', 'Unknown')} ---\nSOAP: {json.dumps(c.get('soap_note', {}))}"
        for c in ctx["consults"]
        if c.get("soap_note")
    ) or "No recent consult sessions."

    system_prompt = PATIENT_QA_PROMPT.format(
        patient_name=patient["name"],
        patient_age=patient.get("age", "Unknown"),
        patient_gender=patient.get("gender", "Unknown"),
        height_cm=patient.get("height_cm", "N/A"),
        weight_kg=patient.get("weight_kg", "N/A"),
        conditions=", ".join(patient.get("conditions", [])) or "None",
        medications=", ".join(patient.get("medications", [])) or "None",
        allergies=", ".join(patient.get("allergies", [])) or "None",
        bp=f"{vitals.get('bp_systolic', 'N/A')}/{vitals.get('bp_diastolic', 'N/A')}",
        spo2=vitals.get("spo2", "N/A"),
        hr=vitals.get("heart_rate", "N/A"),
        temp=vitals.get("temperature_f", "N/A"),
        documents=doc_texts,
        visits=visit_texts,
        consults=consult_texts,
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

            full_context = f"""
**Patient Profile:**
{patient_profile}

**Documents:**
{doc_texts}

**Recent Visits:**
{visit_texts}
"""
            
            yield emit("success", "✓ Context prepared")
            
            # Step 6: Check AI configuration
            if not GOOGLE_API_KEY:
                yield emit("error", "❌ GOOGLE_API_KEY not configured in environment")
                return
            
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
            context_task = generate_ai_response_async(context_prompt, max_tokens=200)
            
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
            
            summary_id = f"ais-{uuid.uuid4().hex[:8]}"
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
async def generate_differential_diagnosis(patient_id: str):
    """Generate differential diagnosis using 2-step AI process (Candidates -> Scoring)."""
    
    # 1. Fetch Patient Context
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    visits = get_visits_for_patient(patient_id)
    
    # Build context string
    patient_summary = f"""
    Name: {patient['name']}
    Age: {patient.get('age', '?')}
    Gender: {patient.get('gender', '?')}
    """
    
    # Find latest Chief Complaint from AI Intake if available
    ai_intake = get_ai_intake_summary(patient_id)
    chief_complaint = ai_intake.get("chief_complaint", "Not recorded") if ai_intake else "Not recorded"
    
    # Or try to find from appointments
    if chief_complaint == "Not recorded":
        appointments = get_appointments_for_patient(patient_id)
        if appointments:
            chief_complaint = appointments[0].get("reason", "Not recorded")

    history = f"Conditions: {', '.join(patient.get('conditions', []))}\nMedications: {', '.join(patient.get('medications', []))}"
    findings = ai_intake.get("findings", []) if ai_intake else []
    findings_str = "\n".join(findings) if isinstance(findings, list) else str(findings)

    # 2. Step 1: Generate Candidates
    candidates_prompt = DIFFERENTIAL_CANDIDATES_PROMPT.format(
        patient_name=patient['name'],
        patient_age=patient.get('age', '?'),
        patient_gender=patient.get('gender', '?'),
        chief_complaint=chief_complaint,
        history=history,
        findings=findings_str
    )
    
    raw_candidates = await generate_ai_response_async(candidates_prompt, max_tokens=200)
    
    # Parse List
    try:
        # cleanup json
        text = raw_candidates.replace("```json", "").replace("```", "").strip()
        start = text.find("[")
        end = text.rfind("]") + 1
        candidate_list = json.loads(text[start:end])
    except:
        candidate_list = ["Common Cold", "Flu", "Allergies"] # Fallback
        
    # 3. Step 2: Score Each Candidate
    scored_results = []
    import asyncio
    
    async def score_condition(cond):
        prompt = DIFFERENTIAL_SCORING_PROMPT.format(
            condition=cond,
            patient_name=patient['name'],
            patient_age=patient.get('age', '?'),
            patient_gender=patient.get('gender', '?'),
            chief_complaint=chief_complaint,
            history=history,
            findings=findings_str
        )
        resp = await generate_ai_response_async(prompt, max_tokens=150)
        try:
            text = resp.replace("```json", "").replace("```", "").strip()
            start = text.find("{")
            end = text.rfind("}") + 1
            data = json.loads(text[start:end])
            return {
                "condition_name": data.get("condition", cond),
                "match_pct": data.get("match_pct", 50),
                "rationale": data.get("reasoning", "Analysis pending.")
            }
        except:
             return {
                "condition_name": cond,
                "match_pct": 50,
                "rationale": "Could not verify match percentage."
            }

    # Run in parallel
    tasks = [score_condition(c) for c in candidate_list]
    scored_results = await asyncio.gather(*tasks)
    
    # Sort by match %
    scored_results.sort(key=lambda x: x["match_pct"], reverse=True)
    
    # 4. Save to DB
    save_differential_diagnoses(patient_id, scored_results)
    
    return {"status": "success", "data": scored_results}


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
    """Upload a document for a patient."""
    patient = get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Read file content
    content = await file.read()
    extracted_text = content.decode("utf-8", errors="ignore")[:5000]  # Limit text extraction
    
    doc_id = f"d-{uuid.uuid4().hex[:8]}"
    document = create_document({
        "id": doc_id,
        "patient_id": patient_id,
        "title": title,
        "doc_type": doc_type,
        "extracted_text": extracted_text,
    })
    return {"document": document}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
