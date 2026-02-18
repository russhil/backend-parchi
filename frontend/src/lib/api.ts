export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

// Extract clinic_id and doctor_id from JWT payload for header-based scoping
function getTokenClaims(): { clinic_id?: string; doctor_id?: string } {
  const token = getCookie("auth_token");
  if (!token) return {};
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return { clinic_id: payload.clinic_id, doctor_id: payload.doctor_id };
  } catch {
    return {};
  }
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getCookie("auth_token");
  const claims = getTokenClaims();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    // Always send clinic/doctor scoping headers for backend isolation
    ...(claims.clinic_id ? { "X-Clinic-Id": claims.clinic_id } : {}),
    ...(claims.doctor_id ? { "X-Doctor-Id": claims.doctor_id } : {}),
    ...options?.headers as Record<string, string>
  };

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });
  if (res.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.includes("/login")) {
      window.location.href = "/login";
    }
  }
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

// --- Patient APIs ---

export async function getPatients() {
  return fetchJSON<{ patients: import("@/types").Patient[] }>("/patients");
}

export async function getPatient(id: string) {
  return fetchJSON<import("@/types").PatientPageData>(`/patient/${id}`);
}

export async function search(query: string) {
  return fetchJSON<{ results: import("@/types").SearchResult[] }>("/search", {
    method: "POST",
    body: JSON.stringify({ query }),
  });
}

export async function simpleSearchPatients(query: string) {
  return fetchJSON<{ results: { patient_id: string; patient_name: string; phone: string }[] }>(
    `/patients/search-simple?q=${encodeURIComponent(query)}`
  );
}

export async function createSetupIntake(data: {
  name: string;
  phone: string;
  appointment_time: string;
  patient_id?: string;
}) {
  return fetchJSON<{ success: boolean; link: string; token: string }>("/setup-intake/create", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getIntakeToken(token: string) {
  return fetchJSON<any>(`/intake/token/${token}`);
}



export async function verifyIntakePhone(token: string, userJsonUrl: string) {
  return fetchJSON<{ success: boolean }>("/intake/token/verify-phone", {
    method: "POST",
    body: JSON.stringify({ token, user_json_url: userJsonUrl }),
  });
}

export async function submitIntakeToken(data: any) {
  return fetchJSON<{ success: boolean }>("/intake/token/submit", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export interface CreatePatientData {
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  height_cm?: number;
  weight_kg?: number;
  conditions?: string[];
  medications?: string[];
  allergies?: string[];
  vitals?: {
    bp_systolic?: number;
    bp_diastolic?: number;
    spo2?: number;
    heart_rate?: number;
    temperature_f?: number;
  };
}

export async function createPatient(data: CreatePatientData) {
  return fetchJSON<{ patient: import("@/types").Patient }>("/patients", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deletePatient(patientId: string) {
  return fetchJSON<{ success: boolean; message: string }>(`/patients/${patientId}`, {
    method: "DELETE",
  });
}

// --- Appointment APIs ---

export async function getAppointments() {
  return fetchJSON<{ appointments: import("@/types").Appointment[] }>("/appointments");
}

export async function getTodaysAppointments() {
  return fetchJSON<{ appointments: import("@/types").Appointment[] }>("/appointments/today");
}

export async function createAppointment(data: {
  patient_id: string;
  start_time: string;
  reason: string;
  status?: string;
}) {
  return fetchJSON<{ appointment: import("@/types").Appointment }>("/appointments", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function markPatientSeen(appointmentId: string) {
  return fetchJSON<{ success: boolean; appointment: import("@/types").Appointment }>(
    "/appointments/mark-seen",
    {
      method: "POST",
      body: JSON.stringify({ appointment_id: appointmentId }),
    }
  );
}

export async function deleteAppointment(appointmentId: string, retain: boolean = false) {
  return fetchJSON<{ success: boolean; retained: boolean; message: string }>(
    `/appointments/${appointmentId}?retain=${retain}`,
    { method: "DELETE" }
  );
}

// --- Appointment Page APIs ---

export async function getAppointment(appointmentId: string) {
  return fetchJSON<import("@/types").AppointmentPageData>(`/appointment/${appointmentId}`);
}

export async function startAppointment(appointmentId: string) {
  return fetchJSON<{ success: boolean; appointment: import("@/types").Appointment }>(
    `/appointment/${appointmentId}/start`,
    { method: "POST" }
  );
}

export async function completeAppointment(appointmentId: string) {
  return fetchJSON<{ success: boolean; appointment: import("@/types").Appointment }>(
    `/appointment/${appointmentId}/complete`,
    { method: "POST" }
  );
}

// --- Consult APIs ---

export async function startConsult(patientId: string) {
  return fetchJSON<{ consult_session_id: string }>("/consult/start", {
    method: "POST",
    body: JSON.stringify({ patient_id: patientId }),
  });
}

export async function stopConsult(sessionId: string, transcriptText: string) {
  return fetchJSON<{
    session_id: string;
    transcript: string;
    soap: import("@/types").SOAPNote;
    insights: import("@/types").ConsultInsights;
  }>(`/consult/${sessionId}/stop`, {
    method: "POST",
    body: JSON.stringify({ transcript_text: transcriptText }),
  });
}

export async function transcribeConsultAudio(sessionId: string, audioBlob: Blob) {
  const formData = new FormData();
  const ext = audioBlob.type.includes("mp4") ? "mp4" : "webm";
  formData.append("file", audioBlob, `recording.${ext}`);

  const token = getCookie("auth_token");
  const claims = getTokenClaims();
  const headers: Record<string, string> = {
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(claims.clinic_id ? { "X-Clinic-Id": claims.clinic_id } : {}),
    ...(claims.doctor_id ? { "X-Doctor-Id": claims.doctor_id } : {}),
  };

  const res = await fetch(`${API_BASE}/consult/${sessionId}/transcribe`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<{
    session_id: string;
    transcript: string;
    soap: import("@/types").SOAPNote;
    insights: import("@/types").ConsultInsights;
  }>;
}

// --- Chat API ---

export async function chat(
  patientId: string,
  message: string,
  history: import("@/types").ChatMessage[]
) {
  return fetchJSON<{ reply: string }>("/chat", {
    method: "POST",
    body: JSON.stringify({ patient_id: patientId, message, history }),
  });
}

export async function getChatSuggestions(patientId: string) {
  return fetchJSON<{ suggestions: string[] }>(`/ai/chat-suggestions/${patientId}`);
}

// --- Prescription APIs ---

export interface PrescriptionMedication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export async function createPrescription(data: {
  patient_id: string;
  medications: PrescriptionMedication[];
  diagnosis?: string;
  notes?: string;
}) {
  return fetchJSON<{ prescription: Record<string, unknown> }>("/prescriptions", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getPrescriptions(patientId: string) {
  return fetchJSON<{ prescriptions: Record<string, unknown>[] }>(`/prescriptions/${patientId}`);
}

// --- Note APIs ---

export async function createNote(data: {
  patient_id: string;
  content: string;
  note_type?: string;
}) {
  return fetchJSON<{ note: Record<string, unknown> }>("/notes", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getNotes(patientId: string) {
  return fetchJSON<{ notes: Record<string, unknown>[] }>(`/notes/${patientId}`);
}

// --- Document APIs ---

export async function uploadDocument(
  patientId: string,
  title: string,
  docType: string,
  file: File
) {
  const formData = new FormData();
  formData.append("file", file);

  const token = getCookie("auth_token");
  const claims = getTokenClaims();
  const headers: Record<string, string> = {
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(claims.clinic_id ? { "X-Clinic-Id": claims.clinic_id } : {}),
    ...(claims.doctor_id ? { "X-Doctor-Id": claims.doctor_id } : {}),
  };

  const res = await fetch(
    `${API_BASE}/documents/upload?patient_id=${encodeURIComponent(patientId)}&title=${encodeURIComponent(title)}&doc_type=${encodeURIComponent(docType)}`,
    {
      method: "POST",
      headers,
      body: formData,
    }
  );

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

// --- Clinical Dump APIs ---

export async function saveConsultDump(
  sessionId: string,
  dumpId: string,
  manualNotes: string = "",
  appointmentId?: string,
  analyze: boolean = true
) {
  return fetchJSON<{
    dump_id: string;
    combined_dump: string;
    insights?: import("@/types").ConsultInsights;
  }>(`/consult/${sessionId}/save-dump`, {
    method: "POST",
    body: JSON.stringify({
      dump_id: dumpId,
      manual_notes: manualNotes,
      appointment_id: appointmentId,
      analyze,
    }),
  });
}

export async function getPatientClinicalDumps(patientId: string) {
  return fetchJSON<{ clinical_dumps: import("@/types").ClinicalDump[] }>(
    `/clinical-dumps/${patientId}`
  );
}

// --- AI Summary Generation (SSE) ---

export function generateAISummaryURL(patientId: string): string {
  return `${API_BASE}/ai/generate-summary/${patientId}`;
}

// --- Parchi Upload APIs ---

export interface ParchiEntry {
  name: string;
  phone: string;
  appointment_time: string;
  date?: string;
  time?: string;
}

export interface ParchiUploadResponse {
  success: boolean;
  raw_text: string;
  entries: ParchiEntry[];
  count: number;
}

export interface ParchiProcessResult {
  name: string;
  phone: string;
  appointment_time: string;
  is_new_patient: boolean;
  is_duplicate: boolean;
  patient_id: string | null;
  appointment_id: string | null;
  intake_link: string | null;
  whatsapp_sent: boolean;
  whatsapp_error: string | null;
  error: string | null;
}

export interface ParchiProcessResponse {
  success: boolean;
  results: ParchiProcessResult[];
  summary: {
    total: number;
    processed: number;
    duplicates: number;
    whatsapp_sent: number;
    errors: number;
  };
}

export async function uploadParchi(file: File): Promise<ParchiUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const token = getCookie("auth_token");
  const claims = getTokenClaims();
  const headers: Record<string, string> = {
    ...(token ? { "Authorization": `Bearer ${token}` } : {}),
    ...(claims.clinic_id ? { "X-Clinic-Id": claims.clinic_id } : {}),
    ...(claims.doctor_id ? { "X-Doctor-Id": claims.doctor_id } : {}),
  };

  const res = await fetch(`${API_BASE}/parchi/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `API error: ${res.status}`);
  }

  return res.json();
}

export async function processParchi(
  entries: { name: string; phone: string; appointment_time: string }[]
): Promise<ParchiProcessResponse> {
  return fetchJSON<ParchiProcessResponse>("/parchi/process", {
    method: "POST",
    body: JSON.stringify({ entries }),
  });
}
