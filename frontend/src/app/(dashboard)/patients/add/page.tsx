"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPatient, type CreatePatientData } from "@/lib/api";

interface FormData {
    name: string;
    age: string;
    gender: string;
    phone: string;
    email: string;
    address: string;
    height_cm: string;
    weight_kg: string;
    conditions: string;
    medications: string;
    allergies: string;
    bp_systolic: string;
    bp_diastolic: string;
    spo2: string;
    heart_rate: string;
    temperature_f: string;
}

const initialFormData: FormData = {
    name: "",
    age: "",
    gender: "",
    phone: "",
    email: "",
    address: "",
    height_cm: "",
    weight_kg: "",
    conditions: "",
    medications: "",
    allergies: "",
    bp_systolic: "",
    bp_diastolic: "",
    spo2: "",
    heart_rate: "",
    temperature_f: "",
};

export default function AddPatientPage() {
    const router = useRouter();
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!formData.name.trim()) {
            setError("Patient name is required");
            return;
        }

        setIsSubmitting(true);

        try {
            // Build the patient data object
            const patientData: CreatePatientData = {
                name: formData.name.trim(),
            };

            // Add optional fields
            if (formData.age) patientData.age = parseInt(formData.age, 10);
            if (formData.gender) patientData.gender = formData.gender;
            if (formData.phone) patientData.phone = formData.phone.trim();
            if (formData.email) patientData.email = formData.email.trim();
            if (formData.address) patientData.address = formData.address.trim();
            if (formData.height_cm) patientData.height_cm = parseFloat(formData.height_cm);
            if (formData.weight_kg) patientData.weight_kg = parseFloat(formData.weight_kg);

            // Parse comma-separated lists
            if (formData.conditions.trim()) {
                patientData.conditions = formData.conditions.split(",").map((s) => s.trim()).filter(Boolean);
            }
            if (formData.medications.trim()) {
                patientData.medications = formData.medications.split(",").map((s) => s.trim()).filter(Boolean);
            }
            if (formData.allergies.trim()) {
                patientData.allergies = formData.allergies.split(",").map((s) => s.trim()).filter(Boolean);
            }

            // Build vitals object if any vitals are provided
            const vitals: CreatePatientData["vitals"] = {};
            if (formData.bp_systolic) vitals.bp_systolic = parseInt(formData.bp_systolic, 10);
            if (formData.bp_diastolic) vitals.bp_diastolic = parseInt(formData.bp_diastolic, 10);
            if (formData.spo2) vitals.spo2 = parseInt(formData.spo2, 10);
            if (formData.heart_rate) vitals.heart_rate = parseInt(formData.heart_rate, 10);
            if (formData.temperature_f) vitals.temperature_f = parseFloat(formData.temperature_f);

            if (Object.keys(vitals).length > 0) {
                patientData.vitals = vitals;
            }

            const result = await createPatient(patientData);

            // Navigate to the new patient's page
            router.push(`/patient/${result.patient.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create patient");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-4 md:p-6 min-h-screen">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-6 md:mb-8">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition mb-4"
                    >
                        <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                        Back
                    </button>
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
                            <span className="material-symbols-outlined text-white text-[24px] md:text-[28px]">person_add</span>
                        </div>
                        <div>
                            <h1 className="text-xl md:text-2xl font-bold text-text-primary">Add New Patient</h1>
                            <p className="text-xs md:text-sm text-text-secondary mt-1">
                                Fill in the patient information below
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

                    {/* Basic Information */}
                    <div className="bg-surface rounded-2xl border border-border-light shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border-light bg-gradient-to-r from-primary/5 to-transparent">
                            <h2 className="font-semibold text-text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary text-[20px]">badge</span>
                                Basic Information
                            </h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Name - Required */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="e.g., John Doe"
                                    className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                                    required
                                />
                            </div>

                            {/* Age */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Age
                                </label>
                                <input
                                    type="number"
                                    name="age"
                                    value={formData.age}
                                    onChange={handleChange}
                                    placeholder="e.g., 35"
                                    min="0"
                                    max="150"
                                    className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                                />
                            </div>

                            {/* Gender */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Gender
                                </label>
                                <select
                                    name="gender"
                                    value={formData.gender}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition appearance-none cursor-pointer"
                                >
                                    <option value="">Select gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                    <option value="Prefer not to say">Prefer not to say</option>
                                </select>
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="e.g., +1 234 567 8900"
                                    className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="e.g., john.doe@email.com"
                                    className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                                />
                            </div>

                            {/* Address */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Address
                                </label>
                                <textarea
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    placeholder="e.g., 123 Main St, City, State 12345"
                                    rows={2}
                                    className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Physical Measurements */}
                    <div className="bg-surface rounded-2xl border border-border-light shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border-light bg-gradient-to-r from-green-500/5 to-transparent">
                            <h2 className="font-semibold text-text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-green-600 text-[20px]">straighten</span>
                                Physical Measurements
                            </h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Height */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Height (cm)
                                </label>
                                <input
                                    type="number"
                                    name="height_cm"
                                    value={formData.height_cm}
                                    onChange={handleChange}
                                    placeholder="e.g., 175"
                                    step="0.1"
                                    min="0"
                                    className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                                />
                            </div>

                            {/* Weight */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Weight (kg)
                                </label>
                                <input
                                    type="number"
                                    name="weight_kg"
                                    value={formData.weight_kg}
                                    onChange={handleChange}
                                    placeholder="e.g., 70"
                                    step="0.1"
                                    min="0"
                                    className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Vitals */}
                    <div className="bg-surface rounded-2xl border border-border-light shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border-light bg-gradient-to-r from-red-500/5 to-transparent">
                            <h2 className="font-semibold text-text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-red-500 text-[20px]">monitor_heart</span>
                                Current Vitals
                            </h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {/* Blood Pressure */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Blood Pressure (Systolic)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name="bp_systolic"
                                        value={formData.bp_systolic}
                                        onChange={handleChange}
                                        placeholder="e.g., 120"
                                        min="0"
                                        max="300"
                                        className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition pr-16"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-text-secondary">mmHg</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Blood Pressure (Diastolic)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name="bp_diastolic"
                                        value={formData.bp_diastolic}
                                        onChange={handleChange}
                                        placeholder="e.g., 80"
                                        min="0"
                                        max="200"
                                        className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition pr-16"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-text-secondary">mmHg</span>
                                </div>
                            </div>

                            {/* SpO2 */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Oxygen Saturation (SpO2)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name="spo2"
                                        value={formData.spo2}
                                        onChange={handleChange}
                                        placeholder="e.g., 98"
                                        min="0"
                                        max="100"
                                        className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition pr-12"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-text-secondary">%</span>
                                </div>
                            </div>

                            {/* Heart Rate */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Heart Rate
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name="heart_rate"
                                        value={formData.heart_rate}
                                        onChange={handleChange}
                                        placeholder="e.g., 72"
                                        min="0"
                                        max="300"
                                        className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition pr-14"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-text-secondary">bpm</span>
                                </div>
                            </div>

                            {/* Temperature */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Temperature
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        name="temperature_f"
                                        value={formData.temperature_f}
                                        onChange={handleChange}
                                        placeholder="e.g., 98.6"
                                        step="0.1"
                                        min="90"
                                        max="110"
                                        className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition pr-12"
                                    />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-text-secondary">°F</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Medical History */}
                    <div className="bg-surface rounded-2xl border border-border-light shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-border-light bg-gradient-to-r from-purple-500/5 to-transparent">
                            <h2 className="font-semibold text-text-primary flex items-center gap-2">
                                <span className="material-symbols-outlined text-purple-600 text-[20px]">medical_information</span>
                                Medical History
                            </h2>
                        </div>
                        <div className="p-6 space-y-5">
                            {/* Existing Conditions */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Existing Conditions
                                </label>
                                <textarea
                                    name="conditions"
                                    value={formData.conditions}
                                    onChange={handleChange}
                                    placeholder="Enter conditions separated by commas (e.g., Hypertension, Type 2 Diabetes, Asthma)"
                                    rows={2}
                                    className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                                />
                                <p className="text-xs text-text-secondary mt-1.5">Separate multiple conditions with commas</p>
                            </div>

                            {/* Current Medications */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Current Medications
                                </label>
                                <textarea
                                    name="medications"
                                    value={formData.medications}
                                    onChange={handleChange}
                                    placeholder="Enter medications separated by commas (e.g., Lisinopril 10mg, Metformin 500mg)"
                                    rows={2}
                                    className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                                />
                                <p className="text-xs text-text-secondary mt-1.5">Separate multiple medications with commas</p>
                            </div>

                            {/* Allergies */}
                            <div>
                                <label className="block text-sm font-medium text-text-primary mb-2">
                                    Known Allergies
                                </label>
                                <textarea
                                    name="allergies"
                                    value={formData.allergies}
                                    onChange={handleChange}
                                    placeholder="Enter allergies separated by commas (e.g., Penicillin, Shellfish, Latex)"
                                    rows={2}
                                    className="w-full px-4 py-3 bg-bg border border-border-light rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition resize-none"
                                />
                                <p className="text-xs text-text-secondary mt-1.5">Separate multiple allergies with commas</p>
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
                                    <span className="material-symbols-outlined text-[20px]">person_add</span>
                                    Add Patient
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
