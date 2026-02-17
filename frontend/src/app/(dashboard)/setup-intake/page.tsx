"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    simpleSearchPatients,
    createSetupIntake,
    uploadParchi,
    processParchi,
    type ParchiEntry,
    type ParchiProcessResult,
} from "@/lib/api";

/* ── Shared Components ─────────────────────────────────────── */

function Input({ label, ...props }: any) {
    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
            <input
                className="w-full px-4 py-2 rounded-lg border border-border-light focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all bg-surface text-text-primary"
                {...props}
            />
        </div>
    );
}

function Button({ children, isLoading, onClick, variant = "primary", className = "", disabled = false }: any) {
    const base = "px-6 py-2 rounded-lg font-semibold transition-all active:scale-95 text-sm";
    const styles = variant === "primary"
        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
        : variant === "success"
            ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-500/20"
            : variant === "danger"
                ? "bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-500/20"
                : "bg-surface text-text-secondary border border-border-light hover:bg-hover";

    return (
        <button
            onClick={onClick}
            disabled={isLoading || disabled}
            className={`${base} ${styles} ${isLoading || disabled ? "opacity-70 cursor-not-allowed" : ""} ${className}`}
        >
            {isLoading ? "Processing..." : children}
        </button>
    );
}

/* ── Tab Type ──────────────────────────────────────────────── */

type TabMode = "manual" | "parchi";

/* ── Parchi Upload Panel ──────────────────────────────────── */

interface ParchiEntryEditable extends ParchiEntry {
    _selected: boolean;
}

function ParchiUploadPanel() {
    const [step, setStep] = useState<"upload" | "review" | "processing" | "done">("upload");
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [rawText, setRawText] = useState("");
    const [entries, setEntries] = useState<ParchiEntryEditable[]>([]);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Processing state
    const [isProcessing, setIsProcessing] = useState(false);
    const [results, setResults] = useState<ParchiProcessResult[]>([]);
    const [summary, setSummary] = useState<{ total: number; processed: number; duplicates: number; whatsapp_sent: number; errors: number } | null>(null);

    const handleFile = async (file: File) => {
        if (!file.type.startsWith("image/")) {
            setUploadError("Please select an image file (JPG, PNG, etc.)");
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target?.result as string);
        reader.readAsDataURL(file);

        setIsUploading(true);
        setUploadError("");

        try {
            const data = await uploadParchi(file);
            setRawText(data.raw_text);
            setEntries(
                data.entries.map((e) => ({
                    ...e,
                    _selected: true,
                }))
            );
            setStep("review");
        } catch (err: any) {
            setUploadError(err.message || "Failed to process image");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (file) handleFile(file);
                break;
            }
        }
    };

    const updateEntry = (idx: number, field: keyof ParchiEntry, value: string) => {
        setEntries((prev) => {
            const updated = [...prev];
            (updated[idx] as any)[field] = value;
            // Recalculate appointment_time if date or time changes
            if (field === "date" || field === "time") {
                const d = field === "date" ? value : updated[idx].date || "";
                const t = field === "time" ? value : updated[idx].time || "";
                if (d && t) {
                    try {
                        const dt = new Date(`${d}T${t}`);
                        updated[idx].appointment_time = dt.toISOString();
                    } catch { }
                }
            }
            return updated;
        });
    };

    const toggleEntry = (idx: number) => {
        setEntries((prev) => {
            const updated = [...prev];
            updated[idx] = { ...updated[idx], _selected: !updated[idx]._selected };
            return updated;
        });
    };

    const removeEntry = (idx: number) => {
        setEntries((prev) => prev.filter((_, i) => i !== idx));
    };

    const addEntry = () => {
        const today = new Date().toISOString().split("T")[0];
        setEntries((prev) => [
            ...prev,
            {
                name: "",
                phone: "",
                appointment_time: `${today}T09:00:00`,
                date: today,
                time: "09:00",
                _selected: true,
            },
        ]);
    };

    const handleProcess = async () => {
        const selected = entries.filter((e) => e._selected && e.name && e.phone);
        if (selected.length === 0) {
            setUploadError("Please select at least one valid entry (with name and phone).");
            return;
        }

        setIsProcessing(true);
        setUploadError("");
        setStep("processing");

        try {
            const data = await processParchi(
                selected.map((e) => ({
                    name: e.name,
                    phone: e.phone,
                    appointment_time: e.appointment_time,
                }))
            );
            setResults(data.results);
            setSummary(data.summary);
            setStep("done");
        } catch (err: any) {
            setUploadError(err.message || "Processing failed");
            setStep("review"); // Go back to review
        } finally {
            setIsProcessing(false);
        }
    };

    const reset = () => {
        setStep("upload");
        setEntries([]);
        setRawText("");
        setPreview(null);
        setResults([]);
        setSummary(null);
        setUploadError("");
    };

    /* ─ Upload Step ─ */
    if (step === "upload") {
        return (
            <div className="space-y-4" onPaste={handlePaste}>
                {/* Drop Zone */}
                <div
                    className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer ${isDragging
                        ? "border-primary bg-primary-light"
                        : "border-border-light hover:border-primary/50 hover:bg-hover"
                        }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleFile(f);
                        }}
                    />

                    {isUploading ? (
                        <div className="space-y-4">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                            <p className="text-blue-600 font-medium">Scanning parchi…</p>
                            <p className="text-sm text-text-secondary">Extracting text with Gemini Vision, then parsing with AI</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25">
                                <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                            </div>
                            <div>
                                <p className="text-lg font-semibold text-text-primary">
                                    Upload Parchi
                                </p>
                                <p className="text-sm text-text-secondary mt-1">
                                    Take a photo or drag & drop your handwritten appointment chit
                                </p>
                            </div>
                            <div className="flex items-center justify-center gap-3 text-xs text-text-secondary">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">touch_app</span>
                                    Tap to capture
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">upload</span>
                                    Drag & drop
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">content_paste</span>
                                    Paste image
                                </span>
                            </div>
                        </div>
                    )}
                </div>

                {uploadError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <p className="text-sm text-red-700 dark:text-red-300">{uploadError}</p>
                    </div>
                )}
            </div>
        );
    }

    /* ─ Review Step ─ */
    if (step === "review") {
        const selectedCount = entries.filter((e) => e._selected).length;
        return (
            <div className="space-y-4">
                {/* Preview + Raw text toggle */}
                <div className="flex items-start gap-3 sm:gap-4">
                    {preview && (
                        <img
                            src={preview}
                            alt="Parchi preview"
                            className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-lg border border-border-light flex-shrink-0"
                        />
                    )}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-text-primary mb-1 text-sm sm:text-base">
                            Extracted {entries.length} appointment{entries.length !== 1 ? "s" : ""}
                        </h3>
                        <details className="text-xs">
                            <summary className="text-text-secondary cursor-pointer hover:text-primary">
                                View raw OCR text
                            </summary>
                            <pre className="mt-2 p-2 bg-bg rounded-lg overflow-auto max-h-32 text-text-secondary whitespace-pre-wrap">
                                {rawText}
                            </pre>
                        </details>
                    </div>
                </div>

                {/* Desktop table (hidden on mobile) */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-xs text-text-secondary uppercase tracking-wider border-b border-border-light">
                                <th className="p-2 w-8"></th>
                                <th className="p-2">Name</th>
                                <th className="p-2">Phone</th>
                                <th className="p-2">Date</th>
                                <th className="p-2">Time</th>
                                <th className="p-2 w-8"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light">
                            {entries.map((entry, idx) => (
                                <tr key={idx} className={`${!entry._selected ? "opacity-40" : ""} transition-opacity`}>
                                    <td className="p-2">
                                        <input
                                            type="checkbox"
                                            checked={entry._selected}
                                            onChange={() => toggleEntry(idx)}
                                            className="w-4 h-4 rounded border-border-light text-primary focus:ring-primary"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            value={entry.name}
                                            onChange={(e) => updateEntry(idx, "name", e.target.value)}
                                            className="w-full bg-transparent border-b border-transparent hover:border-border-light focus:border-primary outline-none py-1 text-text-primary"
                                            placeholder="Patient Name"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            value={entry.phone}
                                            onChange={(e) => updateEntry(idx, "phone", e.target.value)}
                                            className="w-full bg-transparent border-b border-transparent hover:border-border-light focus:border-primary outline-none py-1 text-text-primary"
                                            placeholder="+91..."
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="date"
                                            value={entry.date || ""}
                                            onChange={(e) => updateEntry(idx, "date", e.target.value)}
                                            className="bg-transparent border-b border-transparent hover:border-border-light focus:border-primary outline-none py-1 text-text-primary"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input
                                            type="time"
                                            value={entry.time || ""}
                                            onChange={(e) => updateEntry(idx, "time", e.target.value)}
                                            className="bg-transparent border-b border-transparent hover:border-border-light focus:border-primary outline-none py-1 text-text-primary"
                                        />
                                    </td>
                                    <td className="p-2">
                                        <button onClick={() => removeEntry(idx)} className="text-text-secondary hover:text-red-500 transition-colors">
                                            <span className="material-symbols-outlined text-lg">close</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile card layout (hidden on desktop) */}
                <div className="md:hidden space-y-3">
                    {entries.map((entry, idx) => (
                        <div
                            key={idx}
                            className={`border border-border-light rounded-xl p-3 space-y-2 transition-opacity ${!entry._selected ? "opacity-40" : ""}`}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={entry._selected}
                                        onChange={() => toggleEntry(idx)}
                                        className="w-4 h-4 rounded border-border-light text-primary focus:ring-primary"
                                    />
                                    <span className="text-xs text-text-secondary font-medium">#{idx + 1}</span>
                                </div>
                                <button onClick={() => removeEntry(idx)} className="text-text-secondary hover:text-red-500 transition-colors">
                                    <span className="material-symbols-outlined text-lg">close</span>
                                </button>
                            </div>
                            <input
                                value={entry.name}
                                onChange={(e) => updateEntry(idx, "name", e.target.value)}
                                className="w-full bg-bg rounded-lg px-3 py-2 text-sm border border-border-light focus:border-primary outline-none text-text-primary"
                                placeholder="Patient Name"
                            />
                            <input
                                value={entry.phone}
                                onChange={(e) => updateEntry(idx, "phone", e.target.value)}
                                className="w-full bg-bg rounded-lg px-3 py-2 text-sm border border-border-light focus:border-primary outline-none text-text-primary"
                                placeholder="+91..."
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="date"
                                    value={entry.date || ""}
                                    onChange={(e) => updateEntry(idx, "date", e.target.value)}
                                    className="w-full bg-bg rounded-lg px-3 py-2 text-sm border border-border-light focus:border-primary outline-none text-text-primary"
                                />
                                <input
                                    type="time"
                                    value={entry.time || ""}
                                    onChange={(e) => updateEntry(idx, "time", e.target.value)}
                                    className="w-full bg-bg rounded-lg px-3 py-2 text-sm border border-border-light focus:border-primary outline-none text-text-primary"
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Add row button */}
                <button
                    onClick={addEntry}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Add entry
                </button>

                {uploadError && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                        <p className="text-sm text-red-700 dark:text-red-300">{uploadError}</p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-border-light">
                    <Button variant="secondary" onClick={reset}>
                        ← Re-upload
                    </Button>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <span className="text-sm text-text-secondary text-center">
                            {selectedCount} of {entries.length} selected
                        </span>
                        <Button
                            variant="success"
                            onClick={handleProcess}
                            disabled={selectedCount === 0}
                        >
                            <span className="flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-lg">send</span>
                                Send WhatsApp to {selectedCount} patient{selectedCount !== 1 ? "s" : ""}
                            </span>
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    /* ─ Processing Step ─ */
    if (step === "processing") {
        return (
            <div className="text-center py-12 space-y-4">
                <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-lg font-semibold text-text-primary">Processing appointments…</p>
                <p className="text-sm text-text-secondary">
                    Creating patients, appointments, and sending WhatsApp messages
                </p>
            </div>
        );
    }

    /* ─ Done Step ─ */
    return (
        <div className="space-y-4">
            {/* Summary banner */}
            {summary && (
                <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 sm:p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined">check_circle</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-emerald-900 dark:text-emerald-200">Parchi Processed!</h3>
                            <p className="text-sm text-emerald-700 dark:text-emerald-300">
                                {summary.processed} of {summary.total} processed •{" "}
                                {summary.whatsapp_sent} WhatsApp sent •{" "}
                                {summary.duplicates > 0 ? `${summary.duplicates} duplicate${summary.duplicates !== 1 ? "s" : ""} skipped • ` : ""}
                                {summary.errors > 0 ? `${summary.errors} errors` : "No errors"}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Per-result details */}
            <div className="space-y-2">
                {results.map((r, idx) => (
                    <div
                        key={idx}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border gap-2 ${r.error
                            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                            : "bg-surface border-border-light"
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm flex-shrink-0 ${r.error ? "bg-red-500" : r.is_duplicate ? "bg-text-secondary" : r.whatsapp_sent ? "bg-emerald-500" : "bg-amber-500"}`}>
                                <span className="material-symbols-outlined text-lg">
                                    {r.error ? "error" : r.is_duplicate ? "content_copy" : r.whatsapp_sent ? "check" : "warning"}
                                </span>
                            </div>
                            <div>
                                <p className="font-medium text-text-primary text-sm">
                                    {r.name}
                                    {r.is_new_patient && (
                                        <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                                            New
                                        </span>
                                    )}
                                    {r.is_duplicate && (
                                        <span className="ml-2 text-xs bg-muted text-text-secondary px-1.5 py-0.5 rounded-full">
                                            Duplicate
                                        </span>
                                    )}
                                </p>
                                <p className="text-xs text-text-secondary">{r.phone}</p>
                            </div>
                        </div>
                        <div className="text-right text-xs pl-11 sm:pl-0">
                            {r.error ? (
                                <span className="text-red-600">{r.error}</span>
                            ) : r.is_duplicate ? (
                                <span className="text-text-secondary flex items-center gap-1 justify-end">
                                    <span className="material-symbols-outlined text-sm">block</span>
                                    Already exists
                                </span>
                            ) : r.whatsapp_sent ? (
                                <span className="text-emerald-600 flex items-center gap-1 justify-end">
                                    <span className="material-symbols-outlined text-sm">chat</span>
                                    WhatsApp sent
                                </span>
                            ) : (
                                <span className="text-amber-600">
                                    {r.whatsapp_error || "WhatsApp not sent"}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="pt-3 flex justify-center">
                <Button onClick={reset} variant="primary">
                    <span className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">restart_alt</span>
                        Upload Another Parchi
                    </span>
                </Button>
            </div>
        </div>
    );
}

/* ── Manual Setup Panel (Original) ───────────────────────── */

function ManualSetupPanel() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedPatient, setSelectedPatient] = useState<any>(null);
    const [hasSearched, setHasSearched] = useState(false);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        date: "",
        time: "",
    });

    const [generatedLink, setGeneratedLink] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSearch = useCallback(async (searchQuery: string) => {
        if (!searchQuery.trim()) {
            setResults([]);
            setHasSearched(false);
            return;
        }
        setIsSearching(true);
        try {
            const data = await simpleSearchPatients(searchQuery);
            setResults(data.results || []);
            setHasSearched(true);
        } catch (err: any) {
            console.error(err);
            setError("Search failed. Please check if the backend is running.");
        } finally {
            setIsSearching(false);
        }
    }, []);

    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);

        if (!query.trim()) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        debounceTimer.current = setTimeout(() => handleSearch(query), 300);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [query, handleSearch]);

    const selectPatient = (p: any) => {
        setSelectedPatient(p);
        setFormData((prev) => ({ ...prev, name: p.patient_name, phone: p.phone || "" }));
    };

    const clearSelection = () => {
        setSelectedPatient(null);
        setFormData({ name: "", phone: "", date: "", time: "" });
        setResults([]);
        setQuery("");
    };

    const handleGenerate = async () => {
        if (!formData.name || !formData.phone || !formData.date || !formData.time) {
            setError("Please fill all fields.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const localDate = new Date(`${formData.date}T${formData.time}`);
            const isoString = localDate.toISOString();
            const data = await createSetupIntake({
                name: formData.name,
                phone: formData.phone,
                appointment_time: isoString,
                patient_id: selectedPatient?.patient_id || undefined,
            });
            setGeneratedLink(data.link);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(generatedLink);
        alert("Link copied to clipboard!");
    };

    return (
        <div className="space-y-6">
            <div className="bg-surface rounded-xl shadow-sm border border-border-light p-4 sm:p-6">
                <h2 className="text-lg font-semibold mb-4">1. Find or Add Patient</h2>

                {!selectedPatient ? (
                    <div className="space-y-4">
                        <div className="relative">
                            <input
                                className="w-full px-4 py-2 border border-border-light rounded-lg focus:ring-2 focus:ring-primary/30 outline-none bg-surface text-text-primary"
                                placeholder="Start typing to search by name, phone, or condition..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                            />
                            {isSearching && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                        {results.length > 0 && (
                            <div className="mt-4 border border-border-light rounded-lg divide-y divide-border-light bg-bg max-h-60 overflow-y-auto">
                                {results.map((r: any) => (
                                    <div key={r.patient_id} className="p-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center" onClick={() => selectPatient(r)}>
                                        <div>
                                            <p className="font-medium text-text-primary">{r.patient_name}</p>
                                            <p className="text-xs text-text-secondary">{r.phone}</p>
                                        </div>
                                        <button className="text-sm text-blue-600 font-medium">Select</button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {hasSearched && !isSearching && (
                            <div className="pt-4 border-t border-border-light mt-4 animate-in fade-in">
                                <p className="text-sm text-text-secondary mb-2">
                                    {results.length === 0 ? "No results found." : "Not seeing the right patient?"}
                                </p>
                                <Button variant="secondary" onClick={() => setSelectedPatient({ patient_id: null, patient_name: "" })}>
                                    + {results.length === 0 ? "Create New Patient" : "Add New Patient"}
                                </Button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">
                                {selectedPatient.patient_id ? "Existing Patient" : "New Patient"}
                            </span>
                            <p className="font-medium text-blue-900 dark:text-blue-200 text-lg">
                                {selectedPatient.patient_id ? selectedPatient.patient_name : "New Patient Entry"}
                            </p>
                        </div>
                        <Button variant="secondary" onClick={clearSelection} className="text-xs py-1 px-3">
                            Change
                        </Button>
                    </div>
                )}
            </div>

            {selectedPatient && (
                <div className="bg-surface rounded-xl shadow-sm border border-border-light p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-4">
                    <h2 className="text-lg font-semibold mb-4">2. Appointment Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input label="Patient Name" value={formData.name} onChange={(e: any) => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" />
                        <Input label="Phone Number" value={formData.phone} onChange={(e: any) => setFormData({ ...formData, phone: e.target.value })} placeholder="+1234567890" type="tel" />
                        <Input label="Date" type="date" value={formData.date} onChange={(e: any) => setFormData({ ...formData, date: e.target.value })} />
                        <Input label="Time" type="time" value={formData.time} onChange={(e: any) => setFormData({ ...formData, time: e.target.value })} />
                    </div>
                    {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
                    <Button onClick={handleGenerate} isLoading={loading} className="w-full py-3 text-lg mt-4">
                        Generate Intake Link
                    </Button>
                </div>
            )}

            {generatedLink && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center animate-in zoom-in duration-300">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-3xl">link</span>
                    </div>
                    <h3 className="text-xl font-bold text-green-900 dark:text-green-200 mb-2">Intake Link Created!</h3>
                    <p className="text-green-700 dark:text-green-300 mb-4">Share this secure link with the patient.</p>
                    <div className="flex items-center gap-2 max-w-md mx-auto bg-surface border border-green-200 dark:border-green-800 rounded-lg p-2 mb-4">
                        <input readOnly value={generatedLink} className="flex-1 bg-transparent border-none text-sm text-text-secondary outline-none w-full" />
                        <button onClick={copyLink} className="text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors">
                            Copy
                        </button>
                    </div>
                    <Button variant="secondary" onClick={() => window.location.reload()}>
                        Start New Intake
                    </Button>
                </div>
            )}
        </div>
    );
}

/* ── Main Page ────────────────────────────────────────────── */

export default function SetupIntakePage() {
    const [activeTab, setActiveTab] = useState<TabMode>("parchi");



    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6">
            <h1 className="text-xl sm:text-2xl font-bold text-text-primary mb-4 sm:mb-6">Setup Patient Intake</h1>

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl mb-4 sm:mb-6 w-full sm:w-fit">
                <button
                    onClick={() => setActiveTab("parchi")}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "parchi"
                        ? "bg-surface text-primary shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                        }`}
                >
                    <span className="material-symbols-outlined text-lg">photo_camera</span>
                    <span className="hidden xs:inline">Upload</span> Parchi
                </button>
                <button
                    onClick={() => setActiveTab("manual")}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "manual"
                        ? "bg-surface text-primary shadow-sm"
                        : "text-text-secondary hover:text-text-primary"
                        }`}
                >
                    <span className="material-symbols-outlined text-lg">edit_note</span>
                    Manual Entry
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === "parchi" ? (
                <div className="bg-surface rounded-xl shadow-sm border border-border-light p-4 sm:p-6">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-white text-xl">document_scanner</span>
                        </div>
                        <div>
                            <h2 className="font-semibold text-text-primary">Scan Parchi</h2>
                            <p className="text-xs text-text-secondary">
                                Upload a photo of your handwritten appointment chit — AI will extract & WhatsApp each patient
                            </p>
                        </div>
                    </div>
                    <ParchiUploadPanel />
                </div>
            ) : (
                <ManualSetupPanel />
            )}
        </div>
    );
}
