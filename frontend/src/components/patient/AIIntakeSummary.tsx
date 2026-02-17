"use client";

import { useState } from "react";
import type { AIIntakeSummary as AIIntakeSummaryType } from "@/types";
import AISummaryModal from "./AISummaryModal";

interface AIIntakeSummaryProps {
  summary: AIIntakeSummaryType | null;
  patientId: string;
  onRefresh?: () => void;
}

export default function AIIntakeSummary({ summary, patientId, onRefresh }: AIIntakeSummaryProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [localSummary, setLocalSummary] = useState<AIIntakeSummaryType | null>(summary);

  const handleGenerate = () => {
    setIsModalOpen(true);
  };

  const handleComplete = (newSummary: Record<string, unknown>) => {
    const converted: AIIntakeSummaryType = {
      chief_complaint: String(newSummary.chief_complaint || ""),
      onset: String(newSummary.onset || ""),
      severity: String(newSummary.severity || ""),
      findings: Array.isArray(newSummary.findings) ? newSummary.findings.map(String) : [],
      context: String(newSummary.context || ""),
    };
    setLocalSummary(converted);
    if (onRefresh) {
      onRefresh();
    }
  };

  const displaySummary = localSummary || summary;

  const getSeverityBadge = (severity: string) => {
    const lower = severity.toLowerCase();
    if (lower.includes("severe") || lower.includes("high") || lower.includes("8") || lower.includes("9") || lower.includes("10"))
      return { bg: "bg-red-100", text: "text-red-700" };
    if (lower.includes("moderate") || lower.includes("5") || lower.includes("6") || lower.includes("7"))
      return { bg: "bg-amber-100", text: "text-amber-700" };
    return { bg: "bg-green-100", text: "text-green-700" };
  };

  return (
    <>
      <div className="bg-surface rounded-2xl shadow-sm border border-primary/10 p-3 relative overflow-hidden group hover:shadow-md transition-shadow">
        {/* Gradient accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/5 to-transparent pointer-events-none rounded-tr-2xl" />

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[18px]">summarize</span>
            AI Intake Summary
          </h3>
          {displaySummary ? (
            <button
              onClick={handleGenerate}
              className="text-xs text-primary hover:text-primary-dark flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Regenerate
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md"
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              Generate Summary
            </button>
          )}
        </div>

        {displaySummary ? (
          <div className="space-y-2">
            {/* Metadata bar */}
            <div className="flex flex-wrap gap-3 p-2.5 bg-bg rounded-lg border border-border-light">
              <div className="flex flex-col">
                <span className="text-[10px] text-text-secondary uppercase tracking-wide font-bold">Complaint</span>
                <span className="text-xs font-bold text-text-primary">{displaySummary.chief_complaint}</span>
              </div>
              {displaySummary.onset && (
                <>
                  <div className="w-px h-8 bg-border-light" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-text-secondary uppercase tracking-wide font-bold">Onset</span>
                    <span className="text-xs font-medium text-text-primary">{displaySummary.onset}</span>
                  </div>
                </>
              )}
              {displaySummary.severity && (
                <>
                  <div className="w-px h-8 bg-border-light" />
                  <div className="flex flex-col">
                    <span className="text-[10px] text-text-secondary uppercase tracking-wide font-bold">Severity</span>
                    {(() => {
                      const badge = getSeverityBadge(displaySummary.severity);
                      return (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${badge.bg} ${badge.text} mt-0.5 w-fit`}>
                          {displaySummary.severity}
                        </span>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>

            {/* Key Findings */}
            {displaySummary.findings && displaySummary.findings.length > 0 && (
              <ul className="space-y-0.5">
                {displaySummary.findings.map((finding, i) => (
                  <li key={i} className="flex items-start gap-2 px-1.5 py-1 hover:bg-bg rounded transition-colors">
                    <div className="min-w-4 pt-px">
                      <span className={`material-symbols-outlined text-[14px] ${finding.includes("⚠") ? "text-warning" : "text-primary"}`}>
                        {finding.includes("⚠") ? "warning" : "check_circle"}
                      </span>
                    </div>
                    <span className="text-xs text-text-primary leading-snug">{finding}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Context */}
            {displaySummary.context && (
              <div className="bg-bg rounded-lg p-2">
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wide mb-0.5">Context</p>
                <p className="text-xs text-text-secondary leading-snug">{displaySummary.context}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="w-10 h-10 mx-auto mb-2 rounded-xl bg-primary/5 flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px] text-primary/40">smart_toy</span>
            </div>
            <p className="text-xs font-medium text-text-primary mb-0.5">No AI Summary Yet</p>
            <p className="text-[10px] text-text-secondary mb-2">
              Generate an AI-powered intake summary
            </p>
            <button
              onClick={handleGenerate}
              className="px-3 py-1.5 bg-primary text-white text-[11px] font-semibold rounded-lg hover:bg-primary-dark transition-all flex items-center gap-1.5 mx-auto shadow-sm hover:shadow-md"
            >
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              Generate AI Summary
            </button>
          </div>
        )}
      </div>

      {/* AI Summary Generation Modal */}
      <AISummaryModal
        patientId={patientId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onComplete={handleComplete}
      />
    </>
  );
}
