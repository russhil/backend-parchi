"""
ClinicOS Demo — FastAPI Backend
All routes in one file for demo simplicity.
"""

import json
import os
import uuid
from datetime import datetime

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from pydantic import BaseModel

from data import (
    ai_intake_summary,
    appointments,
    consult_sessions,
    differential_diagnosis,
    documents,
    patients,
    report_insights,
    visits,
)
from prompts import CONSULT_ANALYSIS_PROMPT, PATIENT_QA_PROMPT

load_dotenv()

app = FastAPI(title="ClinicOS Demo API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# LLM client — OpenAI-compatible, pointed at NVIDIA NIM
nim_client = OpenAI(
    api_key=os.getenv("NIM_API_KEY", ""),
    base_url=os.getenv("NIM_BASE_URL", "https://integrate.api.nvidia.com/v1"),
)
NIM_MODEL = os.getenv("NIM_MODEL", "kimi-k2.5")


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


# --- Helper Functions ---


def get_patient_context(patient_id: str) -> dict:
    """Build full patient context for LLM prompts."""
    patient = patients.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient_docs = [d for d in documents.values() if d["patient_id"] == patient_id]
    patient_visits = [v for v in visits.values() if v["patient_id"] == patient_id]
    patient_consults = [c for c in consult_sessions if c["patient_id"] == patient_id]

    return {
        "patient": patient,
        "documents": patient_docs,
        "visits": patient_visits,
        "consults": patient_consults,
    }


# --- Routes ---


@app.get("/patient/{patient_id}")
def get_patient(patient_id: str):
    """Return patient + related data."""
    patient = patients.get(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    patient_appointments = [
        a for a in appointments.values() if a["patient_id"] == patient_id
    ]
    patient_visits = [v for v in visits.values() if v["patient_id"] == patient_id]
    patient_docs = [d for d in documents.values() if d["patient_id"] == patient_id]
    patient_consults = [c for c in consult_sessions if c["patient_id"] == patient_id]

    return {
        "patient": patient,
        "appointments": sorted(patient_appointments, key=lambda x: x["start_time"]),
        "visits": sorted(patient_visits, key=lambda x: x["visit_time"], reverse=True),
        "documents": patient_docs,
        "consult_sessions": patient_consults,
        "ai_intake_summary": ai_intake_summary.get(patient_id),
        "differential_diagnosis": differential_diagnosis.get(patient_id, []),
        "report_insights": report_insights.get(patient_id),
    }


@app.post("/search")
def search(req: SearchRequest):
    """Search across patient data, documents, visit notes."""
    query = req.query.lower().strip()
    results = []

    for pid, patient in patients.items():
        snippets = []

        # Search patient name and conditions
        if query in patient["name"].lower():
            snippets.append(f"Patient name matches: {patient['name']}")
        for cond in patient["conditions"]:
            if query in cond.lower():
                snippets.append(f"Known condition: {cond}")
        for med in patient["medications"]:
            if query in med.lower():
                snippets.append(f"Current medication: {med}")
        for allergy in patient["allergies"]:
            if query in allergy.lower():
                snippets.append(f"Allergy: {allergy}")

        # Search documents
        for doc in documents.values():
            if doc["patient_id"] == pid and query in doc["extracted_text"].lower():
                # Extract a snippet around the match
                text = doc["extracted_text"]
                idx = text.lower().find(query)
                start = max(0, idx - 50)
                end = min(len(text), idx + len(query) + 50)
                snippet = text[start:end].replace("\n", " ")
                if start > 0:
                    snippet = "..." + snippet
                if end < len(text):
                    snippet = snippet + "..."
                snippets.append(f"Found in {doc['title']}: {snippet}")

        # Search visit notes
        for visit in visits.values():
            if visit["patient_id"] == pid:
                if query in visit["doctor_notes_text"].lower():
                    text = visit["doctor_notes_text"]
                    idx = text.lower().find(query)
                    start = max(0, idx - 50)
                    end = min(len(text), idx + len(query) + 50)
                    snippet = text[start:end].replace("\n", " ")
                    if start > 0:
                        snippet = "..." + snippet
                    if end < len(text):
                        snippet = snippet + "..."
                    snippets.append(f"Found in visit notes: {snippet}")
                if visit.get("summary_ai") and query in visit["summary_ai"].lower():
                    snippets.append(f"AI summary: {visit['summary_ai'][:100]}...")

        if snippets:
            results.append(
                {
                    "patient_id": pid,
                    "patient_name": patient["name"],
                    "matched_snippets": snippets,
                }
            )

    # If no results, still return the demo patient with a generic message
    if not results:
        results.append(
            {
                "patient_id": "p1",
                "patient_name": "Sarah Jenkins",
                "matched_snippets": [
                    f'No exact match for "{req.query}", but showing available patient.'
                ],
            }
        )

    return {"results": results}


@app.post("/consult/start")
def start_consult(req: ConsultStartRequest):
    """Create a new consult session."""
    patient = patients.get(req.patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    session_id = f"cs-{uuid.uuid4().hex[:8]}"
    session = {
        "id": session_id,
        "patient_id": req.patient_id,
        "started_at": datetime.now().isoformat(),
        "ended_at": None,
        "transcript_text": None,
        "soap_note": None,
        "insights_json": None,
    }
    consult_sessions.append(session)
    return {"consult_session_id": session_id}


@app.post("/consult/{session_id}/stop")
def stop_consult(session_id: str, req: ConsultStopRequest):
    """Stop consult session, analyze transcript with LLM."""
    session = next((s for s in consult_sessions if s["id"] == session_id), None)
    if not session:
        raise HTTPException(status_code=404, detail="Consult session not found")

    patient = patients.get(session["patient_id"])
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    vitals = patient["vitals"]

    # Build prompt
    prompt = CONSULT_ANALYSIS_PROMPT.format(
        patient_name=patient["name"],
        patient_age=patient["age"],
        patient_gender=patient["gender"],
        conditions=", ".join(patient["conditions"]),
        medications=", ".join(patient["medications"]),
        allergies=", ".join(patient["allergies"]),
        vitals=f"BP {vitals['bp_systolic']}/{vitals['bp_diastolic']}, SpO2 {vitals['spo2']}%, HR {vitals['heart_rate']}, Temp {vitals['temperature_f']}°F",
        transcript=req.transcript_text,
    )

    try:
        response = nim_client.chat.completions.create(
            model=NIM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=2000,
        )
        raw = response.choices[0].message.content

        # Try to parse JSON from response
        try:
            # Find JSON in the response (it might be wrapped in markdown code blocks)
            json_str = raw
            if "```json" in raw:
                json_str = raw.split("```json")[1].split("```")[0]
            elif "```" in raw:
                json_str = raw.split("```")[1].split("```")[0]
            insights = json.loads(json_str)
        except (json.JSONDecodeError, IndexError):
            # Fallback: return raw text as-is
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
                "raw_response": raw,
            }

    except Exception as e:
        # LLM call failed — return a fallback
        insights = {
            "clean_transcript": req.transcript_text,
            "soap": {
                "subjective": "AI analysis unavailable",
                "objective": "AI analysis unavailable",
                "assessment": "AI analysis unavailable",
                "plan": "AI analysis unavailable",
            },
            "extracted_facts": {
                "symptoms": [],
                "duration": "",
                "medications_discussed": [],
                "allergies_mentioned": [],
            },
            "follow_up_questions": [f"AI analysis failed: {str(e)}"],
            "differential_suggestions": [],
            "disclaimer": "AI analysis was unavailable. Please document manually.",
        }

    # Update session
    session["ended_at"] = datetime.now().isoformat()
    session["transcript_text"] = req.transcript_text
    session["soap_note"] = insights.get("soap")
    session["insights_json"] = insights

    return {
        "session_id": session_id,
        "transcript": insights.get("clean_transcript", req.transcript_text),
        "soap": insights.get("soap"),
        "insights": insights,
    }


@app.post("/chat")
def chat(req: ChatRequest):
    """Patient Q&A chat with LLM."""
    ctx = get_patient_context(req.patient_id)
    patient = ctx["patient"]
    vitals = patient["vitals"]

    # Build document summaries
    doc_texts = "\n\n".join(
        f"--- {d['title']} ({d['doc_type']}) ---\n{d['extracted_text']}"
        for d in ctx["documents"]
    )

    # Build visit summaries
    visit_texts = "\n\n".join(
        f"--- Visit {v['visit_time']} ---\n{v.get('summary_ai', v['doctor_notes_text'])}"
        for v in ctx["visits"]
    )

    # Build consult summaries
    consult_texts = "\n\n".join(
        f"--- Consult {c['started_at']} ---\nSOAP: {json.dumps(c.get('soap_note', {}))}"
        for c in ctx["consults"]
        if c.get("soap_note")
    ) or "No recent consult sessions."

    system_prompt = PATIENT_QA_PROMPT.format(
        patient_name=patient["name"],
        patient_age=patient["age"],
        patient_gender=patient["gender"],
        height_cm=patient["height_cm"],
        weight_kg=patient["weight_kg"],
        conditions=", ".join(patient["conditions"]),
        medications=", ".join(patient["medications"]),
        allergies=", ".join(patient["allergies"]),
        bp=f"{vitals['bp_systolic']}/{vitals['bp_diastolic']}",
        spo2=vitals["spo2"],
        hr=vitals["heart_rate"],
        temp=vitals["temperature_f"],
        documents=doc_texts,
        visits=visit_texts,
        consults=consult_texts,
    )

    messages = [{"role": "system", "content": system_prompt}]
    for msg in req.history:
        messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
    messages.append({"role": "user", "content": req.message})

    try:
        response = nim_client.chat.completions.create(
            model=NIM_MODEL,
            messages=messages,
            temperature=0.3,
            max_tokens=500,
        )
        reply = response.choices[0].message.content
    except Exception as e:
        reply = f"I'm sorry, I couldn't process your request. Error: {str(e)}"

    return {"reply": reply}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
