"use client";

import type { ReportInsights as ReportInsightsType, Document } from "@/types";

interface ReportInsightsProps {
  insights: ReportInsightsType | null;
  documents: Document[];
}

export default function ReportInsights({ insights, documents }: ReportInsightsProps) {
  if (!insights) {
    return (
      <div className="bg-surface rounded-2xl border border-border-light shadow-sm p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-skeleton rounded w-1/3" />
          <div className="h-3 bg-skeleton rounded w-2/3" />
        </div>
      </div>
    );
  }

  const docIcon = (type: string) => {
    switch (type) {
      case "lab_report": return "lab_profile";
      case "referral": return "forward_to_inbox";
      default: return "description";
    }
  };

  return (
    <div className="bg-surface rounded-2xl border border-border-light shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">lab_profile</span>
        <h3 className="text-sm font-bold text-text-primary">Report Insights</h3>
        <span className="ml-auto text-xs text-text-secondary">{documents.length} documents</span>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Document Thumbnails */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {(documents || []).map((doc) => (
            <div
              key={doc.id}
              className="flex-shrink-0 w-36 bg-bg rounded-xl p-3 border border-border-light hover:border-primary/30 transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-primary text-[24px] mb-2 block">
                {docIcon(doc.doc_type)}
              </span>
              <p className="text-xs font-semibold text-text-primary line-clamp-2">{doc.title}</p>
              <p className="text-[10px] text-text-secondary mt-1">
                {new Date(doc.uploaded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </p>
            </div>
          ))}
        </div>

        {/* Analysis Summary */}
        <div>
          <p className="text-xs text-text-secondary leading-relaxed">{insights.summary}</p>
        </div>

        {/* Flags */}
        <div className="space-y-2">
          {(insights.flags || []).map((flag, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs ${flag.type === "warning"
                ? "bg-amber-50 text-amber-800"
                : flag.type === "error"
                  ? "bg-red-50 text-red-800"
                  : "bg-blue-50 text-blue-800"
                }`}
            >
              <span className="material-symbols-outlined text-[16px] mt-0.5">
                {flag.type === "warning" ? "warning" : flag.type === "error" ? "error" : "info"}
              </span>
              <span className="leading-relaxed">{flag.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
