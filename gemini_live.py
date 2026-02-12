"""
Gemini Live API Module for Parchi.ai
Uses google-genai SDK with Vertex AI for real-time voice chat.
"""

import asyncio
import inspect
import json
import logging
import os

from google import genai
from google.genai import types

from database import (
    get_all_patients,
    get_patient,
    get_todays_appointments,
    get_visits_for_patient,
    get_documents_for_patient,
    get_prescriptions_for_patient,
    get_clinical_dumps_for_patient,
    get_ai_intake_summary,
    get_differential_diagnosis,
    get_report_insights,
    get_notes_for_patient,
    get_consults_for_patient,
)

from llm_provider import get_llm

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """You are YC's AI voice assistant for Parchi.ai, a medical records system for an Indian clinic.

You help the doctor by answering questions about patients, appointments, and medical records using the tools available to you.

## Available Data (Schematic Overview):
You have access to the following patient records via the `get_patient_details` tool:
1. **Demographics**: Name, age, gender, contact info.
2. **Medical Profile**: Conditions, medications, allergies, vitals.
3. **Clinical Dumps**: Raw transcripts and notes from previous consultations (Table: `clinical_dumps`).
4. **Consult Sessions**: Structured consultation records (Table: `consult_sessions`).
5. **AI Intake Summaries**: AI-generated summaries of patient intake (Table: `ai_intake_summaries`).
6. **Differential Diagnoses**: AI-suggested potential diagnoses (Table: `differential_diagnoses`).
7. **Report Insights**: Key insights from uploaded medical reports (Table: `report_insights`).
8. **Notes**: Manual notes added by doctors (Table: `notes`).
9. **Visits**: Past visit history (Table: `visits`).
10. **Documents**: Uploaded lab reports and files (Table: `documents`).
11. **Prescriptions**: Past prescriptions (Table: `prescriptions`).

## Rules:
1. Be concise — this is voice output.
2. When asked about patients or appointments, use the provided tools to look up data. Do NOT guess.
3. The `get_patient_details` tool returns a Comprehensive Patient Record containing ALL the above data.
4. Summarize results clearly. For patient lists, mention key details (name, age, conditions).
5. If a tool returns no data, say so honestly.
6. Protect patient privacy — only share information with the doctor.
7. For medical queries, note that your suggestions are based on records, not medical advice.
"""

# Tool function declarations for Gemini
TOOL_DECLARATIONS = [
    types.FunctionDeclaration(
        name="search_patients",
        description="Smart AI Search. Use this to find patients by symptoms, complex queries, or inferred conditions (e.g. 'patients with heart issues', 'who has a fish allergy'). Searches across ALL records including notes and reports.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "query": types.Schema(
                    type=types.Type.STRING,
                    description="The search query.",
                ),
            },
            required=["query"],
        ),
    ),
    types.FunctionDeclaration(
        name="get_patient_details",
        description="Get complete details for a specific patient by their ID. Use after finding a patient via search.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "patient_id": types.Schema(
                    type=types.Type.STRING,
                    description="The patient ID (e.g. 'p-001')",
                ),
            },
            required=["patient_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="get_todays_appointments",
        description="Get today's appointment schedule. Use when the doctor asks about today's patients or schedule.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={},
        ),
    ),
    types.FunctionDeclaration(
        name="get_patient_visits",
        description="Get visit history for a specific patient.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "patient_id": types.Schema(
                    type=types.Type.STRING,
                    description="The patient ID",
                ),
            },
            required=["patient_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="get_patient_documents",
        description="Get documents (lab reports, imaging) for a specific patient.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "patient_id": types.Schema(
                    type=types.Type.STRING,
                    description="The patient ID",
                ),
            },
            required=["patient_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="get_patient_prescriptions",
        description="Get prescription history for a specific patient.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "patient_id": types.Schema(
                    type=types.Type.STRING,
                    description="The patient ID",
                ),
            },
            required=["patient_id"],
        ),
    ),
    types.FunctionDeclaration(
        name="get_all_patients",
        description="Get a list of all patients in the clinic. Use when the doctor asks for a full patient list.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={},
        ),
    ),
]


def _safe_list_to_string(value) -> str:
    """Safely convert a list (or other type) to a comma-separated string."""
    if value is None:
        return "None"
    if isinstance(value, str):
        return value
    if isinstance(value, (list, tuple)):
        return ", ".join(str(v) for v in value if v)
    return str(value)


def _build_search_context_sync(query: str) -> str:
    """
    Build comprehensive search context matching the Smart Search approach.
    Uses batch queries (not per-patient) to stay fast enough for Gemini Live.
    Fetches all patients with visits, documents, and appointments so the AI
    can do semantic matching (e.g. 'heart issues' -> 'cardiac').
    """
    from database import get_supabase

    client = get_supabase()

    all_patients = get_all_patients()
    if not all_patients:
        return ""

    # Batch-fetch all related data in a few queries (not per-patient)
    all_appointments = (
        client.table("appointments")
        .select("patient_id, start_time, reason, status")
        .execute().data or []
    )
    all_visits = (
        client.table("visits")
        .select("patient_id, summary_ai")
        .order("visit_time", desc=True)
        .execute().data or []
    )
    all_docs = (
        client.table("documents")
        .select("patient_id, title")
        .execute().data or []
    )

    # Build maps keyed by patient_id
    appt_map: dict[str, list[str]] = {}
    for appt in all_appointments:
        pid = appt.get("patient_id")
        if not pid:
            continue
        if pid not in appt_map:
            appt_map[pid] = []
        try:
            date_str = (appt.get("start_time") or "").split("T")[0]
        except Exception:
            date_str = "?"
        reason = appt.get("reason") or "No reason"
        status = appt.get("status") or "unknown"
        appt_map[pid].append(f"{date_str}: {reason} ({status})")

    # First visit per patient (already ordered desc)
    visit_map: dict[str, str] = {}
    for v in all_visits:
        pid = v.get("patient_id")
        if pid and pid not in visit_map:
            visit_map[pid] = (v.get("summary_ai") or "")[:200]

    doc_map: dict[str, list[str]] = {}
    for d in all_docs:
        pid = d.get("patient_id")
        if not pid:
            continue
        if pid not in doc_map:
            doc_map[pid] = []
        doc_map[pid].append(d.get("title") or "Untitled")

    # Build summaries
    patient_summaries = []
    for p in all_patients:
        pid = p["id"]
        p_name = p.get("name") or "Unknown"
        p_appts = appt_map.get(pid, [])
        recent_appts = " | ".join(p_appts[:3]) if p_appts else "No recent appointments"
        last_visit = visit_map.get(pid, "No visits")
        doc_titles = ", ".join(doc_map.get(pid, [])[:3])

        context = (
            f"ID: {pid}\n"
            f"Name: {p_name}\n"
            f"Age: {p.get('age', '?')}, Gender: {p.get('gender', '?')}\n"
            f"Conditions: {_safe_list_to_string(p.get('conditions'))}\n"
            f"Meds: {_safe_list_to_string(p.get('medications'))}\n"
            f"Allergies: {_safe_list_to_string(p.get('allergies'))}\n"
            f"Recent Appts: {recent_appts}\n"
            f"Last Visit: {last_visit}\n"
            f"Documents: {doc_titles}\n"
            "---"
        )
        patient_summaries.append(context)

    return "\n".join(patient_summaries[:20])


async def _tool_search_patients(query: str):
    """Smart AI Search for patients — single LLM call for speed."""
    try:
        # 1. Build context in a thread (batch DB queries, fast)
        full_context_str = await asyncio.to_thread(_build_search_context_sync, query)

        if not full_context_str:
            return "No patients found in the database."

        # 2. Single LLM call: pick candidates AND explain why (no second round-trip)
        prompt = (
            f"You are a medical search assistant.\n"
            f"Find patients relevant to: \"{query}\"\n\n"
            f"Patients:\n{full_context_str}\n\n"
            f"Return ONLY matching patients, one per line, format:\n"
            f"Name (ID: <id>): <one-sentence reason>\n"
            f"If none match, say \"No matches found.\""
        )

        llm = get_llm()
        if not llm:
            return "Search unavailable: AI not configured."

        result = await asyncio.wait_for(
            llm.generate_async(prompt, max_tokens=400),
            timeout=15.0,
        )
        return result.strip() if result else f"No patients found matching '{query}'."

    except asyncio.TimeoutError:
        logger.warning("search_patients timed out for query: %s", query)
        return "Search took too long. Try a more specific query."
    except Exception as e:
        logger.error("search_patients error: %s", e, exc_info=True)
        return f"Search error: {e}"


def _tool_get_patient_details(patient_id: str):
    """Get full patient details including recent clinical dumps."""
    patient = get_patient(patient_id)
    if not patient:
        return f"No patient found with ID {patient_id}."
    result = {
        "name": patient.get("name"),
        "age": patient.get("age"),
        "gender": patient.get("gender"),
        "conditions": patient.get("conditions") or [],
        "medications": patient.get("medications") or [],
        "allergies": patient.get("allergies") or [],
        "vitals": patient.get("vitals", {}),
    }
    # Fetch detailed data from all tables
    
    # 1. Clinical Dumps
    dumps = get_clinical_dumps_for_patient(patient_id)
    dump_summaries = []
    if dumps:
        for d in dumps[:5]:  # Last 5
            text = d.get("combined_dump") or d.get("transcript_text") or ""
            dump_summaries.append({
                "date": d.get("created_at"),
                "summary": text[:500] + "..." if len(text) > 500 else text
            })
    result["clinical_dumps"] = dump_summaries

    # 2. AI Intake Summaries
    intake = get_ai_intake_summary(patient_id)
    result["ai_intake_summary"] = (intake.get("summary_text") or "") if intake else ""

    # 3. Differential Diagnoses
    diffs = get_differential_diagnosis(patient_id)
    result["differential_diagnoses"] = [
        f"{d.get('condition_name')} ({d.get('match_pct')}%) - {d.get('rationale')}" 
        for d in diffs
    ] if diffs else []

    # 4. Report Insights
    report_insight = get_report_insights(patient_id)
    result["latest_report_insight"] = (report_insight.get("insight_text") or "") if report_insight else ""

    # 5. Manual Notes
    notes = get_notes_for_patient(patient_id)
    result["doctor_notes"] = [
        f"{n.get('created_at')}: {n.get('content')}" 
        for n in notes[:5]
    ] if notes else []

    # 6. Consult Sessions
    consults = get_consults_for_patient(patient_id)
    result["recent_consults"] = [
        f"{c.get('started_at')}: {(c.get('transcript_text') or '')[:200]}..." 
        for c in consults[:3]
    ] if consults else []

    return json.dumps(result, indent=2, default=str)


def _tool_get_todays_appointments():
    """Get today's appointments."""
    appointments = get_todays_appointments()
    if not appointments:
        return "No appointments scheduled for today."
    lines = []
    for appt in appointments:
        p_name = appt.get("patients", {}).get("name", "Unknown") if appt.get("patients") else "Unknown"
        lines.append(f"{appt.get('start_time', 'Unknown')}: {p_name} — {appt.get('reason', 'No reason')} ({appt.get('status', 'unknown')})")
    return "\n".join(lines)


def _tool_get_patient_visits(patient_id: str):
    """Get visit history."""
    visits = get_visits_for_patient(patient_id)
    if not visits:
        return f"No visits found for patient {patient_id}."
    lines = []
    for v in visits[:10]:
        lines.append(f"{v.get('visit_time', 'Unknown')}: {v.get('summary_ai', v.get('doctor_notes_text', 'No notes'))[:200]}")
    return "\n".join(lines)


def _tool_get_patient_documents(patient_id: str):
    """Get patient documents."""
    docs = get_documents_for_patient(patient_id)
    if not docs:
        return f"No documents found for patient {patient_id}."
    lines = []
    for d in docs[:10]:
        lines.append(f"{d.get('title', 'Untitled')} ({d.get('doc_type', 'document')}): {d.get('extracted_text', '')[:200]}")
    return "\n".join(lines)


def _tool_get_patient_prescriptions(patient_id: str):
    """Get patient prescriptions."""
    prescriptions = get_prescriptions_for_patient(patient_id)
    if not prescriptions:
        return f"No prescriptions found for patient {patient_id}."
    lines = []
    for p in prescriptions[:10]:
        meds = p.get("medications") or []
        med_names = ", ".join(m.get("name", "?") for m in meds) if isinstance(meds, list) else str(meds)
        lines.append(f"{p.get('created_at', 'Unknown')}: {med_names} — {p.get('diagnosis', 'N/A')}")
    return "\n".join(lines)


def _tool_get_all_patients():
    """Get all patients summary."""
    patients = get_all_patients()
    if not patients:
        return "No patients in the system."
    lines = []
    for p in patients:
        conds = p.get("conditions")
        conditions = ", ".join(str(c) for c in conds) if isinstance(conds, list) else str(conds)
        lines.append(f"{p['name']} (ID: {p['id']}, Age: {p.get('age', '?')}): {conditions}")
    return "\n".join(lines)


TOOL_MAPPING = {
    "search_patients": _tool_search_patients,
    "get_patient_details": _tool_get_patient_details,
    "get_todays_appointments": _tool_get_todays_appointments,
    "get_patient_visits": _tool_get_patient_visits,
    "get_patient_documents": _tool_get_patient_documents,
    "get_patient_prescriptions": _tool_get_patient_prescriptions,
    "get_all_patients": _tool_get_all_patients,
}


class GeminiLive:
    """Handles the interaction with the Gemini Live API via google-genai SDK."""

    def __init__(self, project_id=None, location=None, model=None, input_sample_rate=16000, tools=None, tool_mapping=None, api_key=None):
        self.project_id = project_id
        self.location = location
        self.model = model
        self.input_sample_rate = input_sample_rate
        self.tools = tools or []
        self.tool_mapping = tool_mapping or {}

        # Prefer API key auth over Vertex AI
        if api_key:
            logger.info("GeminiLive: Using API key auth")
            self.client = genai.Client(api_key=api_key)
            self.auth_mode = "api_key"
        else:
            logger.info("GeminiLive: Using Vertex AI auth (project=%s, location=%s)", project_id, location)
            self.client = genai.Client(vertexai=True, project=project_id, location=location)
            self.auth_mode = "vertex_ai"

    async def start_session(self, audio_input_queue, text_input_queue, audio_output_callback):
        config = types.LiveConnectConfig(
            response_modalities=[types.Modality.AUDIO],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Aoede")
                )
            ),
            system_instruction=types.Content(parts=[types.Part(text=SYSTEM_INSTRUCTION)]),
            input_audio_transcription=types.AudioTranscriptionConfig(),
            output_audio_transcription=types.AudioTranscriptionConfig(),
            tools=self.tools,
        )

        logger.info("GeminiLive: Connecting to model=%s (auth=%s)...", self.model, self.auth_mode)
        async with self.client.aio.live.connect(model=self.model, config=config) as session:
            logger.info("GeminiLive: Session established successfully")
            event_queue = asyncio.Queue()

            async def send_audio():
                try:
                    while True:
                        chunk = await audio_input_queue.get()
                        await session.send_realtime_input(
                            audio=types.Blob(data=chunk, mime_type=f"audio/pcm;rate={self.input_sample_rate}")
                        )
                except asyncio.CancelledError:
                    pass

            async def send_text():
                try:
                    while True:
                        text = await text_input_queue.get()
                        await session.send(input=text, end_of_turn=True)
                except asyncio.CancelledError:
                    pass

            async def receive_loop():
                try:
                    while True:
                        async for response in session.receive():
                            server_content = response.server_content
                            tool_call = response.tool_call

                            if server_content:
                                if server_content.model_turn:
                                    for part in server_content.model_turn.parts:
                                        if part.inline_data:
                                            if inspect.iscoroutinefunction(audio_output_callback):
                                                await audio_output_callback(part.inline_data.data)
                                            else:
                                                audio_output_callback(part.inline_data.data)

                                if server_content.input_transcription and server_content.input_transcription.text:
                                    await event_queue.put({"type": "user", "text": server_content.input_transcription.text})

                                if server_content.output_transcription and server_content.output_transcription.text:
                                    await event_queue.put({"type": "gemini", "text": server_content.output_transcription.text})

                                if server_content.turn_complete:
                                    await event_queue.put({"type": "turn_complete"})

                                if server_content.interrupted:
                                    await event_queue.put({"type": "interrupted"})

                            if tool_call:
                                function_responses = []
                                for fc in tool_call.function_calls:
                                    func_name = fc.name
                                    args = fc.args or {}

                                    if func_name in self.tool_mapping:
                                        try:
                                            tool_func = self.tool_mapping[func_name]
                                            if inspect.iscoroutinefunction(tool_func):
                                                result = await tool_func(**args)
                                            else:
                                                loop = asyncio.get_running_loop()
                                                result = await loop.run_in_executor(None, lambda: tool_func(**args))
                                        except Exception as e:
                                            result = f"Error: {e}"

                                        function_responses.append(types.FunctionResponse(
                                            name=func_name,
                                            id=fc.id,
                                            response={"result": result},
                                        ))
                                        await event_queue.put({"type": "tool_call", "name": func_name, "args": args})

                                await session.send_tool_response(function_responses=function_responses)

                except Exception as e:
                    logger.error("GeminiLive: receive_loop error: %s", e, exc_info=True)
                    await event_queue.put({"type": "error", "error": str(e)})
                finally:
                    await event_queue.put(None)

            send_audio_task = asyncio.create_task(send_audio())
            send_text_task = asyncio.create_task(send_text())
            receive_task = asyncio.create_task(receive_loop())

            try:
                while True:
                    event = await event_queue.get()
                    if event is None:
                        break
                    if isinstance(event, dict) and event.get("type") == "error":
                        yield event
                        break
                    yield event
            finally:
                send_audio_task.cancel()
                send_text_task.cancel()
                receive_task.cancel()
