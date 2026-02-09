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
    search_patients,
)

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """You are Dr. Prerna's AI voice assistant for Parchi.ai, a medical records system for an Indian clinic.

You help the doctor by answering questions about patients, appointments, and medical records using the tools available to you.

Rules:
1. Be concise — this is voice output.
2. When asked about patients or appointments, use the provided tools to look up data. Do NOT guess.
3. Summarize results clearly. For patient lists, mention key details (name, age, conditions).
4. If a tool returns no data, say so honestly.
5. Protect patient privacy — only share information with the doctor.
6. For medical queries, note that you're providing information from records, not medical advice.
"""

# Tool function declarations for Gemini
TOOL_DECLARATIONS = [
    types.FunctionDeclaration(
        name="search_patients",
        description="Search for patients by name, condition, or medication. Use this when the doctor asks about a specific patient or group of patients.",
        parameters=types.Schema(
            type=types.Type.OBJECT,
            properties={
                "query": types.Schema(
                    type=types.Type.STRING,
                    description="Search query — patient name, condition, or medication",
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


def _tool_search_patients(query: str):
    """Search patients and return summarized results."""
    results = search_patients(query)
    if not results:
        return f"No patients found matching '{query}'."
    summaries = []
    for r in results:
        summaries.append(f"{r['patient_name']} (ID: {r['patient_id']}): {', '.join(r.get('matched_snippets', []))}")
    return "\n".join(summaries)


def _tool_get_patient_details(patient_id: str):
    """Get full patient details."""
    patient = get_patient(patient_id)
    if not patient:
        return f"No patient found with ID {patient_id}."
    return json.dumps({
        "name": patient.get("name"),
        "age": patient.get("age"),
        "gender": patient.get("gender"),
        "conditions": patient.get("conditions", []),
        "medications": patient.get("medications", []),
        "allergies": patient.get("allergies", []),
        "vitals": patient.get("vitals", {}),
    }, indent=2)


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
        meds = p.get("medications", [])
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
        conditions = ", ".join(p.get("conditions", [])) or "None"
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
