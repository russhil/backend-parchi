"""
Supabase Database Module for Parchi.ai
Handles all database connections and CRUD operations.
"""

import os
from datetime import datetime
from typing import Optional

from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

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
    """
    Comprehensive search for patients across all records:
    - Demographics, conditions, medications, allergies
    - Clinical dumps (transcripts, notes)
    - Doctor notes
    - Visit summaries
    - Report insights
    - AI Intake summaries
    """
    client = get_supabase()
    query_lower = query.lower()
    matches = {}  # patient_id -> {patient_name, snippets}

    # Helper to add match
    def add_match(pid, name, snippet):
        if pid not in matches:
            matches[pid] = {"patient_id": pid, "patient_name": name, "matched_snippets": []}
        matches[pid]["matched_snippets"].append(snippet)

    # 1. Search Patients Table (Memory-based for arrays)
    patients = client.table("patients").select("*").execute().data or []
    patient_map = {p["id"]: (p.get("name") or "Unknown") for p in patients}

    for p in patients:
        pid = p["id"]
        p_name = p.get("name") or "Unknown"

        # Name
        if query_lower in p_name.lower():
            add_match(pid, p_name, f"Name match: {p_name}")

        # Phone
        if p.get("phone") and query_lower in str(p["phone"]).lower():
            add_match(pid, p_name, f"Phone match: {p['phone']}")

        # Arrays (guard against None items)
        for cond in (p.get("conditions") or []):
            if cond and query_lower in str(cond).lower():
                add_match(pid, p_name, f"Condition: {cond}")
        for med in (p.get("medications") or []):
            if med and query_lower in str(med).lower():
                add_match(pid, p_name, f"Medication: {med}")
        for allergy in (p.get("allergies") or []):
            if allergy and query_lower in str(allergy).lower():
                add_match(pid, p_name, f"Allergy: {allergy}")

    # 2. Search Clinical Dumps
    dumps = client.table("clinical_dumps").select("patient_id, combined_dump, transcript_text, manual_notes").execute().data or []
    for d in dumps:
        pid = d["patient_id"]
        if pid not in patient_map: continue
        
        text = (d.get("combined_dump") or "") + " " + (d.get("transcript_text") or "") + " " + (d.get("manual_notes") or "")
        if query_lower in text.lower():
            snippet = text[max(0, text.lower().find(query_lower)-30):min(len(text), text.lower().find(query_lower)+100)]
            add_match(pid, patient_map[pid], f"Clinical Dump match: ...{snippet}...")

    # 3. Search Notes
    notes = client.table("notes").select("patient_id, content").execute().data or []
    for n in notes:
        pid = n["patient_id"]
        if pid not in patient_map: continue

        content = n.get("content") or ""
        if query_lower in content.lower():
            idx = content.lower().find(query_lower)
            snippet = content[max(0, idx-30):min(len(content), idx+100)]
            add_match(pid, patient_map[pid], f"Note match: ...{snippet}...")

    # 4. Search Visits
    visits = client.table("visits").select("patient_id, summary_ai, doctor_notes_text").execute().data or []
    for v in visits:
        pid = v["patient_id"]
        if pid not in patient_map: continue
        
        text = (v.get("summary_ai") or "") + " " + (v.get("doctor_notes_text") or "")
        if query_lower in text.lower():
            snippet = text[max(0, text.lower().find(query_lower)-30):min(len(text), text.lower().find(query_lower)+100)]
            add_match(pid, patient_map[pid], f"Visit match: ...{snippet}...")

    # 5. Search Report Insights
    reports = client.table("report_insights").select("patient_id, insight_text").execute().data or []
    for r in reports:
        pid = r["patient_id"]
        if pid not in patient_map: continue
        
        if query_lower in r.get("insight_text", "").lower():
            text = r["insight_text"]
            snippet = text[max(0, text.lower().find(query_lower)-30):min(len(text), text.lower().find(query_lower)+100)]
            add_match(pid, patient_map[pid], f"Report Insight match: ...{snippet}...")

    # 6. Search AI Intake Summaries
    intakes = client.table("ai_intake_summaries").select("patient_id, summary_text").execute().data or []
    for i in intakes:
        pid = i["patient_id"]
        if pid not in patient_map: continue
        
        if query_lower in i.get("summary_text", "").lower():
            text = i["summary_text"]
            snippet = text[max(0, text.lower().find(query_lower)-30):min(len(text), text.lower().find(query_lower)+100)]
            add_match(pid, patient_map[pid], f"Intake Summary match: ...{snippet}...")

    return list(matches.values())


def create_patient(patient_data: dict) -> dict:
    """Create a new patient."""
    try:
        client = get_supabase()
        result = client.table("patients").insert(patient_data).execute()
        return result.data[0] if result.data else {}
    except Exception as e:
        print(f"Error creating patient: {str(e)}")
        raise


def update_patient(patient_id: str, updates: dict) -> dict:
    """Update patient data."""
    client = get_supabase()
    result = client.table("patients").update(updates).eq("id", patient_id).execute()
    return result.data[0] if result.data else {}



def find_patient_duplicate(email: str = None, phone: str = None, name: str = None) -> Optional[dict]:
    """Find patient by email, phone, or name (simple match)."""
    client = get_supabase()
    
    # 1. Try Email
    if email:
        res = client.table("patients").select("*").eq("email", email).execute()
        if res.data:
            return res.data[0]
            
    # 2. Try Phone
    if phone:
        res = client.table("patients").select("*").eq("phone", phone).execute()
        if res.data:
            return res.data[0]

    return None


def delete_patient(patient_id: str) -> bool:
    """Delete a patient and all related data (CASCADE handles child tables)."""
    client = get_supabase()
    result = client.table("patients").delete().eq("id", patient_id).execute()
    return bool(result.data)


def delete_appointment_retain(appointment_id: str) -> bool:
    """
    Delete an appointment but retain its booking data as a clinical dump entry
    in the patient's file. Documents are kept.
    """
    client = get_supabase()

    # 1. Fetch appointment details
    appt = (
        client.table("appointments")
        .select("*, patients(name)")
        .eq("id", appointment_id)
        .execute()
    )
    if not appt.data:
        return False
    appt_data = appt.data[0]
    patient_id = appt_data["patient_id"]

    # 2. Gather data to retain
    retained_parts = [f"## Retained Booking History (Appointment {appointment_id})"]
    retained_parts.append(f"- **Patient**: {appt_data.get('patients', {}).get('name', 'Unknown')}")
    retained_parts.append(f"- **Scheduled**: {appt_data.get('start_time', 'N/A')}")
    retained_parts.append(f"- **Reason**: {appt_data.get('reason', 'N/A')}")
    retained_parts.append(f"- **Status**: {appt_data.get('status', 'N/A')}")

    # Gather clinical dumps for this appointment
    dumps = (
        client.table("clinical_dumps")
        .select("combined_dump, manual_notes, transcript_text")
        .eq("appointment_id", appointment_id)
        .execute()
    ).data or []
    if dumps:
        retained_parts.append("\n### Clinical Notes")
        for d in dumps:
            text = d.get("combined_dump") or d.get("manual_notes") or d.get("transcript_text") or ""
            if text.strip():
                retained_parts.append(text.strip())

    # Gather AI intake summary
    intake = (
        client.table("ai_intake_summaries")
        .select("summary_text")
        .eq("appointment_id", appointment_id)
        .execute()
    ).data or []
    if intake and intake[0].get("summary_text"):
        retained_parts.append(f"\n### AI Intake Summary\n{intake[0]['summary_text']}")

    # 3. Create a clinical dump entry with the retained data
    import uuid
    from datetime import datetime as _dt
    dump_id = f"dump-{uuid.uuid4()}"
    client.table("clinical_dumps").insert({
        "id": dump_id,
        "patient_id": patient_id,
        "manual_notes": "\n".join(retained_parts),
        "combined_dump": "\n".join(retained_parts),
        "created_at": _dt.now().isoformat(),
    }).execute()

    # 4. Delete appointment-linked data (but NOT documents)
    client.table("clinical_dumps").delete().eq("appointment_id", appointment_id).execute()
    client.table("ai_intake_summaries").delete().eq("appointment_id", appointment_id).execute()
    client.table("differential_diagnoses").delete().eq("appointment_id", appointment_id).execute()
    client.table("intake_tokens").delete().eq("appointment_id", appointment_id).execute()

    # 5. Delete the appointment itself
    client.table("appointments").delete().eq("id", appointment_id).execute()
    return True


def delete_appointment_purge(appointment_id: str) -> bool:
    """
    Delete an appointment and ALL related data including documents
    uploaded during this appointment.
    """
    client = get_supabase()

    # 1. Get appointment to find patient_id
    appt = client.table("appointments").select("patient_id").eq("id", appointment_id).execute()
    if not appt.data:
        return False

    # 2. Delete all appointment-linked records
    client.table("clinical_dumps").delete().eq("appointment_id", appointment_id).execute()
    client.table("ai_intake_summaries").delete().eq("appointment_id", appointment_id).execute()
    client.table("differential_diagnoses").delete().eq("appointment_id", appointment_id).execute()
    client.table("intake_tokens").delete().eq("appointment_id", appointment_id).execute()

    # 3. Delete the appointment (CASCADE will handle anything else)
    client.table("appointments").delete().eq("id", appointment_id).execute()
    return True


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


def find_existing_appointment(patient_id: str, start_time: str) -> Optional[dict]:
    """Check if an appointment already exists for this patient at this time."""
    client = get_supabase()
    result = (
        client.table("appointments")
        .select("*")
        .eq("patient_id", patient_id)
        .eq("start_time", start_time)
        .execute()
    )
    return result.data[0] if result.data else None


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


def get_appointment_with_details(appointment_id: str) -> Optional[dict]:
    """Fetch a single appointment with patient info."""
    client = get_supabase()
    result = (
        client.table("appointments")
        .select("*, patients(*)")
        .eq("id", appointment_id)
        .execute()
    )
    return result.data[0] if result.data else None


def get_appointments_summary_for_patient(patient_id: str) -> list[dict]:
    """Fetch minimal appointment info for patient page list (id, start_time, status, reason)."""
    client = get_supabase()
    result = (
        client.table("appointments")
        .select("id, start_time, status, reason")
        .eq("patient_id", patient_id)
        .order("start_time", desc=True)
        .execute()
    )
    return result.data or []


def get_ai_intake_summary_for_appointment(appointment_id: str) -> Optional[dict]:
    """Fetch AI intake summary for a specific appointment."""
    client = get_supabase()
    result = (
        client.table("ai_intake_summaries")
        .select("*")
        .eq("appointment_id", appointment_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def get_differential_diagnosis_for_appointment(appointment_id: str) -> list[dict]:
    """Fetch differential diagnoses for a specific appointment."""
    client = get_supabase()
    result = (
        client.table("differential_diagnoses")
        .select("*")
        .eq("appointment_id", appointment_id)
        .order("match_pct", desc=True)
        .execute()
    )
    return result.data or []


def get_clinical_dumps_for_appointment(appointment_id: str) -> list[dict]:
    """Fetch clinical dumps for a specific appointment."""
    client = get_supabase()
    result = (
        client.table("clinical_dumps")
        .select("*")
        .eq("appointment_id", appointment_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


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


def save_differential_diagnoses(patient_id: str, diagnoses: list[dict], appointment_id: str | None = None) -> bool:
    """Save new differential diagnoses, replacing old ones."""
    client = get_supabase()
    
    # 1. Delete existing for patient (and appointment if specified)
    if appointment_id:
        client.table("differential_diagnoses").delete().eq("appointment_id", appointment_id).execute()
    client.table("differential_diagnoses").delete().eq("patient_id", patient_id).execute()
    
    # 2. Insert new
    if not diagnoses:
        return True

    # Ensure patient_id and appointment_id are set
    for d in diagnoses:
        d["patient_id"] = patient_id
        if appointment_id:
            d["appointment_id"] = appointment_id
        
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


# --- Clinical Dumps Operations ---

def create_clinical_dump(data: dict) -> dict:
    """Create a new clinical dump record."""
    client = get_supabase()
    result = client.table("clinical_dumps").insert(data).execute()
    return result.data[0] if result.data else {}


def update_clinical_dump(dump_id: str, updates: dict) -> dict:
    """Update a clinical dump by ID."""
    client = get_supabase()
    result = (
        client.table("clinical_dumps")
        .update(updates)
        .eq("id", dump_id)
        .execute()
    )
    return result.data[0] if result.data else {}


def get_clinical_dumps_for_patient(patient_id: str) -> list[dict]:
    """Fetch clinical dumps for a patient, most recent first."""
    client = get_supabase()
    result = (
        client.table("clinical_dumps")
        .select("*")
        .eq("patient_id", patient_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def get_clinical_dump(dump_id: str) -> Optional[dict]:
    """Fetch a single clinical dump by ID."""
    client = get_supabase()
    result = (
        client.table("clinical_dumps")
        .select("*")
        .eq("id", dump_id)
        .execute()
    )
    return result.data[0] if result.data else None


# --- Auth Operations ---

def verify_login(username: str, password_plain: str) -> bool:
    """
    Verify login credentials.
    WARNING: Currently checking plain text password as requested for MVP.
    """
    client = get_supabase()
    # Check if user exists with matching username and password
    result = (
        client.table("users")
        .select("id")
        .eq("username", username)
        .eq("password_hash", password_plain)  # Using the column we created
        .execute()
    )
    return bool(result.data)


# --- Intake Request (Token) Operations ---

def create_intake_token(data: dict) -> dict:
    """Create a new intake token."""
    client = get_supabase()
    result = client.table("intake_tokens").insert(data).execute()
    return result.data[0] if result.data else {}


def get_intake_token(token: str) -> Optional[dict]:
    """Fetch intake token details."""
    client = get_supabase()
    result = (
        client.table("intake_tokens")
        .select("*, patients(*), appointments(*)")
        .eq("token", token)
        .execute()
    )
    return result.data[0] if result.data else None


def update_intake_token(token: str, updates: dict) -> dict:
    """Update intake token."""
    client = get_supabase()
    result = (
        client.table("intake_tokens")
        .update(updates)
        .eq("token", token)
        .execute()
    )
    return result.data[0] if result.data else {}

