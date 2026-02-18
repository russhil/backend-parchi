"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPatient, deletePatient } from "@/lib/api";
import type { PatientPageData, Document, Vitals } from "@/types";
import AskAIPanel from "@/components/patient/AskAIPanel";
import DocumentViewerModal from "@/components/documents/DocumentViewerModal";
import Link from "next/link";

export default function PatientPage() {
  const params = useParams();
  const patientId = params.id as string;
  const router = useRouter();
  const [data, setData] = useState<PatientPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewDoc, setViewDoc] = useState<Document | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeletePatient = async () => {
    setDeleting(true);
    try {
      await deletePatient(patientId);
      router.push("/patients");
    } catch {
      alert("Failed to delete patient");
      setDeleting(false);
    }
  };

  const loadPatient = useCallback(async () => {
    try {
      const result = await getPatient(patientId);
      setData(result);
    } catch {
      // Fallback will show error message
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadPatient();
  }, [loadPatient]);

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="flex h-full">
        <div className="w-72 border-r border-border-light bg-surface p-6 space-y-4 animate-pulse hidden lg:block">
          <div className="mx-auto w-20 h-20 rounded-full bg-skeleton" />
          <div className="h-4 bg-skeleton rounded w-2/3 mx-auto" />
          <div className="h-3 bg-skeleton rounded w-1/2 mx-auto" />
          <div className="space-y-2 mt-8">
            {[1, 2, 3].map(i => <div key={i} className="h-3 bg-skeleton rounded" />)}
          </div>
        </div>
        <div className="flex-1 p-6 space-y-4 animate-pulse">
          <div className="h-32 bg-skeleton rounded-xl" />
          <div className="h-24 bg-skeleton rounded-xl" />
          <div className="h-24 bg-skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <span className="material-symbols-outlined text-text-secondary text-[48px] mb-3 block">error</span>
          <p className="text-text-secondary">Could not load patient data. Is the backend running?</p>
          <p className="text-xs text-text-secondary mt-1">Run: cd backend && uvicorn main:app --reload</p>
        </div>
      </div>
    );
  }

  const { patient } = data;
  const appointments = data.appointments_summary || data.appointments || [];
  const vitals = patient.vitals || ({} as Vitals);
  const hasVitals = vitals.bp_systolic || vitals.spo2 || vitals.heart_rate || vitals.temperature_f;
  const hasConditions = Array.isArray(patient.conditions) && patient.conditions.filter(Boolean).length > 0;
  const hasMedications = Array.isArray(patient.medications) && patient.medications.filter(Boolean).length > 0;
  const hasAllergies = Array.isArray(patient.allergies) && patient.allergies.filter(Boolean).length > 0;
  const hasHeight = patient.height_cm != null && patient.height_cm > 0;
  const hasWeight = patient.weight_kg != null && patient.weight_kg > 0;
  const hasBody = hasHeight || hasWeight;
  const bmi = hasHeight && hasWeight
    ? (patient.weight_kg / ((patient.height_cm / 100) ** 2)).toFixed(1)
    : null;

  const hasSummary = data.ai_intake_summary && (
    data.ai_intake_summary.chief_complaint ||
    data.ai_intake_summary.onset ||
    data.ai_intake_summary.severity ||
    (data.ai_intake_summary.findings && data.ai_intake_summary.findings.length > 0)
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", label: "Completed" };
      case "in-progress":
        return { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", label: "In Progress" };
      case "cancelled":
        return { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", label: "Cancelled" };
      default:
        return { bg: "bg-primary-light", text: "text-primary", label: "Scheduled" };
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return isoString;
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">

      {/* ═══════════  LEFT SIDEBAR  ═══════════ */}
      <aside className="lg:w-72 lg:shrink-0 border-b lg:border-b-0 lg:border-r border-border-light bg-surface overflow-y-auto">
        <div className="p-6">
          {/* Avatar + name */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-3 w-20 h-20 rounded-full bg-primary-light border-4 border-surface shadow-sm flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {patient.name.split(" ").map(n => n[0]).join("")}
              </span>
            </div>
            <h2 className="text-lg font-bold text-text-primary">{patient.name}</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {patient.age ? `${patient.age} Yrs` : "Age N/A"} • {patient.gender || "N/A"} • ID: {patient.id.substring(0, 6).toUpperCase()}
            </p>
          </div>

          <div className="mt-7 space-y-6">
            {/* Conditions / Medical History */}
            {hasConditions && (
              <div>
                <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary">Medical History</h3>
                <div className="flex flex-wrap gap-1.5">
                  {patient.conditions.filter(Boolean).map(cond => (
                    <span key={cond} className="rounded-md bg-primary-light px-2 py-1 text-xs font-semibold text-primary">
                      {cond}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Allergies */}
            {hasAllergies && (
              <div>
                <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary">Allergies</h3>
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergies.filter(Boolean).map(allergy => (
                    <span key={allergy} className="flex items-center gap-1 rounded-md bg-red-50 dark:bg-red-950/30 px-2 py-1 text-xs font-semibold text-red-600 dark:text-red-400">
                      <span className="material-symbols-outlined text-[14px]">warning</span>
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Medications */}
            {hasMedications && (
              <div>
                <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-text-secondary">Current Medications</h3>
                <div className="space-y-2">
                  {patient.medications.filter(Boolean).map(med => (
                    <div key={med} className="flex items-start gap-2.5 rounded-lg border border-border-light bg-bg p-2.5">
                      <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">medication</span>
                      <span className="text-sm font-medium text-text-primary">{med}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom sidebar buttons */}
        <div className="mt-auto p-5 space-y-2 border-t border-border-light">
          <Link
            href={`/patient/${patientId}/documents`}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-bg py-2.5 text-sm font-bold text-text-primary transition hover:bg-skeleton"
          >
            <span className="material-symbols-outlined text-[18px]">folder_open</span>
            View Documents
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            Delete Patient
          </button>
        </div>
      </aside>

      {/* ═══════════  MAIN CONTENT  ═══════════ */}
      <main className="flex-1 overflow-y-auto">
        <div className="px-4 md:px-8 py-6 max-w-5xl mx-auto space-y-7 pb-24">

          {/* ── AI Patient Summary ── */}
          {hasSummary && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  AI Patient Summary
                </h2>
              </div>
              <div className="rounded-xl border border-primary/20 bg-surface p-5 shadow-sm">
                {data.ai_intake_summary.chief_complaint && (
                  <p className="text-base leading-relaxed text-text-primary">
                    <span className="font-bold text-primary">Chief Complaint:</span>{" "}
                    {data.ai_intake_summary.chief_complaint}
                    {data.ai_intake_summary.onset && (
                      <span className="text-text-secondary"> — onset: {data.ai_intake_summary.onset}</span>
                    )}
                    {data.ai_intake_summary.severity && (
                      <span className="text-text-secondary"> — severity: <span className="font-semibold text-text-primary">{data.ai_intake_summary.severity}</span></span>
                    )}
                  </p>
                )}
                {data.ai_intake_summary.context && (
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                    {data.ai_intake_summary.context}
                  </p>
                )}
                {data.ai_intake_summary.findings && data.ai_intake_summary.findings.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {data.ai_intake_summary.findings.map((f, i) => (
                      <span key={i} className="rounded-md bg-primary-light px-2.5 py-1 text-xs font-medium text-primary">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Appointment History (Timeline) ── */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-7">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-text-primary">Appointment History</h2>
                <span className="text-xs text-text-secondary">{appointments.length} total</span>
              </div>

              {appointments.length > 0 ? (
                <div className="relative space-y-5 before:absolute before:left-[15px] before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-border-light">
                  {appointments.map((appt, idx) => {
                    const badge = getStatusBadge(appt.status);
                    const isLatest = idx === 0;
                    return (
                      <Link key={appt.id} href={`/appointment/${appt.id}`} className="block relative pl-10 group">
                        {/* Timeline dot */}
                        <div className={`absolute left-[10px] top-[10px] w-3 h-3 rounded-full border-2 border-surface ${isLatest ? "bg-primary" : "bg-skeleton"}`} />
                        {/* Card */}
                        <div className="rounded-lg bg-surface p-4 shadow-sm border border-border-light group-hover:border-primary/40 transition-colors">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="font-bold text-text-primary text-sm truncate">{appt.reason || "General consultation"}</h4>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${badge.bg} ${badge.text}`}>
                                {badge.label}
                              </span>
                              <span className="material-symbols-outlined text-text-secondary text-[18px] group-hover:text-primary transition-colors">chevron_right</span>
                            </div>
                          </div>
                          <p className="mt-1 text-xs text-text-secondary">
                            {formatDate(appt.start_time)}
                            {formatTime(appt.start_time) && ` at ${formatTime(appt.start_time)}`}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl bg-surface border border-border-light p-8 text-center">
                  <span className="material-symbols-outlined text-text-secondary text-[32px] mb-2 block">calendar_today</span>
                  <p className="text-sm text-text-secondary">No appointments yet</p>
                </div>
              )}
            </div>

            {/* ── Right Panel: Demographics & Vitals ── */}
            <aside className="space-y-5">
              <h2 className="text-base font-bold text-text-primary">Patient Details</h2>

              {/* Demographics */}
              <div className="rounded-xl bg-surface p-4 shadow-sm border border-border-light">
                <div className="space-y-3.5">
                  {patient.phone && (
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-text-secondary text-[20px]">call</span>
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-tight">Phone</p>
                        <p className="text-sm font-medium text-text-primary">{patient.phone}</p>
                      </div>
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-text-secondary text-[20px]">mail</span>
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-tight">Email</p>
                        <p className="text-sm font-medium text-text-primary">{patient.email}</p>
                      </div>
                    </div>
                  )}
                  {patient.address && (
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-text-secondary text-[20px]">location_on</span>
                      <div>
                        <p className="text-[10px] font-bold text-text-secondary uppercase tracking-tight">Address</p>
                        <p className="text-sm font-medium text-text-primary">{patient.address}</p>
                      </div>
                    </div>
                  )}
                  {!patient.phone && !patient.email && !patient.address && (
                    <p className="text-xs text-text-secondary text-center py-2">No contact details recorded</p>
                  )}
                </div>
              </div>

              {/* Body Measurements */}
              {hasBody && (
                <div className="rounded-xl bg-surface p-4 shadow-sm border border-border-light">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-3">Body</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {hasHeight && (
                      <div className="text-center rounded-lg bg-bg p-2.5">
                        <p className="text-lg font-bold text-text-primary">{patient.height_cm}</p>
                        <p className="text-[10px] text-text-secondary">cm</p>
                      </div>
                    )}
                    {hasWeight && (
                      <div className="text-center rounded-lg bg-bg p-2.5">
                        <p className="text-lg font-bold text-text-primary">{patient.weight_kg}</p>
                        <p className="text-[10px] text-text-secondary">kg</p>
                      </div>
                    )}
                    {bmi && (
                      <div className="text-center rounded-lg bg-bg p-2.5">
                        <p className="text-lg font-bold text-text-primary">{bmi}</p>
                        <p className="text-[10px] text-text-secondary">BMI</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vitals */}
              {hasVitals && (
                <div className="rounded-xl bg-surface p-4 shadow-sm border border-border-light">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-3">Vitals</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {vitals.bp_systolic && vitals.bp_diastolic && (
                      <VitalCard icon="bloodtype" label="Blood Pressure" value={`${vitals.bp_systolic}/${vitals.bp_diastolic}`} unit="mmHg" />
                    )}
                    {vitals.spo2 && (
                      <VitalCard icon="spo2" label="SpO2" value={`${vitals.spo2}`} unit="%" />
                    )}
                    {vitals.heart_rate && (
                      <VitalCard icon="heart_check" label="Heart Rate" value={`${vitals.heart_rate}`} unit="bpm" />
                    )}
                    {vitals.temperature_f && (
                      <VitalCard icon="thermostat" label="Temp" value={`${vitals.temperature_f}`} unit="°F" />
                    )}
                  </div>
                </div>
              )}
            </aside>
          </section>

          {/* ── Documents Compact ── */}
          {data.documents && data.documents.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">folder_open</span>
                  Recent Documents
                </h2>
                <Link href={`/patient/${patientId}/documents`} className="text-xs text-primary hover:underline font-medium">
                  View All ({data.documents.length})
                </Link>
              </div>
              <div className="rounded-xl bg-surface border border-border-light shadow-sm divide-y divide-border-light overflow-hidden">
                {data.documents.slice(0, 3).map(doc => (
                  <div key={doc.id} className="px-4 py-3 flex items-center justify-between hover:bg-bg transition-colors group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-hover flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[16px] text-text-secondary">description</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{doc.title}</p>
                        <p className="text-[11px] text-text-secondary">
                          {doc.doc_type.replace(/_/g, " ")} • {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {doc.file_url && (
                      <button
                        onClick={() => setViewDoc(doc)}
                        className="p-1.5 rounded-lg hover:bg-primary-light text-primary transition opacity-0 group-hover:opacity-100"
                        title="View"
                      >
                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Ask AI ── */}
          <AskAIPanel patientId={patientId} />
        </div>
      </main>

      {/* ══════  MODALS  ══════ */}

      {/* View Document Modal */}
      {viewDoc && (
        <DocumentViewerModal document={viewDoc} onClose={() => setViewDoc(null)} />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
              </div>
              <h3 className="text-lg font-semibold text-text-primary">Delete Patient</h3>
            </div>
            <p className="text-sm text-text-secondary mb-6">
              Are you sure you want to delete <strong>{patient.name}</strong> and all their appointments, documents, and clinical data? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 bg-muted text-text-primary rounded-xl text-sm font-medium hover:bg-skeleton transition"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePatient}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ── */

function VitalCard({ icon, label, value, unit }: { icon: string; label: string; value: string; unit: string }) {
  return (
    <div className="rounded-lg bg-bg p-2.5">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="material-symbols-outlined text-primary text-[14px]">{icon}</span>
        <span className="text-[10px] text-text-secondary font-medium">{label}</span>
      </div>
      <p className="text-sm font-bold text-text-primary">
        {value} <span className="text-[10px] font-normal text-text-secondary">{unit}</span>
      </p>
    </div>
  );
}
