"use client";

import type { ConsultInsights } from "@/types";
import SOAPNote from "./SOAPNote";
import ExtractedFacts from "./ExtractedFacts";

interface ConsultResultsProps {
  insights: ConsultInsights;
}

export default function ConsultResults({ insights }: ConsultResultsProps) {
  return (
    <div className="space-y-5">
      {/* SOAP Note */}
      <SOAPNote soap={insights.soap} />

      {/* Extracted Facts */}
      <ExtractedFacts facts={insights.extracted_facts} />

      {/* Follow-up Questions */}
      {insights.follow_up_questions.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border-light shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
            <span className="material-symbols-outlined text-warning text-[20px]">help</span>
            <h3 className="text-sm font-bold text-text-primary">Follow-up Questions You May Have Missed</h3>
          </div>
          <div className="px-5 py-4">
            <ul className="space-y-2">
              {insights.follow_up_questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                  <span className="material-symbols-outlined text-warning text-[16px] mt-0.5">arrow_right</span>
                  {q}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Differential Suggestions */}
      {insights.differential_suggestions.length > 0 && (
        <div className="bg-surface rounded-2xl border border-border-light shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">diagnosis</span>
            <h3 className="text-sm font-bold text-text-primary">Differential Suggestions</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            {insights.differential_suggestions.map((d, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${d.likelihood === "high" ? "bg-primary-light text-primary" :
                  d.likelihood === "medium" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                    "bg-muted text-text-secondary"
                  }`}>
                  {d.likelihood.toUpperCase()}
                </span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{d.condition}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{d.reasoning}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-200 dark:border-amber-800 px-5 py-3">
        <p className="text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">info</span>
          {insights.disclaimer}
        </p>
      </div>
    </div>
  );
}
