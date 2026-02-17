"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getPatient } from "@/lib/api";
import type { PatientPageData, Document } from "@/types";

import DocumentViewerModal from "@/components/documents/DocumentViewerModal";

export default function PatientDocumentsPage() {
    const params = useParams();
    const router = useRouter();
    const patientId = params.id as string;
    const [data, setData] = useState<PatientPageData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>("all");
    const [viewDoc, setViewDoc] = useState<Document | null>(null);

    const loadPatient = useCallback(async () => {
        try {
            const result = await getPatient(patientId);
            setData(result);
        } catch {
            // Fallback will show error message
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => {
        loadPatient();
    }, [loadPatient]);

    if (loading) {
        return (
            <div className="p-4 md:p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-skeleton rounded w-48" />
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-skeleton rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!data || !data.documents) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <span className="material-symbols-outlined text-text-secondary text-[48px] mb-3 block">error</span>
                    <p className="text-text-secondary">Could not load documents.</p>
                    <button
                        onClick={() => router.back()}
                        className="mt-3 text-sm text-primary font-medium hover:underline"
                    >
                        ← Go Back
                    </button>
                </div>
            </div>
        );
    }

    const docIcon = (type: string) => {
        switch (type) {
            case "lab_report": return "lab_profile";
            case "referral": return "forward_to_inbox";
            case "prescription": return "medication";
            case "imaging": return "radiology";
            default: return "description";
        }
    };

    const docColor = (type: string) => {
        switch (type) {
            case "lab_report": return "text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30";
            case "referral": return "text-blue-600 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30";
            case "prescription": return "text-green-600 dark:text-green-300 bg-green-100 dark:bg-green-900/30";
            case "imaging": return "text-orange-600 dark:text-orange-300 bg-orange-100 dark:bg-orange-900/30";
            default: return "text-text-secondary bg-muted";
        }
    };

    const documentTypes = ["all", ...Array.from(new Set(data.documents.map(d => d.doc_type)))];
    const filteredDocs = filter === "all"
        ? data.documents
        : data.documents.filter(d => d.doc_type === filter);

    return (
        <div className="p-4 md:p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition mb-4"
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                        Back
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-white text-[24px] md:text-[28px]">folder_open</span>
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-text-primary">{data.patient.name}'s Documents</h1>
                            <p className="text-sm text-text-secondary mt-1">
                                {data.documents.length} documents total
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {documentTypes.map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilter(type)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${filter === type
                                ? "bg-primary text-white"
                                : "bg-surface border border-border-light text-text-secondary hover:bg-hover"
                                }`}
                        >
                            {type === "all" ? "All Documents" : type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                        </button>
                    ))}
                </div>

                {/* Documents Grid */}
                {filteredDocs.length > 0 ? (
                    <div className="space-y-3">
                        {filteredDocs.map((doc) => (
                            <div
                                key={doc.id}
                                className="bg-surface rounded-xl border border-border-light shadow-sm overflow-hidden hover:shadow-md transition"
                            >
                                <div className="flex items-center justify-between p-4">
                                    <button
                                        onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                                    >
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${docColor(doc.doc_type)}`}>
                                            <span className="material-symbols-outlined text-[20px]">{docIcon(doc.doc_type)}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-text-primary truncate">{doc.title}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-text-secondary">
                                                    {doc.doc_type.replace(/_/g, " ")}
                                                </span>
                                                <span className="text-xs text-text-secondary">•</span>
                                                <span className="text-xs text-text-secondary">
                                                    {new Date(doc.uploaded_at).toLocaleDateString("en-IN", {
                                                        day: "numeric",
                                                        month: "short",
                                                        year: "numeric"
                                                    })}
                                                </span>
                                            </div>
                                        </div>
                                    </button>

                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {doc.file_url && (
                                            <>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setViewDoc(doc);
                                                    }}
                                                    className="p-2 rounded-lg hover:bg-primary-light text-primary transition flex items-center gap-1 text-sm font-medium"
                                                    title="View document"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">visibility</span>
                                                    <span className="hidden sm:inline">View</span>
                                                </button>
                                                <a
                                                    href={doc.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 rounded-lg hover:bg-hover text-text-secondary transition"
                                                    onClick={(e) => e.stopPropagation()}
                                                    title="Download file"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">download</span>
                                                </a>
                                            </>
                                        )}
                                        <button
                                            onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                                            className="p-2 rounded-lg hover:bg-hover text-text-secondary transition"
                                        >
                                            <span
                                                className={`material-symbols-outlined text-[20px] transition-transform ${expandedDoc === doc.id ? "rotate-180" : ""
                                                    }`}
                                            >
                                                expand_more
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Expanded Content */}
                                {expandedDoc === doc.id && doc.extracted_text && (
                                    <div className="px-4 pb-4 border-t border-border-light">
                                        <div className="mt-4 bg-bg rounded-xl p-4 max-h-96 overflow-y-auto">
                                            <div className="flex items-center justify-between mb-3">
                                                <p className="text-xs font-bold text-text-secondary uppercase tracking-wide">
                                                    Extracted Text
                                                </p>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(doc.extracted_text || "");
                                                    }}
                                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                                    Copy
                                                </button>
                                            </div>
                                            <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">
                                                {doc.extracted_text}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {expandedDoc === doc.id && !doc.extracted_text && (
                                    <div className="px-4 pb-4 border-t border-border-light">
                                        <div className="mt-4 text-center py-8">
                                            <span className="material-symbols-outlined text-text-secondary text-[32px] mb-2 block">
                                                text_fields_alt
                                            </span>
                                            <p className="text-sm text-text-secondary">
                                                No extracted text available for this document
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-surface rounded-xl border border-border-light p-12 text-center">
                        <span className="material-symbols-outlined text-text-secondary text-[48px] mb-3 block">
                            folder_off
                        </span>
                        <p className="text-sm text-text-secondary">
                            {filter === "all" ? "No documents uploaded yet" : `No ${filter.replace(/_/g, " ")} documents`}
                        </p>
                    </div>
                )}
            </div>

            {/* View Document Modal */}
            {viewDoc && (
                <DocumentViewerModal
                    document={viewDoc}
                    onClose={() => setViewDoc(null)}
                />
            )}
        </div>
    );
}
