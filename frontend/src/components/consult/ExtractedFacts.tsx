"use client";

import type { ExtractedFacts as ExtractedFactsType } from "@/types";

interface ExtractedFactsProps {
  facts: ExtractedFactsType;
}

export default function ExtractedFacts({ facts }: ExtractedFactsProps) {
  return (
    <div className="bg-surface rounded-2xl border border-border-light shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">fact_check</span>
        <h3 className="text-sm font-bold text-text-primary">Extracted Facts</h3>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Symptoms */}
        <div>
          <p className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">Symptoms</p>
          <div className="flex flex-wrap gap-1.5">
            {facts.symptoms.map((s, i) => (
              <span key={i} className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-medium rounded-lg">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* Duration */}
        {facts.duration && (
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-1">Duration</p>
            <p className="text-sm text-text-primary">{facts.duration}</p>
          </div>
        )}

        {/* Medications */}
        {facts.medications_discussed.length > 0 && (
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">Medications Discussed</p>
            <div className="flex flex-wrap gap-1.5">
              {facts.medications_discussed.map((m, i) => (
                <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg">
                  {m}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Allergies */}
        {facts.allergies_mentioned.length > 0 && (
          <div>
            <p className="text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">Allergies Mentioned</p>
            <div className="flex flex-wrap gap-1.5">
              {facts.allergies_mentioned.map((a, i) => (
                <span key={i} className="px-2.5 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-lg">
                  ⚠ {a}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
