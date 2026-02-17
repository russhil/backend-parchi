"use client";

import { useState } from "react";
import type { SOAPNote as SOAPNoteType } from "@/types";

interface SOAPNoteProps {
  soap: SOAPNoteType;
}

const tabs = [
  { key: "subjective", label: "Subjective", icon: "person" },
  { key: "objective", label: "Objective", icon: "monitor_heart" },
  { key: "assessment", label: "Assessment", icon: "psychology" },
  { key: "plan", label: "Plan", icon: "checklist" },
] as const;

export default function SOAPNote({ soap }: SOAPNoteProps) {
  const [activeTab, setActiveTab] = useState<keyof SOAPNoteType>("subjective");

  return (
    <div className="bg-surface rounded-2xl border border-border-light shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border-light flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">clinical_notes</span>
        <h3 className="text-sm font-bold text-text-primary">SOAP Note</h3>
        <span className="ml-auto px-2 py-0.5 bg-primary-light text-primary text-[10px] font-semibold rounded-full">
          AI Generated
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border-light">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition border-b-2 ${
              activeTab === tab.key
                ? "text-primary border-primary"
                : "text-text-secondary border-transparent hover:text-text-primary"
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="px-5 py-4">
        <p className="text-sm text-text-primary leading-relaxed whitespace-pre-line">
          {soap[activeTab]}
        </p>
      </div>
    </div>
  );
}
