"""
Supabase Database Module for Parchi.ai
Handles all database connections and CRUD operations.
"""

import os
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

# Initialize Supabase client
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

_supabase_client: Optional[Client] = None


def get_supabase() -> Client:
    """Get or create Supabase client singleton."""
    global _supabase_client
    if _supabase_client is None:
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in environment")
        _supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
        print(f"✓ Supabase connected to {SUPABASE_URL}")
    return _supabase_client


# --- Patient Operations ---

def get_patient(patient_id: str) -> Optional[dict]:
    """Fetch a single patient by ID."""
    client = get_supabase()
    result = client.table("patients").select("*").eq("id", patient_id).execute()
    return result.data[0] if result.data else None


def get_all_patients() -> list[dict]:
    """Fetch all patients."""
    client = get_supabase()
    result = client.table("patients").select("*").order("name").execute()
    return result.data or []


def search_patients(query: str) -> list[dict]:
    """Search patients by name, conditions, or medications."""
    client = get_supabase()
    query_lower = query.lower()
    # Supabase doesn't support full-text search on arrays easily,
    # so we fetch all and filter in Python for MVP
    result = client.table("patients").select("*").execute()
    
    matches = []
    for patient in result.data or []:
        snippets = []
        
        # Search name
        if query_lower in patient["name"].lower():
            snippets.append(f"Patient name matches: {patient['name']}")
        
        # Search conditions
        for cond in patient.get("conditions", []):
            if query_lower in cond.lower():
                snippets.append(f"Known condition: {cond}")
        
        # Search medications
        for med in patient.get("medications", []):
            if query_lower in med.lower():
                snippets.append(f"Current medication: {med}")
        
        # Search allergies
        for allergy in patient.get("allergies", []):
            if query_lower in allergy.lower():
                snippets.append(f"Allergy: {allergy}")
        
        if snippets:
            matches.append({
                "patient_id": patient["id"],
                "patient_name": patient["name"],
                "matched_snippets": snippets,
            })
    
    return matches


def create_patient(patient_data: dict) -> dict:
    """Create a new patient."""
    client = get_supabase()
    result = client.table("patients").insert(patient_data).execute()
    return result.data[0] if result.data else {}


def update_patient(patient_id: str, updates: dict) -> dict:
    """Update patient data."""
    client = get_supabase()
    result = client.table("patients").update(updates).eq("id", patient_id).execute()
    return result.data[0] if result.data else {}


# --- Appointment Operations ---

def get_appointments_for_patient(patient_id: str) -> list[dict]:
    """Fetch appointments for a specific patient."""
    client = get_supabase()
    result = (
        client.table("appointments")
        .select("*")
        .eq("patient_id", patient_id)
        .order("start_time")
        .execute()
    )
    return result.data or []


def get_todays_appointments() -> list[dict]:
    """Fetch today's appointments with patient info."""
    client = get_supabase()
    today = datetime.now().date().isoformat()
    tomorrow = (datetime.now().date().replace(day=datetime.now().day + 1)).isoformat()
    
    result = (
        client.table("appointments")
        .select("*, patients(id, name)")
        .gte("start_time", today)
        .lt("start_time", tomorrow)
        .order("start_time")
        .execute()
    )
    return result.data or []


def get_all_appointments() -> list[dict]:
    """Fetch all appointments with patient info."""
    client = get_supabase()
    result = (
        client.table("appointments")
        .select("*, patients(id, name)")
        .order("start_time", desc=True)
        .execute()
    )
    return result.data or []


def create_appointment(appointment_data: dict) -> dict:
    """Create a new appointment."""
    client = get_supabase()
    result = client.table("appointments").insert(appointment_data).execute()
    return result.data[0] if result.data else {}


def update_appointment(appointment_id: str, updates: dict) -> dict:
    """Update appointment (e.g., mark as seen)."""
    client = get_supabase()
    result = (
        client.table("appointments")
        .update(updates)
        .eq("id", appointment_id)
        .execute()
    )
    return result.data[0] if result.data else {}


# --- Visit Operations ---

def get_visits_for_patient(patient_id: str) -> list[dict]:
    """Fetch visits for a specific patient."""
    client = get_supabase()
    result = (
        client.table("visits")
        .select("*")
        .eq("patient_id", patient_id)
        .order("visit_time", desc=True)
        .execute()
    )
    return result.data or []


def create_visit(visit_data: dict) -> dict:
    """Create a new visit record."""
    client = get_supabase()
    result = client.table("visits").insert(visit_data).execute()
    return result.data[0] if result.data else {}


# --- Document Operations ---

def get_documents_for_patient(patient_id: str) -> list[dict]:
    """Fetch documents for a specific patient."""
    client = get_supabase()
    result = (
        client.table("documents")
        .select("*")
        .eq("patient_id", patient_id)
        .order("uploaded_at", desc=True)
        .execute()
    )
    return result.data or []


def create_document(document_data: dict) -> dict:
    """Create a new document record."""
    client = get_supabase()
    result = client.table("documents").insert(document_data).execute()
    return result.data[0] if result.data else {}


def search_documents(patient_id: str, query: str) -> list[dict]:
    """Search documents for a patient by extracted text."""
    client = get_supabase()
    result = (
        client.table("documents")
        .select("*")
        .eq("patient_id", patient_id)
        .execute()
    )
    
    query_lower = query.lower()
    matches = []
    for doc in result.data or []:
        if query_lower in doc.get("extracted_text", "").lower():
            text = doc["extracted_text"]
            idx = text.lower().find(query_lower)
            start = max(0, idx - 50)
            end = min(len(text), idx + len(query) + 50)
            snippet = text[start:end].replace("\n", " ")
            if start > 0:
                snippet = "..." + snippet
            if end < len(text):
                snippet = snippet + "..."
            matches.append({
                "document": doc,
                "snippet": f"Found in {doc['title']}: {snippet}"
            })
    
    return matches


# --- Consult Session Operations ---

def get_consults_for_patient(patient_id: str) -> list[dict]:
    """Fetch consult sessions for a specific patient."""
    client = get_supabase()
    result = (
        client.table("consult_sessions")
        .select("*")
        .eq("patient_id", patient_id)
        .order("started_at", desc=True)
        .execute()
    )
    return result.data or []


def create_consult_session(session_data: dict) -> dict:
    """Create a new consult session."""
    client = get_supabase()
    result = client.table("consult_sessions").insert(session_data).execute()
    return result.data[0] if result.data else {}


def update_consult_session(session_id: str, updates: dict) -> dict:
    """Update a consult session."""
    client = get_supabase()
    result = (
        client.table("consult_sessions")
        .update(updates)
        .eq("id", session_id)
        .execute()
    )
    return result.data[0] if result.data else {}


def get_consult_session(session_id: str) -> Optional[dict]:
    """Fetch a single consult session."""
    client = get_supabase()
    result = (
        client.table("consult_sessions")
        .select("*")
        .eq("id", session_id)
        .execute()
    )
    return result.data[0] if result.data else None


# --- AI Intake & Diagnosis Operations ---

def get_ai_intake_summary(patient_id: str) -> Optional[dict]:
    """Fetch AI intake summary for a patient."""
    client = get_supabase()
    result = (
        client.table("ai_intake_summaries")
        .select("*")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def create_ai_intake_summary(summary_data: dict) -> dict:
    """Create a new AI intake summary."""
    client = get_supabase()
    result = client.table("ai_intake_summaries").insert(summary_data).execute()
    return result.data[0] if result.data else {}


def get_differential_diagnosis(patient_id: str) -> list[dict]:
    """Fetch differential diagnoses for a patient."""
    client = get_supabase()
    result = (
        client.table("differential_diagnoses")
        .select("*")
        .eq("patient_id", patient_id)
        .order("match_pct", desc=True)
        .execute()
    )
    return result.data or []


def save_differential_diagnoses(patient_id: str, diagnoses: list[dict]) -> bool:
    """Save new differential diagnoses, replacing old ones."""
    client = get_supabase()
    
    # 1. Delete existing for patient
    client.table("differential_diagnoses").delete().eq("patient_id", patient_id).execute()
    
    # 2. Insert new
    if not diagnoses:
        return True

    # Ensure patient_id is set
    for d in diagnoses:
        d["patient_id"] = patient_id
        
    result = client.table("differential_diagnoses").insert(diagnoses).execute()
    return bool(result.data)


def get_report_insights(patient_id: str) -> Optional[dict]:
    """Fetch report insights for a patient."""
    client = get_supabase()
    result = (
        client.table("report_insights")
        .select("*")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


# --- Prescription Operations ---

def create_prescription(prescription_data: dict) -> dict:
    """Create a new prescription."""
    client = get_supabase()
    result = client.table("prescriptions").insert(prescription_data).execute()
    return result.data[0] if result.data else {}


def get_prescriptions_for_patient(patient_id: str) -> list[dict]:
    """Fetch prescriptions for a patient."""
    client = get_supabase()
    result = (
        client.table("prescriptions")
        .select("*")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


# --- Notes Operations ---

def create_note(note_data: dict) -> dict:
    """Create a manual note."""
    client = get_supabase()
    result = client.table("notes").insert(note_data).execute()
    return result.data[0] if result.data else {}


def get_notes_for_patient(patient_id: str) -> list[dict]:
    """Fetch notes for a patient."""
    client = get_supabase()
    result = (
        client.table("notes")
        .select("*")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []
