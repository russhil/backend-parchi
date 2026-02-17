"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getIntakeToken, verifyIntakePhone, submitIntakeToken } from "@/lib/api";
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{label}</label>
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

export default function IntakeTokenPage() {
    const params = useParams();
    const router = useRouter();
    const [step, setStep] = useState(0); // 0=Loading, 1=Verify, 2=Form, 3=Success
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [tokenData, setTokenData] = useState<any>(null);

    // State
    const [formData, setFormData] = useState({
        dob: "",
        gender: "Other",
        email: "",
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

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    // Load Token Data
    useEffect(() => {
        const fetchToken = async () => {
            const tokenStr = Array.isArray(params.token) ? params.token[0] : params.token;
            if (!tokenStr) return;
            try {
                const data = await getIntakeToken(tokenStr);
                setTokenData(data);

                // Pre-fill some data if available
                if (data.patient_details) {
                    setFormData(prev => ({
                        ...prev,
                        dob: data.patient_details.dob || "",
                        gender: data.patient_details.gender || "Other",
                    }));
                }

                setStep(1); // Go to Verify step
            } catch (err: any) {
                setError(err.message);
                setStep(99); // Error state
            } finally {
                setLoading(false);
            }
        };
        fetchToken();
    }, [params.token]);

    // Handle Phone Verification
    useEffect(() => {
        (window as any).phoneEmailListener = async (userObj: any) => {
            const tokenStr = Array.isArray(params.token) ? params.token[0] : params.token;
            const user_json_url = userObj.user_json_url;
            if (!tokenStr) return;

            setLoading(true);
            try {
                await verifyIntakePhone(tokenStr, user_json_url);
                // Success -> Go to form
                setStep(2);

            } catch (err: any) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
    }, [params.token]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setLoading(true);

        try {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const newDocs: { name: string; url: string }[] = [];
            for (const file of files) {
                const data = new FormData();
                data.append("file", file);
                const res = await fetch(`${API_BASE}/upload`, {
                    method: "POST",
                    body: data,
                });
                if (res.ok) {
                    const json = await res.json();
                    newDocs.push({ name: file.name, url: json.url });
                }
            }
            setFormData(prev => ({
                ...prev,
                documents: [...prev.documents, ...newDocs]
            }));
        } catch (err) {
            setError("Error uploading files");
        } finally {
            setLoading(false);
            e.target.value = "";
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const tokenStr = Array.isArray(params.token) ? params.token[0] : params.token;
            const payload = {
                token: tokenStr,
                ...formData,
                medications: formData.medications.split("\n").filter(Boolean),
                allergies: formData.allergies.split("\n").filter(Boolean),
                height_cm: formData.height_cm ? Number(formData.height_cm) : null,
                weight_kg: formData.weight_kg ? Number(formData.weight_kg) : null,
            };

            await submitIntakeToken(payload);
            setStep(3); // Success
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading && step === 0) {
        return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">Loading...</div>;
    }

    if (step === 99) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-6">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-xl text-center max-w-md border border-slate-100 dark:border-slate-700">
                    <div className="text-red-500 text-5xl mb-4">⚠️</div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Link Expired or Invalid</h1>
                    <p className="text-slate-600 dark:text-slate-400">{error}</p>
                </div>
            </div>
        );
    }

    const isNewPatient = tokenData?.is_new_patient;

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-6 font-sans text-slate-900 dark:text-slate-100">
            <Script src="https://www.phone.email/sign_in_button_v1.js" strategy="lazyOnload" />

            <div className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white relative overflow-hidden">
                    <div className="relative z-10">
                        <h1 className="text-3xl font-bold mb-2">Patient Intake</h1>
                        <p className="text-blue-100">
                            {tokenData?.patient_name ? `Welcome, ${tokenData.patient_name}` : "Secure Form"}
                        </p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30 flex items-center gap-2 text-sm">
                            ⚠️ {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-xl font-semibold mb-2 text-slate-800 dark:text-slate-100">Verify Your Identity</h2>
                            <p className="text-slate-500 dark:text-slate-400 mb-8">
                                Please verify the phone number ending in <span className="font-bold text-slate-900 dark:text-slate-100">...{tokenData?.phone_masked}</span> to continue.
                            </p>

                            <div className="flex justify-center">
                                <div className="pe_signin_button" data-client-id="15432560783753349440"></div>
                            </div>

                            {loading && <p className="text-sm text-blue-600 mt-4 animate-pulse">Verifying...</p>}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <h2 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">Appointment Details</h2>

                            {tokenData?.appointment_time && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 mb-8 flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center text-2xl shadow-sm">
                                        📅
                                    </div>
                                    <div>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">Scheduled Visit</p>
                                        <p className="text-slate-900 dark:text-slate-100 font-semibold">
                                            {new Date(tokenData.appointment_time).toLocaleString(undefined, {
                                                dateStyle: 'full',
                                                timeStyle: 'short'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Only show profile fields if new patient */}
                            {isNewPatient && (
                                <div className="space-y-4 border-b dark:border-slate-700 pb-6 mb-6">
                                    <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Patient Profile</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <Input label="Date of Birth" type="date" value={formData.dob} onChange={(e: any) => handleChange("dob", e.target.value)} required />
                                        <Input label="Email" type="email" value={formData.email} onChange={(e: any) => handleChange("email", e.target.value)} />
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
                                        label="Current Medications"
                                        value={formData.medications}
                                        onChange={(e: any) => handleChange("medications", e.target.value)}
                                        placeholder="e.g. Lisinopril 10mg once daily"
                                    />

                                    <TextArea
                                        label="Allergies"
                                        value={formData.allergies}
                                        onChange={(e: any) => handleChange("allergies", e.target.value)}
                                        placeholder="e.g. Penicillin - Hives"
                                    />

                                    <TextArea
                                        label="Medical History"
                                        value={formData.history}
                                        onChange={(e: any) => handleChange("history", e.target.value)}
                                        placeholder="Major surgeries, hospitalizations, family history..."
                                    />
                                </div>
                            )}

                            <h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">Visit Information</h3>

                            <Input
                                label="Reason for Visit"
                                value={formData.reason}
                                onChange={(e: any) => handleChange("reason", e.target.value)}
                                placeholder="e.g. Stomach pain"
                                required
                            />

                            <TextArea
                                label="Detailed Symptoms"
                                value={formData.symptoms}
                                onChange={(e: any) => handleChange("symptoms", e.target.value)}
                                placeholder="Describe your symptoms..."
                                required
                            />

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Upload Prior Records / Labs</label>
                                <div className="border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer relative group">
                                    <input
                                        type="file"
                                        accept=".pdf,.jpg,.png"
                                        multiple
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <p className="text-slate-400 dark:text-slate-500 text-sm">Click to upload files</p>
                                </div>
                                {formData.documents.length > 0 && (
                                    <ul className="mt-4 space-y-2">
                                        {formData.documents.map((doc, i) => (
                                            <li key={i} className="text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                                {doc.name}
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

                    {step === 3 && (
                        <div className="text-center py-12 animate-in zoom-in duration-500">
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-green-200 shadow-xl">
                                ✓
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">You're all set!</h2>
                            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-md mx-auto">
                                Your information has been securely received. See you at your appointment.
                            </p>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
