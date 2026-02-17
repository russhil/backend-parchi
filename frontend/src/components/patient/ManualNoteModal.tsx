"use client";

import { useState } from "react";
import { createNote } from "@/lib/api";

interface ManualNoteModalProps {
    patientId: string;
    patientName: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function ManualNoteModal({
    patientId,
    patientName,
    isOpen,
    onClose,
    onSuccess,
}: ManualNoteModalProps) {
    const [content, setContent] = useState("");
    const [noteType, setNoteType] = useState<"general" | "soap" | "follow-up">("general");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!content.trim()) return;

        setSaving(true);
        try {
            await createNote({
                patient_id: patientId,
                content: content.trim(),
                note_type: noteType,
            });
            setContent("");
            onSuccess?.();
            onClose();
        } catch {
            // Handle error
        } finally {
            setSaving(false);
        }
    };

    const insertSOAPTemplate = () => {
        setNoteType("soap");
        setContent(`**Subjective:**


**Objective:**


**Assessment:**


**Plan:**

`);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-text-primary">Manual Note</h2>
                        <p className="text-xs text-text-secondary">Patient: {patientName}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-hover transition"
                    >
                        <span className="material-symbols-outlined text-text-secondary">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    {/* Note Type */}
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                            Note Type
                        </label>
                        <div className="flex gap-2">
                            {(["general", "soap", "follow-up"] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => {
                                        setNoteType(type);
                                        if (type === "soap" && !content) insertSOAPTemplate();
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${noteType === type
                                        ? "bg-primary text-white"
                                        : "bg-bg text-text-secondary hover:bg-hover"
                                        }`}
                                >
                                    {type === "soap" ? "SOAP" : type.charAt(0).toUpperCase() + type.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Template Button */}
                    {noteType !== "soap" && (
                        <button
                            onClick={insertSOAPTemplate}
                            className="text-xs text-primary hover:underline"
                        >
                            Insert SOAP template
                        </button>
                    )}

                    {/* Note Content */}
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                            Note Content
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Enter your clinical notes here..."
                            rows={12}
                            className="w-full px-4 py-3 border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none font-mono"
                        />
                        <p className="text-xs text-text-secondary mt-1 text-right">
                            {content.length} characters
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border-light flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-text-secondary hover:bg-hover rounded-lg transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !content.trim()}
                        className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Note"}
                    </button>
                </div>
            </div>
        </div>
    );
}
