"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAppointments, deleteAppointment } from "@/lib/api";

interface AppointmentWithPatient {
    id: string;
    patient_id: string;
    start_time: string;
    status: string;
    reason: string;
    patients?: {
        id: string;
        name: string;
    };
}

export default function AppointmentsPage() {
    const router = useRouter();
    const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<"all" | "today" | "upcoming">("all");
    const [deleteTarget, setDeleteTarget] = useState<AppointmentWithPatient | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async (retain: boolean) => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await deleteAppointment(deleteTarget.id, retain);
            setAppointments((prev) => prev.filter((a) => a.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch {
            alert("Failed to delete appointment");
        } finally {
            setDeleting(false);
        }
    };

    useEffect(() => {
        async function loadAppointments() {
            try {
                const data = await getAppointments();
                setAppointments(data.appointments || []);
            } catch {
                // Handle error
            } finally {
                setLoading(false);
            }
        }
        loadAppointments();
    }, []);

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    };

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    };

    const isToday = (isoString: string) => {
        const date = new Date(isoString);
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const filteredAppointments = appointments.filter((apt) => {
        if (filter === "today") return isToday(apt.start_time);
        if (filter === "upcoming") return new Date(apt.start_time) > new Date();
        return true;
    });

    if (loading) {
        return (
            <div className="p-4 md:p-6">
                <div className="max-w-4xl mx-auto animate-pulse space-y-4">
                    <div className="h-8 bg-skeleton rounded w-48" />
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-24 bg-skeleton rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-text-primary">Appointments</h1>
                        <p className="text-sm text-text-secondary mt-1">
                            {appointments.length} total appointments
                        </p>
                    </div>
                    <button
                        onClick={() => router.push("/appointments/add")}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition shadow-sm w-full sm:w-auto"
                    >
                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
                        New Appointment
                    </button>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {(["all", "today", "upcoming"] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${filter === f
                                ? "bg-primary text-white"
                                : "bg-surface border border-border-light text-text-secondary hover:bg-hover"
                                }`}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Appointments List */}
                <div className="space-y-3">
                    {filteredAppointments.map((apt) => (
                        <div
                            key={apt.id}
                            onClick={() => router.push(`/appointment/${apt.id}`)}
                            className="bg-surface rounded-xl border border-border-light shadow-sm p-4 hover:shadow-md transition cursor-pointer"
                        >
                            {/* Desktop Layout */}
                            <div className="hidden sm:flex items-center gap-4">
                                {/* Time */}
                                <div className="text-center min-w-[80px]">
                                    <p className="text-lg font-bold text-text-primary">{formatTime(apt.start_time)}</p>
                                    <p className="text-xs text-text-secondary">{formatDate(apt.start_time)}</p>
                                </div>

                                {/* Divider */}
                                <div className="w-px h-12 bg-border-light" />

                                {/* Patient Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold text-xs">
                                            {apt.patients?.name?.split(" ").map((n) => n[0]).join("") || "?"}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-text-primary">
                                                {apt.patients?.name || "Unknown Patient"}
                                            </p>
                                            <p className="text-xs text-text-secondary">{apt.reason}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <div>
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-medium ${apt.status === "completed"
                                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                            : apt.status === "cancelled"
                                                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                                : isToday(apt.start_time)
                                                    ? "bg-primary-light text-primary"
                                                    : "bg-muted text-text-secondary"
                                            }`}
                                    >
                                        {apt.status === "scheduled" && isToday(apt.start_time)
                                            ? "Today"
                                            : apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                                    </span>
                                </div>

                                {/* Delete Button - Desktop */}
                                <button
                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(apt); }}
                                    className="p-1.5 text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition ml-2"
                                    title="Delete appointment"
                                >
                                    <span className="material-symbols-outlined text-[18px]">delete</span>
                                </button>
                            </div>

                            {/* Mobile Layout */}
                            <div className="sm:hidden space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                                            {apt.patients?.name?.split(" ").map((n) => n[0]).join("") || "?"}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-text-primary truncate">
                                                {apt.patients?.name || "Unknown Patient"}
                                            </p>
                                            <p className="text-xs text-text-secondary">
                                                {formatTime(apt.start_time)} • {formatDate(apt.start_time)}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${apt.status === "completed"
                                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                                            : apt.status === "cancelled"
                                                ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
                                                : isToday(apt.start_time)
                                                    ? "bg-primary-light text-primary"
                                                    : "bg-muted text-text-secondary"
                                            }`}
                                    >
                                        {apt.status === "scheduled" && isToday(apt.start_time)
                                            ? "Today"
                                            : apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                                    </span>
                                </div>
                                {apt.reason && (
                                    <p className="text-xs text-text-secondary pl-12">{apt.reason}</p>
                                )}
                                {/* Delete Button - Mobile */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(apt); }}
                                        className="p-1.5 text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                        title="Delete appointment"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {filteredAppointments.length === 0 && (
                        <div className="bg-surface rounded-xl border border-border-light p-8 md:p-12 text-center">
                            <span className="material-symbols-outlined text-text-secondary text-[48px] mb-3 block">
                                event_busy
                            </span>
                            <p className="text-sm text-text-secondary">No appointments found</p>
                        </div>
                    )}
                </div>

                {/* Delete Confirmation Modal */}
                {deleteTarget && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDeleteTarget(null)}>
                        <div className="bg-surface rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-red-600 dark:text-red-400">warning</span>
                                </div>
                                <h3 className="text-lg font-semibold text-text-primary">Delete Appointment</h3>
                            </div>
                            <p className="text-sm text-text-secondary mb-2">
                                Deleting appointment for <strong>{deleteTarget.patients?.name || "Unknown"}</strong> on {formatDate(deleteTarget.start_time)} at {formatTime(deleteTarget.start_time)}.
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
                                    onClick={() => setDeleteTarget(null)}
                                    className="w-full px-4 py-2.5 bg-muted text-text-primary rounded-xl text-sm font-medium hover:bg-skeleton transition mt-1"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
