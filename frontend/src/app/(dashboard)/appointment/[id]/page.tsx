"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAppointment, completeAppointment, deleteAppointment } from "@/lib/api";
import type { AppointmentPageData } from "@/types";
import AIIntakeSummary from "@/components/patient/AIIntakeSummary";
import DifferentialDiagnosis from "@/components/patient/DifferentialDiagnosis";
import AskAIPanel from "@/components/patient/AskAIPanel";
import FloatingActionBar from "@/components/layout/FloatingActionBar";
import Link from "next/link";

export default function AppointmentPage() {
    const params = useParams();
    const router = useRouter();
    const appointmentId = params.id as string;
    const [data, setData] = useState<AppointmentPageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async (retain: boolean) => {
        setDeleting(true);
        try {
            await deleteAppointment(appointmentId, retain);
            router.push("/appointments");
        } catch {
            alert("Failed to delete appointment");
            setDeleting(false);
        }
    };

    const loadAppointment = useCallback(async () => {
        try {
            const result = await getAppointment(appointmentId);
            setData(result);
        } catch {
            // Error will show error state
        } finally {
            setLoading(false);
        }
    }, [appointmentId]);

    useEffect(() => {
        loadAppointment();
    }, [loadAppointment]);

    const handleComplete = async () => {
        try {
            await completeAppointment(appointmentId);
            loadAppointment();
        } catch (error) {
            console.error("Failed to complete appointment:", error);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full">
                <div className="w-[30%] min-w-[320px] max-w-[450px] bg-surface border-r border-border-light p-6 space-y-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 bg-bg rounded w-3/4" />
                        <div className="h-4 bg-bg rounded w-1/2" />
                        <div className="grid grid-cols-2 gap-3">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-bg rounded-xl border border-border-light" />)}
                        </div>
                    </div>
                </div>
                <div className="flex-1 bg-medical-blue p-6">
                    <div className="animate-pulse space-y-4">
                        <div className="h-6 bg-primary-light rounded w-1/3" />
                        <div className="h-40 bg-surface rounded-2xl" />
                        <div className="h-32 bg-surface rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <span className="material-symbols-outlined text-text-secondary text-[48px] mb-3 block">error</span>
                    <p className="text-text-secondary">Could not load appointment data.</p>
                    <button
                        onClick={() => router.push("/appointments")}
                        className="mt-3 text-sm text-primary font-medium hover:underline"
                    >
                        ← Back to Appointments
                    </button>
                </div>
            </div>
        );
    }

    const { appointment, patient, is_archived } = data;

    const hasSummary = data.ai_intake_summary && (
        data.ai_intake_summary.chief_complaint ||
        data.ai_intake_summary.onset ||
        data.ai_intake_summary.severity ||
        (data.ai_intake_summary.findings && data.ai_intake_summary.findings.length > 0)
    );
    const hasDifferential = data.differential_diagnosis && data.differential_diagnosis.filter(
        item => item.condition && item.condition.trim() !== ""
    ).length > 0;

    const hasConditions = Array.isArray(patient.conditions) && patient.conditions.filter(Boolean).length > 0;
    const hasMedications = Array.isArray(patient.medications) && patient.medications.filter(Boolean).length > 0;
    const hasAllergies = Array.isArray(patient.allergies) && patient.allergies.filter(Boolean).length > 0;
    const hasVitals = patient.vitals && (
        patient.vitals.bp_systolic || patient.vitals.spo2 || patient.vitals.heart_rate || patient.vitals.temperature_f
    );

    // Compute confidence from differential data
    const confidence = hasDifferential
        ? Math.round(data.differential_diagnosis.reduce((max, d) => Math.max(max, d.match_pct || 0), 0))
        : null;

    return (
        <div className={`flex flex-col lg:flex-row min-h-screen lg:h-full lg:overflow-hidden ${is_archived ? "opacity-90" : ""}`}>
            {/* ── LEFT PANEL: Patient Sidebar ── */}
            <section className="w-full lg:w-[30%] lg:min-w-[320px] lg:max-w-[450px] bg-surface border-b lg:border-b-0 lg:border-r border-border-light h-auto lg:h-full flex flex-col overflow-visible lg:overflow-y-auto">
                <div className="p-6 space-y-6">
                    {/* Back + Patient Name */}
                    <div>
                        <button
                            onClick={() => router.back()}
                            className="flex items-center gap-1 text-text-secondary text-sm hover:text-primary transition mb-3"
                        >
                            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                            Back
                        </button>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">{patient.name}</h1>
                        </div>
                        <div className="flex items-center gap-2 text-text-secondary text-sm font-medium mb-4">
                            <span>{patient.age ? `${patient.age} Yrs` : "Age N/A"}</span>
                            <span className="w-1 h-1 rounded-full bg-border-light" />
                            <span>{patient.gender || "N/A"}</span>
                        </div>
                        <Link
                            href={`/patient/${patient.id}`}
                            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-bg border border-border-light text-text-primary text-sm font-bold hover:bg-border-light transition w-full justify-center"
                        >
                            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                            Open Full Record
                        </Link>
                    </div>

                    <hr className="border-border-light" />

                    {/* Vitals */}
                    {hasVitals && (
                        <div>
                            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
                                Vitals
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {patient.vitals.bp_systolic && (
                                    <div className="p-3 bg-bg rounded-xl border border-border-light">
                                        <span className="text-[10px] text-text-secondary font-semibold block mb-1">Blood Pressure</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-bold text-text-primary">
                                                {patient.vitals.bp_systolic}/{patient.vitals.bp_diastolic}
                                            </span>
                                            <span className="text-[10px] text-text-secondary">mmHg</span>
                                        </div>
                                    </div>
                                )}
                                {patient.vitals.spo2 && (
                                    <div className="p-3 bg-bg rounded-xl border border-border-light">
                                        <span className="text-[10px] text-text-secondary font-semibold block mb-1">Oxygen Level</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-bold text-text-primary">{patient.vitals.spo2}</span>
                                            <span className="text-[10px] text-text-secondary">%</span>
                                        </div>
                                    </div>
                                )}
                                {patient.vitals.temperature_f && (
                                    <div className="p-3 bg-bg rounded-xl border border-border-light">
                                        <span className="text-[10px] text-text-secondary font-semibold block mb-1">Temperature</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-bold text-text-primary">{patient.vitals.temperature_f}</span>
                                            <span className="text-[10px] text-text-secondary">°F</span>
                                        </div>
                                    </div>
                                )}
                                {patient.vitals.heart_rate && (
                                    <div className="p-3 bg-bg rounded-xl border border-border-light">
                                        <span className="text-[10px] text-text-secondary font-semibold block mb-1">Heart Rate</span>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-lg font-bold text-text-primary">{patient.vitals.heart_rate}</span>
                                            <span className="text-[10px] text-text-secondary">bpm</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {(hasConditions || hasAllergies || hasMedications) && (
                        <>
                            {hasVitals && <hr className="border-border-light" />}
                            <div>
                                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
                                    Medical History
                                </h3>
                                <div className="space-y-4">
                                    {/* Conditions */}
                                    {hasConditions && (
                                        <div>
                                            <span className="text-[10px] font-semibold text-text-secondary mb-2 block">
                                                Chronic Conditions
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                {patient.conditions.filter(Boolean).map(c => (
                                                    <span key={c} className="px-3 py-1.5 rounded-lg bg-bg text-text-primary text-sm font-semibold border border-border-light">
                                                        {c}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Allergies */}
                                    {hasAllergies && (
                                        <div>
                                            <span className="text-[10px] font-semibold text-text-secondary mb-2 block">
                                                Allergies
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                {patient.allergies.filter(Boolean).map(a => (
                                                    <span key={a} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-800 text-sm font-semibold border border-red-100 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">warning</span>
                                                        {a}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Medications */}
                                    {hasMedications && (
                                        <div>
                                            <span className="text-[10px] font-semibold text-text-secondary mb-2 block">
                                                Current Medications
                                            </span>
                                            <ul className="text-sm space-y-2 text-text-primary">
                                                {patient.medications.filter(Boolean).map(m => (
                                                    <li key={m} className="flex justify-between items-center p-2 rounded bg-bg border border-border-light">
                                                        <span className="font-medium">{m}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}

                    {/* Documents */}
                    {data.documents && data.documents.length > 0 && (
                        <>
                            <hr className="border-border-light" />
                            <div>
                                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">
                                    Documents
                                </h3>
                                <Link
                                    href={`/patient/${patient.id}/documents`}
                                    className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-bg text-primary rounded-lg text-sm font-medium hover:bg-primary-light transition border border-border-light"
                                >
                                    <span className="material-symbols-outlined text-[18px]">folder_open</span>
                                    View {data.documents.length} Document{data.documents.length !== 1 ? "s" : ""}
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* ── RIGHT PANEL: AI Assistant ── */}
            <section className="flex-1 bg-medical-blue flex flex-col h-auto lg:h-full relative overflow-visible lg:overflow-hidden">
                {/* AI Header */}
                <div className="flex-none px-4 pt-3 pb-2">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-md shadow-primary/20">
                            <span className="material-symbols-outlined text-xl">auto_awesome</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-extrabold text-text-primary leading-none">AI Assistant</h2>
                            <span className="text-xs text-text-secondary font-medium">
                                Analysis based on intake &amp; history
                            </span>
                        </div>
                        {confidence !== null && (
                            <div className="ml-auto flex items-center gap-2 bg-surface px-2.5 py-1 rounded-full border border-border-light shadow-sm">
                                <span className="text-[10px] font-bold text-text-secondary uppercase">Confidence</span>
                                <span className={`text-sm font-bold ${confidence >= 70 ? "text-emerald-600" : confidence >= 40 ? "text-amber-600" : "text-red-500"}`}>
                                    {confidence}%
                                </span>
                            </div>
                        )}
                        {is_archived && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-text-secondary ml-2">
                                📁 Archived
                            </span>
                        )}
                    </div>

                    {/* Appointment info strip */}
                    <div className="flex items-center gap-2 text-xs text-text-secondary mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${appointment.status === "completed" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" :
                            appointment.status === "in-progress" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                                "bg-primary-light text-primary"
                            }`}>
                            {appointment.status === "completed" ? "Completed" :
                                appointment.status === "in-progress" ? "In Progress" : "Scheduled"}
                        </span>
                        <span>{appointment.reason || "General consultation"}</span>
                    </div>
                </div>

                {/* AI Content — 2-column grid to fit everything on one screen */}
                <div className="flex-1 overflow-visible lg:overflow-hidden px-4 pb-4 lg:pb-24">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-auto lg:h-full">
                        {/* Left Column: AI Intake Summary + Report Insights */}
                        <div className="overflow-visible lg:overflow-y-auto space-y-3 lg:pr-1">
                            {/* AI Intake Summary */}
                            <AIIntakeSummary
                                summary={data.ai_intake_summary}
                                patientId={patient.id}
                                onRefresh={loadAppointment}
                            />

                            {/* Report Insights */}
                            {data.report_insights && data.report_insights.flags && data.report_insights.flags.length > 0 && (
                                <div className="bg-surface rounded-2xl shadow-sm border border-primary/10 p-4 hover:shadow-md transition-shadow">
                                    <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 mb-2">
                                        <span className="material-symbols-outlined text-primary text-[18px]">lab_profile</span>
                                        Report Insights
                                    </h3>
                                    {data.report_insights.flags.filter(f => f.type === "warning" || f.type === "error").length > 0 && (
                                        <div className="bg-red-50 border border-red-100 rounded-xl p-3 mb-2">
                                            <div className="flex items-start gap-2">
                                                <span className="material-symbols-outlined text-red-700 mt-0.5 text-[16px]">warning</span>
                                                <div>
                                                    <h4 className="text-xs font-bold text-red-800 mb-1">Abnormal Findings</h4>
                                                    {data.report_insights.flags
                                                        .filter(f => f.type === "warning" || f.type === "error")
                                                        .map((flag, i) => (
                                                            <p key={i} className="text-xs text-text-primary">{flag.text}</p>
                                                        ))
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {data.report_insights.summary && (
                                        <p className="text-xs text-text-secondary">{data.report_insights.summary}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Right Column: Differential Diagnosis + Ask AI Chat */}
                        <div className="overflow-visible lg:overflow-y-auto space-y-3 lg:pl-1">
                            {/* Differential Diagnosis */}
                            <DifferentialDiagnosis
                                items={data.differential_diagnosis || []}
                                patientId={patient.id}
                                appointmentId={appointmentId}
                                onRefresh={loadAppointment}
                            />

                            {/* Ask AI Chat */}
                            <AskAIPanel patientId={patient.id} />
                        </div>
                    </div>
                </div>

                {/* Floating Action Bar - Fixed to viewport bottom */}
                {!is_archived && (
                    <div className="fixed bottom-20 md:bottom-6 left-0 right-0 px-4 lg:px-6 z-20 pointer-events-none">
                        <div className="pointer-events-auto max-w-2xl mx-auto flex justify-center">
                            <FloatingActionBar
                                patientId={patient.id}
                                patientName={patient.name}
                                appointmentId={appointmentId}
                                onRefresh={loadAppointment}
                            />
                        </div>
                    </div>
                )}

                {/* Complete Button (floating when scheduled/in-progress) */}
                {(appointment.status === "scheduled" || appointment.status === "in-progress") && !is_archived && (
                    <div className="absolute top-4 right-4 lg:right-6 z-10 flex items-center gap-2">
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="flex items-center gap-1.5 px-3 py-2 bg-surface text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition shadow-md border border-border-light"
                        >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                            <span className="hidden md:inline">Delete</span>
                        </button>
                        <button
                            onClick={handleComplete}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20"
                        >
                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                            Mark as Seen
                        </button>
                    </div>
                )}
            </section>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="bg-surface rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
                            </div>
                            <h3 className="text-lg font-semibold text-text-primary">Delete Appointment</h3>
                        </div>
                        <p className="text-sm text-text-secondary mb-2">
                            Deleting appointment for <strong>{patient.name}</strong>.
                        </p>
                        <p className="text-sm text-text-secondary mb-6">
                            How would you like to handle the associated clinical data?
                        </p>
                        <div className="space-y-2">
                            <button
                                onClick={() => handleDelete(true)}
                                disabled={deleting}
                                className="w-full px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200 rounded-xl text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/40 transition disabled:opacity-50 text-left"
                            >
                                <span className="font-semibold">Retain Data</span>
                                <br />
                                <span className="text-xs opacity-80">Save booking history as a clinical dump in the patient file. Documents are kept.</span>
                            </button>
                            <button
                                onClick={() => handleDelete(false)}
                                disabled={deleting}
                                className="w-full px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl text-sm font-medium hover:bg-red-100 dark:hover:bg-red-900/40 transition disabled:opacity-50 text-left"
                            >
                                <span className="font-semibold">Delete All Data</span>
                                <br />
                                <span className="text-xs opacity-80">Remove appointment and all related complaints, clinical dumps, and documents.</span>
                            </button>
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="w-full px-4 py-2.5 bg-muted text-text-primary rounded-xl text-sm font-medium hover:bg-skeleton transition mt-1"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
