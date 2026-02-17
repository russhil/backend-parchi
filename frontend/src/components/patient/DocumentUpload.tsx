"use client";

import { useState, useRef } from "react";
import { uploadDocument } from "@/lib/api";

interface DocumentUploadProps {
    patientId: string;
    patientName: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function DocumentUpload({
    patientId,
    patientName,
    isOpen,
    onClose,
    onSuccess,
}: DocumentUploadProps) {
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState("");
    const [docType, setDocType] = useState("lab_report");
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            setFile(droppedFile);
            if (!title) {
                setTitle(droppedFile.name.replace(/\.[^/.]+$/, ""));
            }
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            if (!title) {
                setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
            }
        }
    };

    const handleUpload = async () => {
        if (!file || !title.trim()) return;

        setUploading(true);
        try {
            await uploadDocument(patientId, title.trim(), docType, file);
            setFile(null);
            setTitle("");
            onSuccess?.();
            onClose();
        } catch {
            // Handle error
        } finally {
            setUploading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-text-primary">Upload Document</h2>
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
                <div className="p-6 space-y-5">
                    {/* Drop Zone */}
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${dragActive
                            ? "border-primary bg-primary-light"
                            : file
                                ? "border-green-400 bg-green-50"
                                : "border-border-light hover:border-primary hover:bg-hover"
                            }`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".pdf,.txt,.doc,.docx,.jpg,.jpeg,.png"
                        />
                        <span
                            className={`material-symbols-outlined text-[40px] mb-2 block ${file ? "text-green-500" : "text-text-secondary"
                                }`}
                        >
                            {file ? "check_circle" : "cloud_upload"}
                        </span>
                        {file ? (
                            <>
                                <p className="text-sm font-semibold text-text-primary">{file.name}</p>
                                <p className="text-xs text-text-secondary mt-1">
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                            </>
                        ) : (
                            <>
                                <p className="text-sm font-semibold text-text-primary">
                                    Drop file here or click to browse
                                </p>
                                <p className="text-xs text-text-secondary mt-1">
                                    Supports PDF, TXT, DOC, images
                                </p>
                            </>
                        )}
                    </div>

                    {/* Title */}
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                            Document Title
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g., Blood Test Report - Feb 2026"
                            className="w-full px-4 py-2.5 border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                    </div>

                    {/* Document Type */}
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                            Document Type
                        </label>
                        <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value)}
                            className="w-full px-4 py-2.5 border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        >
                            <option value="lab_report">Lab Report</option>
                            <option value="imaging">Imaging / X-Ray / MRI</option>
                            <option value="prescription">Prescription</option>
                            <option value="referral">Referral Letter</option>
                            <option value="discharge">Discharge Summary</option>
                            <option value="other">Other</option>
                        </select>
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
                        onClick={handleUpload}
                        disabled={uploading || !file || !title.trim()}
                        className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
                    >
                        {uploading ? "Uploading..." : "Upload Document"}
                    </button>
                </div>
            </div>
        </div>
    );
}
