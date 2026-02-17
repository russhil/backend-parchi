"use client";
import { useState } from "react";
import type { DifferentialItem } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface DifferentialDiagnosisProps {
  items: DifferentialItem[];
  patientId: string;
  appointmentId?: string;
  onRefresh?: () => void;
}

export default function DifferentialDiagnosis({ items: initialItems, patientId, appointmentId, onRefresh }: DifferentialDiagnosisProps) {
  const [items, setItems] = useState<DifferentialItem[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/ai/generate-differential/${patientId}`);
      if (appointmentId) {
        url.searchParams.set("appointment_id", appointmentId);
      }
      const res = await fetch(url.toString(), { method: "POST" });
      const data = await res.json();
      if (data.status === "success") {
        // Backend now returns frontend-friendly field names (condition, match_pct, reasoning)
        setItems(data.data);
        // Refresh parent to update confidence badge etc.
        if (onRefresh) onRefresh();
      }
    } catch (e) {
      console.error("Failed to regenerate differential", e);
    } finally {
      setLoading(false);
    }
  };

  const currentItems = (items || []).filter(item => item.condition && item.condition.trim() !== "" && item.match_pct != null);

  const getMatchLabel = (pct: number) => {
    if (pct >= 80) return { label: "High Match", color: "text-purple-700 bg-purple-50 border border-purple-200" };
    if (pct >= 50) return { label: "Moderate", color: "text-amber-700 bg-amber-50 border border-amber-200" };
    return { label: "Low Match", color: "text-text-secondary bg-bg border border-border-light" };
  };

  const INITIAL_SHOW_COUNT = 3;
  const visibleItems = showAll ? currentItems : currentItems.slice(0, INITIAL_SHOW_COUNT);
  const hasMore = currentItems.length > INITIAL_SHOW_COUNT;

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-primary/10 p-4 hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Gradient accent */}
      <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-purple-500/5 to-transparent pointer-events-none rounded-tr-2xl" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
          <span className="material-symbols-outlined text-purple-500">lightbulb</span>
          Differential Diagnosis
        </h3>
        <button
          onClick={handleRegenerate}
          disabled={loading}
          className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition disabled:opacity-50"
          title="Regenerate with AI"
        >
          <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>
            refresh
          </span>
          {loading ? "Analyzing..." : "Regenerate"}
        </button>
      </div>

      {/* Diagnosis Cards */}
      <div className="space-y-2">
        {currentItems.length === 0 && !loading ? (
          <div className="text-center py-6 text-text-secondary text-sm">
            No differential diagnosis generated yet.
            <button onClick={handleRegenerate} className="block mx-auto mt-2 text-primary font-medium hover:underline">
              Generate Now
            </button>
          </div>
        ) : (
          visibleItems.map((item, i) => {
            const match = getMatchLabel(item.match_pct);
            const isTop = i === 0 && item.match_pct >= 70;

            return (
              <div
                key={i}
                className={`p-3.5 rounded-xl transition-all ${isTop
                  ? "bg-purple-50 border border-purple-100"
                  : "bg-bg border border-border-light opacity-80"
                  }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`font-bold ${isTop ? "text-text-primary" : "text-sm text-text-primary"}`}>
                    {item.condition}
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${match.color}`}>
                    {item.match_pct}% — {match.label}
                  </span>
                </div>
                {item.reasoning && (
                  <p className="text-xs text-text-secondary mt-1">
                    {item.reasoning}
                  </p>
                )}
              </div>
            );
          })
        )}

        {/* Show More / Show Less button */}
        {hasMore && currentItems.length > 0 && !loading && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="flex items-center justify-center gap-1 w-full py-1.5 text-xs font-medium text-primary hover:text-primary-dark transition rounded-lg hover:bg-primary/5"
          >
            <span className="material-symbols-outlined text-[16px]">
              {showAll ? "expand_less" : "expand_more"}
            </span>
            {showAll ? "Show Less" : `Show ${currentItems.length - INITIAL_SHOW_COUNT} More`}
          </button>
        )}

        {loading && currentItems.length === 0 && (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className={`h-16 rounded-xl border ${i === 1 ? "bg-purple-50 border-purple-100" : "bg-bg border-border-light"}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
