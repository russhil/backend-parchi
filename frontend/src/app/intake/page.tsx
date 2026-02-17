"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";

// --- Components ---

function Input({ label, ...props }: any) {
    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <input
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-slate-900 dark:text-slate-100"
                {...props}
            />
        </div>
    );
}

function TextArea({ label, ...props }: any) {
    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <textarea
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm min-h-[100px] text-slate-900 dark:text-slate-100"
                {...props}
            />
        </div>
    );
}

function Select({ label, options, ...props }: any) {
    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
            <select
                className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white/50 dark:bg-slate-700/50 backdrop-blur-sm text-slate-900 dark:text-slate-100"
                {...props}
            >
                {options.map((opt: string) => (
                    <option key={opt} value={opt}>{opt}</option>
                ))}
            </select>
        </div>
    );
}

function Button({ children, isLoading, onClick, variant = "primary" }: any) {
    const base = "w-full py-3 rounded-xl font-semibold transition-all shadow-lg active:scale-95";
    const styles = variant === "primary"
        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/20"
        : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600";

    return (
        <button
            onClick={onClick}
            disabled={isLoading}
            className={`${base} ${styles} ${isLoading ? "opacity-70 cursor-not-allowed" : ""}`}
        >
            {isLoading ? "Processing..." : children}
        </button>
    );
}

function MultiSelect({ label, options, selected, onChange }: any) {
    const toggle = (opt: string) => {
        if (selected.includes(opt)) {
            onChange(selected.filter((s: string) => s !== opt));
        } else {
            onChange([...selected, opt]);
        }
    };

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map((opt: string) => {
                    const isActive = selected.includes(opt);
                    return (
                        <button
                            key={opt}
                            type="button"
                            onClick={() => toggle(opt)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${isActive
                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                                : "bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600"
                                }`}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// --- Main Page ---

export default function IntakePage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // State
    const [formData, setFormData] = useState({
        name: "", // Will ask manually if new
        dob: "",
        gender: "Other",
        email: "",
        phone: "", // Will come from phone.email
        address: "",
        height_cm: "",
        weight_kg: "",
        conditions: [] as string[],
        medications: "",
        allergies: "",
        history: "",
        reason: "",
        symptoms: "",
        documents: [] as any[], // {name, url}
    });

    const [existingPatient, setExistingPatient] = useState<{ id: string, name: string } | null>(null);

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setLoading(true);

        try {
            // Upload sequentially
            const newDocs: { name: string; url: string }[] = [];
            const failedFiles: string[] = [];

            for (const file of files) {
                const data = new FormData();
                data.append("file", file);

                try {
                    const res = await fetch("http://localhost:8000/upload", {
                        method: "POST",
                        body: data,
                    });

                    if (!res.ok) {
                        failedFiles.push(file.name);
                        continue;
                    }

                    const json = await res.json();
                    newDocs.push({ name: file.name, url: json.url });
                } catch (uploadErr) {
                    failedFiles.push(file.name);
                }
            }

            setFormData(prev => ({
                ...prev,
                documents: [...prev.documents, ...newDocs]
            }));

            if (failedFiles.length > 0) {
                setError(`Failed to upload: ${failedFiles.join(", ")}`);
            } else if (newDocs.length === 0) {
                setError("No files were uploaded successfully.");
            }

        } catch (err) {
            setError("An unexpected error occurred during upload.");
        } finally {
            setLoading(false);
            // Reset input value to allow re-uploading same file if needed
            e.target.value = "";
        }
    };

    // --- Phone Email Logic ---

    useEffect(() => {
        // Expose function to global scope for the script to call
        (window as any).phoneEmailListener = async (userObj: any) => {
            const user_json_url = userObj.user_json_url;
            console.log("Phone verification success:", user_json_url);

            setLoading(true);
            try {
                const res = await fetch("http://localhost:8000/intake/verify-phone", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_json_url })
                });

                if (!res.ok) throw new Error("Verification failed");
                const data = await res.json();

                // Update phone
                setFormData(prev => ({ ...prev, phone: data.phone }));

                if (data.existing_patient) {
                    setExistingPatient(data.existing_patient);
                    setStep(4);
                } else {
                    // New patient -> Go to identity/profile
                    setStep(3);
                }

            } catch (err) {
                console.error(err);
                setError("Phone verification failed on server.");
            } finally {
                setLoading(false);
            }
        };
    }, []);


    const handleSubmit = async () => {
        setLoading(true);
        try {
            const payload = {
                ...formData,
                patient_id: existingPatient?.id || null,
                medications: formData.medications.split("\n").filter(Boolean),
                allergies: formData.allergies.split("\n").filter(Boolean),
                height_cm: formData.height_cm ? Number(formData.height_cm) : null,
                weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
            };

            const res = await fetch("http://localhost:8000/intake/submit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || "Submission failed");
            }

            setStep(5); // Success
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // --- Renders ---

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 font-sans text-slate-900 dark:text-slate-100">
            <Script src="https://www.phone.email/sign_in_button_v1.js" strategy="lazyOnload" />

            <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h1 className="text-3xl font-bold mb-2">Patient Intake</h1>
                        <p className="text-blue-100">Parchi.ai Clinic • Secure Form</p>
                    </div>
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/30 rounded-full translate-y-1/2 -translate-x-1/2 blur-xl" />
                </div>

                {/* content */}
                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-2 text-sm">
                            ⚠️ {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-xl font-semibold mb-2 text-slate-800 dark:text-slate-100">Verify Your Phone Number</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-8">
                                To protect your medical records, please verify your phone number to continue.
                            </p>

                            {/* Phone Email Button Container */}
                            <div className="flex justify-center">
                                <div className="pe_signin_button" data-client-id="15432560783753349440"></div>
                            </div>

                            {loading && <p className="text-sm text-blue-600 mt-4 animate-pulse">Verifying...</p>}
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">New Patient Profile</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mb-4">You are verified as {formData.phone}. Please complete your profile.</p>

                            <Input label="Full Name" value={formData.name} onChange={(e: any) => handleChange("name", e.target.value)} placeholder="Jane Doe" required />

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Date of Birth" type="date" value={formData.dob} onChange={(e: any) => handleChange("dob", e.target.value)} required />
                                <Input label="Email" type="email" value={formData.email} onChange={(e: any) => handleChange("email", e.target.value)} required />
                            </div>

                            <Input label="Home Address" value={formData.address} onChange={(e: any) => handleChange("address", e.target.value)} />

                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Height (cm)" type="number" value={formData.height_cm} onChange={(e: any) => handleChange("height_cm", e.target.value)} />
                                <Input label="Weight (kg)" type="number" value={formData.weight_kg} onChange={(e: any) => handleChange("weight_kg", e.target.value)} />
                            </div>

                            <Select
                                label="Gender"
                                options={["Male", "Female", "Non-binary", "Other", "Prefer not to say"]}
                                value={formData.gender}
                                onChange={(e: any) => handleChange("gender", e.target.value)}
                            />

                            <MultiSelect
                                label="Chronic Conditions"
                                options={["Hypertension", "Type 2 Diabetes", "Asthma", "Obesity", "Hyperlipidemia", "None"]}
                                selected={formData.conditions}
                                onChange={(val: any) => handleChange("conditions", val)}
                            />

                            <TextArea
                                label="Current Medications (Name & Dosage)"
                                value={formData.medications}
                                onChange={(e: any) => handleChange("medications", e.target.value)}
                                placeholder="e.g. Lisinopril 10mg once daily"
                            />

                            <TextArea
                                label="Allergies (Name & Reaction)"
                                value={formData.allergies}
                                onChange={(e: any) => handleChange("allergies", e.target.value)}
                                placeholder="e.g. Penicillin - Hives"
                            />

                            <TextArea
                                label="Past Medical History"
                                value={formData.history}
                                onChange={(e: any) => handleChange("history", e.target.value)}
                                placeholder="Major surgeries, hospitalizations, family history..."
                            />

                            <Button onClick={() => setStep(4)}>
                                Next: Visit Details
                            </Button>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">Visit Details</h2>
                            {existingPatient && (
                                <p className="text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-2 rounded-lg text-sm mb-4">
                                    Welcome back, {existingPatient.name}.
                                </p>
                            )}

                            <Input
                                label="Reason for Visit (Chief Complaint)"
                                value={formData.reason}
                                onChange={(e: any) => handleChange("reason", e.target.value)}
                                placeholder="e.g. Stomach pain"
                                required
                            />

                            <TextArea
                                label="Detailed Symptoms"
                                value={formData.symptoms}
                                onChange={(e: any) => handleChange("symptoms", e.target.value)}
                                placeholder="Describe your symptoms, when they started, severity..."
                                required
                            />

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Upload Documents (Labs, Referrals)</label>
                                <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer relative group">
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.png"
                                        multiple
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="text-slate-400 dark:text-slate-500 group-hover:text-blue-500 transition-colors">
                                        <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                        <p className="text-sm">Click to upload or drag and drop</p>
                                        <p className="text-xs mt-1">PDF, JPG, PNG up to 10MB</p>
                                    </div>
                                </div>

                                {/* File List */}
                                {formData.documents.length > 0 && (
                                    <ul className="mt-4 space-y-2">
                                        {formData.documents.map((doc, i) => (
                                            <li key={i} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm">
                                                <span className="truncate max-w-[200px]">{doc.name}</span>
                                                <span className="text-blue-400">✓ Uploaded</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            <Button isLoading={loading} onClick={handleSubmit}>
                                Submit Intake
                            </Button>
                        </div>
                    )}

                    {step === 5 && (
                        <div className="text-center py-12 animate-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-green-200 shadow-xl">
                                ✓
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">You're all set!</h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                                Your information has been securely received. Our team is reviewing your details and will be ready for your appointment.
                            </p>
                            <Button onClick={() => window.location.reload()}>
                                Start New Form
                            </Button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
