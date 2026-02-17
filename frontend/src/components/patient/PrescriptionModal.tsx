"use client";

import { useState } from "react";
import { createPrescription, PrescriptionMedication } from "@/lib/api";

interface PrescriptionModalProps {
    patientId: string;
    patientName: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

export default function PrescriptionModal({
    patientId,
    patientName,
    isOpen,
    onClose,
    onSuccess,
}: PrescriptionModalProps) {
    const [medications, setMedications] = useState<PrescriptionMedication[]>([
        { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
    ]);
    const [diagnosis, setDiagnosis] = useState("");
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    const addMedication = () => {
        setMedications([
            ...medications,
            { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
        ]);
    };

    const removeMedication = (index: number) => {
        setMedications(medications.filter((_, i) => i !== index));
    };

    const updateMedication = (
        index: number,
        field: keyof PrescriptionMedication,
        value: string
    ) => {
        const updated = [...medications];
        updated[index] = { ...updated[index], [field]: value };
        setMedications(updated);
    };

    const handleSave = async () => {
        const validMeds = medications.filter((m) => m.name.trim());
        if (validMeds.length === 0) return;

        setSaving(true);
        try {
            await createPrescription({
                patient_id: patientId,
                medications: validMeds,
                diagnosis,
                notes,
            });
            onSuccess?.();
            onClose();
        } catch {
            // Handle error
        } finally {
            setSaving(false);
        }
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
            <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border-light flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-text-primary">New Prescription</h2>
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
                <div className="p-6 overflow-y-auto max-h-[60vh] space-y-5">
                    {/* Diagnosis */}
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                            Diagnosis
                        </label>
                        <input
                            type="text"
                            value={diagnosis}
                            onChange={(e) => setDiagnosis(e.target.value)}
                            placeholder="e.g., Acute Bronchitis"
                            className="w-full px-4 py-2.5 border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                        />
                    </div>

                    {/* Medications */}
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                            Medications
                        </label>
                        <div className="space-y-3">
                            {medications.map((med, idx) => (
                                <div key={idx} className="bg-bg rounded-xl p-4 relative">
                                    {medications.length > 1 && (
                                        <button
                                            onClick={() => removeMedication(idx)}
                                            className="absolute top-2 right-2 p-1 rounded hover:bg-red-50 text-red-500"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">delete</span>
                                        </button>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <input
                                                type="text"
                                                value={med.name}
                                                onChange={(e) => updateMedication(idx, "name", e.target.value)}
                                                placeholder="Medication name"
                                                className="w-full px-3 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                            />
                                        </div>
                                        <input
                                            type="text"
                                            value={med.dosage}
                                            onChange={(e) => updateMedication(idx, "dosage", e.target.value)}
                                            placeholder="Dosage (e.g., 500mg)"
                                            className="px-3 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        />
                                        <input
                                            type="text"
                                            value={med.frequency}
                                            onChange={(e) => updateMedication(idx, "frequency", e.target.value)}
                                            placeholder="Frequency (e.g., BD)"
                                            className="px-3 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        />
                                        <input
                                            type="text"
                                            value={med.duration}
                                            onChange={(e) => updateMedication(idx, "duration", e.target.value)}
                                            placeholder="Duration (e.g., 5 days)"
                                            className="px-3 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        />
                                        <input
                                            type="text"
                                            value={med.instructions}
                                            onChange={(e) => updateMedication(idx, "instructions", e.target.value)}
                                            placeholder="Instructions"
                                            className="px-3 py-2 border border-border-light rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addMedication}
                            className="mt-3 flex items-center gap-1 text-primary text-sm font-medium hover:underline"
                        >
                            <span className="material-symbols-outlined text-[18px]">add</span>
                            Add Another Medication
                        </button>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">
                            Additional Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Any special instructions or notes..."
                            rows={3}
                            className="w-full px-4 py-2.5 border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-none"
                        />
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
                        disabled={saving || !medications.some((m) => m.name.trim())}
                        className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition disabled:opacity-50"
                    >
                        {saving ? "Saving..." : "Save Prescription"}
                    </button>
                </div>
            </div>
        </div>
    );
}
