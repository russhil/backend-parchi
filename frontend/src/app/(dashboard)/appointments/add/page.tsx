"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getPatients, createAppointment, uploadDocument } from "@/lib/api";

interface Patient {
    id: string;
    name: string;
}

interface UploadedFile {
    file: File;
    title: string;
    docType: string;
    status: "pending" | "uploading" | "done" | "error";
    error?: string;
}

interface FormData {
    patient_id: string;
    date: string;
    time: string;
    reason: string;
    status: string;
}

const initialFormData: FormData = {
    patient_id: "",
    date: "",
    time: "",
    reason: "",
    status: "scheduled",
};

export default function AddAppointmentPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [files, setFiles] = useState<UploadedFile[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingPatients, setLoadingPatients] = useState(true);

    useEffect(() => {
        async function loadPatients() {
            try {
                const data = await getPatients();
                setPatients(data.patients || []);
            } catch {
                setError("Failed to load patients");
            } finally {
                setLoadingPatients(false);
            }
        }
        loadPatients();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = e.target.files;
        if (!selectedFiles) return;

        const newFiles: UploadedFile[] = Array.from(selectedFiles).map((file) => ({
            file,
            title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for title
            docType: "general",
            status: "pending",
        }));

        setFiles((prev) => [...prev, ...newFiles]);
    };

    const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const droppedFiles = e.dataTransfer.files;
        if (!droppedFiles) return;

        const newFiles: UploadedFile[] = Array.from(droppedFiles).map((file) => ({
            file,
            title: file.name.replace(/\.[^/.]+$/, ""),
            docType: "general",
            status: "pending",
        }));

        setFiles((prev) => [...prev, ...newFiles]);
    };

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index));
    };

    const updateFileTitle = (index: number, title: string) => {
        setFiles((prev) =>
            prev.map((f, i) => (i === index ? { ...f, title } : f))
        );
    };

    const updateFileDocType = (index: number, docType: string) => {
        setFiles((prev) =>
            prev.map((f, i) => (i === index ? { ...f, docType } : f))
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.patient_id) {
            setError("Please select a patient");
            return;
        }

        if (!formData.date || !formData.time) {
            setError("Please select date and time");
            return;
        }

        if (!formData.reason.trim()) {
            setError("Please enter a reason for the appointment");
            return;
        }

        setIsSubmitting(true);

        try {
            // Combine date and time into ISO string
            const startTime = new Date(`${formData.date}T${formData.time}`).toISOString();

            // 1. Create the appointment
            await createAppointment({
                patient_id: formData.patient_id,
                start_time: startTime,
                reason: formData.reason.trim(),
                status: formData.status,
            });

            // 2. Upload any attached documents
            for (let i = 0; i < files.length; i++) {
                const fileItem = files[i];
                setFiles((prev) =>
                    prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" } : f))
                );

                try {
                    await uploadDocument(
                        formData.patient_id,
                        fileItem.title,
                        fileItem.docType,
                        fileItem.file
                    );
                    setFiles((prev) =>
                        prev.map((f, idx) => (idx === i ? { ...f, status: "done" } : f))
                    );
                } catch (uploadErr) {
                    setFiles((prev) =>
                        prev.map((f, idx) =>
                            idx === i
                                ? { ...f, status: "error", error: uploadErr instanceof Error ? uploadErr.message : "Upload failed" }
                                : f
                        )
                    );
                }
            }

            // Navigate to appointments list
            router.push("/appointments");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create appointment");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-6 min-h-screen">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition mb-4"
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                        Back
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg">
                            <span className="material-symbols-outlined text-white text-[28px]">calendar_add_on</span>
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-text-primary">New Appointment</h1>
                            <p className="text-sm text-text-secondary mt-1">
                                Schedule an appointment and attach documents
                            </p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                            <span className="material-symbols-outlined text-red-500">error</span>
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Appointment Details */}
                    <div className="bg-surface rounded-2xl border border-border-light shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border-light bg-gradient-to-r from-primary/5 to-transparent">
                            <h2 className="font-semibold text-text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[20px]">event</span>
                                Appointment Details
                            </h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Patient Selector */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Patient <span className="text-red-500">*</span>
                                </label>
                                <select
                                    name="patient_id"
                                    value={formData.patient_id}
                                    onChange={handleChange}
                                    disabled={loadingPatients}
                                    className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none cursor-pointer disabled:opacity-50"
                                    required
                                >
                                    <option value="">
                                        {loadingPatients ? "Loading patients..." : "Select a patient"}
                                    </option>
                                    {patients.map((patient) => (
                                        <option key={patient.id} value={patient.id}>
                                            {patient.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    min={new Date().toISOString().split("T")[0]}
                                    className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                                    required
                                />
                            </div>

                            {/* Time */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Time <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="time"
                                    name="time"
                                    value={formData.time}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                                    required
                                />
                            </div>

                            {/* Reason */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Reason for Visit <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    name="reason"
                                    value={formData.reason}
                                    onChange={handleChange}
                                    placeholder="e.g., Follow-up checkup, Blood test results review, Annual physical"
                                    rows={2}
                                    className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                                    required
                                />
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none cursor-pointer"
                                >
                                    <option value="scheduled">Scheduled</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Document Upload Section */}
                    <div className="bg-surface rounded-2xl border border-border-light shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border-light bg-gradient-to-r from-green-500/5 to-transparent">
                            <h2 className="font-semibold text-text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-600 text-[20px]">upload_file</span>
                                Attach Documents
                                <span className="text-xs text-text-secondary font-normal ml-2">(Optional)</span>
                            </h2>
                        </div>
                        <div className="p-6">
                            {/* Drop Zone */}
                            <div
                                onDrop={handleFileDrop}
                                onDragOver={(e) => e.preventDefault()}
                                className="border-2 border-dashed border-border-light rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition cursor-pointer"
                                onClick={() => document.getElementById("file-input")?.click()}
                            >
                                <span className="material-symbols-outlined text-[48px] text-text-secondary mb-3 block">
                                    cloud_upload
                                </span>
                                <p className="text-sm text-text-secondary mb-1">
                                    Drag and drop files here, or click to browse
                                </p>
                                <p className="text-xs text-text-secondary">
                                    Supports PDF, images (PNG, JPG), and text files
                                </p>
                                <input
                                    id="file-input"
                                    type="file"
                                    multiple
                                    accept=".pdf,.png,.jpg,.jpeg,.gif,.bmp,.txt,.doc,.docx"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </div>

                            {/* File List */}
                            {files.length > 0 && (
                                <div className="mt-4 space-y-3">
                                    {files.map((fileItem, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center gap-4 p-4 bg-bg rounded-xl border border-border-light"
                                        >
                                            {/* File Icon */}
                                            <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center">
                                                <span className="material-symbols-outlined text-primary text-[20px]">
                                                    {fileItem.file.type.includes("pdf")
                                                        ? "picture_as_pdf"
                                                        : fileItem.file.type.includes("image")
                                                            ? "image"
                                                            : "description"}
                                                </span>
                                            </div>

                                            {/* File Details */}
                                            <div className="flex-1 min-w-0">
                                                <input
                                                    type="text"
                                                    value={fileItem.title}
                                                    onChange={(e) => updateFileTitle(index, e.target.value)}
                                                    placeholder="Document title"
                                                    className="w-full text-sm font-medium text-text-primary bg-transparent border-none focus:outline-none focus:ring-0"
                                                />
                                                <p className="text-xs text-text-secondary truncate">
                                                    {fileItem.file.name} • {(fileItem.file.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>

                                            {/* Document Type */}
                                            <select
                                                value={fileItem.docType}
                                                onChange={(e) => updateFileDocType(index, e.target.value)}
                                                className="px-3 py-1.5 text-xs bg-surface border border-border-light rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            >
                                                <option value="general">General</option>
                                                <option value="lab_report">Lab Report</option>
                                                <option value="prescription">Prescription</option>
                                                <option value="imaging">Imaging</option>
                                                <option value="referral">Referral</option>
                                            </select>

                                            {/* Status Indicator */}
                                            {fileItem.status === "uploading" && (
                                                <span className="material-symbols-outlined animate-spin text-primary text-[20px]">
                                                    progress_activity
                                                </span>
                                            )}
                                            {fileItem.status === "done" && (
                                                <span className="material-symbols-outlined text-green-500 text-[20px]">
                                                    check_circle
                                                </span>
                                            )}
                                            {fileItem.status === "error" && (
                                                <span className="material-symbols-outlined text-red-500 text-[20px]" title={fileItem.error}>
                                                    error
                                                </span>
                                            )}

                                            {/* Remove Button */}
                                            {fileItem.status === "pending" && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeFile(index)}
                                                    className="p-1 rounded-lg hover:bg-red-50 text-text-secondary hover:text-red-500 transition"
                                                >
                                                    <span className="material-symbols-outlined text-[20px]">close</span>
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* OCR Info */}
                            <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-3">
                                <span className="material-symbols-outlined text-blue-500 text-[20px] mt-0.5">info</span>
                                <div>
                                    <p className="text-xs text-blue-700 font-medium">Document Text Extraction</p>
                                    <p className="text-xs text-blue-600 mt-0.5">
                                        Uploaded documents are automatically processed with OCR. The extracted text will be available for AI-powered queries and insights.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-4 pt-2">
                        <button
                            type="button"
                            onClick={() => router.back()}
                            className="px-6 py-3 rounded-xl text-sm font-semibold text-text-secondary hover:text-text-primary hover:bg-hover transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-primary/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                                    Create Appointment
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
