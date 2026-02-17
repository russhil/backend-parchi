"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getTodaysAppointments } from "@/lib/api";

interface AppointmentData {
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

export default function TodayAppointments() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAppointments() {
      try {
        const data = await getTodaysAppointments();
        setAppointments(data.appointments || []);
      } catch {
        // Use fallback data
        setAppointments([]);
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

  const getInitials = (name: string) => {
    return name.split(" ").map((n) => n[0]).join("").toUpperCase();
  };

  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto px-4 md:px-0">
        <div className="bg-surface rounded-2xl border border-border-light shadow-sm p-6 animate-pulse">
          <div className="h-4 bg-skeleton rounded w-1/3 mb-4" />
          <div className="space-y-3">
            <div className="h-16 bg-skeleton rounded" />
            <div className="h-16 bg-skeleton rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 md:px-0">
      <div className="bg-surface rounded-2xl border border-border-light shadow-sm">
        <div className="px-4 md:px-5 py-4 border-b border-border-light flex items-center justify-between">
          <h3 className="text-sm font-bold text-text-primary">Today&apos;s Appointments</h3>
          <span className="text-xs text-text-secondary font-medium hidden sm:inline">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" })}
          </span>
          <span className="text-xs text-text-secondary font-medium sm:hidden">
            {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
          </span>
        </div>

        <div className="divide-y divide-border-light">
          {appointments.length > 0 ? (
            appointments.map((apt) => (
              <button
                key={apt.id}
                onClick={() => router.push(`/appointment/${apt.id}`)}
                className="w-full text-left px-4 md:px-5 py-4 hover:bg-hover transition"
              >
                {/* Desktop Layout */}
                <div className="hidden sm:flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                    {apt.patients?.name ? getInitials(apt.patients.name) : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary">
                      {apt.patients?.name || "Unknown Patient"}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">{apt.reason}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-text-primary">{formatTime(apt.start_time)}</p>
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-0.5 ${apt.status === "completed"
                        ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                        : apt.status === "scheduled"
                          ? "bg-primary-light text-primary"
                          : "bg-muted text-text-secondary"
                        }`}
                    >
                      {apt.status === "scheduled" ? "Scheduled" : apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-text-secondary text-[20px]">chevron_right</span>
                </div>

                {/* Mobile Layout */}
                <div className="sm:hidden flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                    {apt.patients?.name ? getInitials(apt.patients.name) : "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary">
                          {apt.patients?.name || "Unknown Patient"}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5 line-clamp-2">{apt.reason}</p>
                      </div>
                      <span className="material-symbols-outlined text-text-secondary text-[20px] flex-shrink-0">chevron_right</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <p className="text-xs font-semibold text-text-primary">{formatTime(apt.start_time)}</p>
                      <span className="text-text-secondary">•</span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${apt.status === "completed"
                          ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                          : apt.status === "scheduled"
                            ? "bg-primary-light text-primary"
                            : "bg-muted text-text-secondary"
                          }`}
                      >
                        {apt.status === "scheduled" ? "Scheduled" : apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-5 py-8 text-center">
              <span className="material-symbols-outlined text-text-secondary text-[40px] mb-2 block">event_available</span>
              <p className="text-sm text-text-secondary">No appointments scheduled for today</p>
              <button
                onClick={() => router.push("/appointments")}
                className="mt-3 text-xs text-primary font-medium hover:underline"
              >
                View all appointments →
              </button>
            </div>
          )}
        </div>

        {appointments.length > 0 && (
          <div className="px-4 md:px-5 py-3 border-t border-border-light">
            <button
              onClick={() => router.push("/appointments")}
              className="text-xs text-primary font-medium hover:underline"
            >
              View all appointments →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
