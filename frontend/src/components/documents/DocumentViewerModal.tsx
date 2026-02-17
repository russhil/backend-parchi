"use client";

import { useEffect, useState } from "react";
import type { Document } from "@/types";

interface DocumentViewerModalProps {
    document: Document | null;
    onClose: () => void;
}

export default function DocumentViewerModal({ document, onClose }: DocumentViewerModalProps) {
    const [loading, setLoading] = useState(true);

    // Reset loading state when document changes
    useEffect(() => {
        if (document) {
            setLoading(true);
        }
    }, [document]);

    if (!document) return null;

    const isImage = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(document.file_url || "") ||
        document.doc_type === "imaging" ||
        document.file_url?.startsWith("data:image");

    const isPdf = /\.(pdf)(\?.*)?$/i.test(document.file_url || "") ||
        document.file_url?.startsWith("data:application/pdf") ||
        document.doc_type === "lab_report" || // Lab reports are often PDFs
        document.doc_type === "referral" ||   // Referrals are often PDFs
        document.doc_type === "prescription"; // Prescriptions are often PDFs

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Container */}
            <div className="bg-white rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border-light bg-surface z-10">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-primary-light text-primary`}>
                            <span className="material-symbols-outlined text-[24px]">
                                {isImage ? "image" : "picture_as_pdf"}
                            </span>
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-text-primary line-clamp-1">
                                {document.title}
                            </h3>
                            <p className="text-xs text-text-secondary">
                                {document.doc_type.replace(/_/g, " ")} • {new Date(document.uploaded_at).toLocaleDateString()}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {document.file_url && (
                            <a
                                href={document.file_url}
                                download
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg hover:bg-hover text-text-secondary transition"
                                title="Download"
                            >
                                <span className="material-symbols-outlined text-[20px]">download</span>
                            </a>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-red-50 text-text-secondary hover:text-red-600 transition"
                            title="Close"
                        >
                            <span className="material-symbols-outlined text-[20px]">close</span>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 bg-bg relative overflow-hidden flex items-center justify-center">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-surface z-10">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    )}

                    {document.file_url ? (
                        isPdf ? (
                            <iframe
                                src={document.file_url}
                                className="w-full h-full border-none"
                                onLoad={() => setLoading(false)}
                                title={document.title}
                            />
                        ) : isImage ? (
                            <img
                                src={document.file_url}
                                alt={document.title}
                                className="max-w-full max-h-full object-contain p-4"
                                onLoad={() => setLoading(false)}
                                onError={() => setLoading(false)}
                            />
                        ) : (
                            <iframe
                                src={document.file_url}
                                className="w-full h-full border-none"
                                onLoad={() => setLoading(false)}
                                title={document.title}
                            />
                        )
                    ) : (
                        <div className="text-center p-8">
                            <span className="material-symbols-outlined text-text-secondary text-[64px] mb-4 block">
                                broken_image
                            </span>
                            <p className="text-text-secondary">No file URL available for this document.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Backdrop Click to Close */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
    );
}
