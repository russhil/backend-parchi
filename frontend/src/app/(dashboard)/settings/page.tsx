"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export default function SettingsPage() {
    const router = useRouter();
    const [darkMode, setDarkMode] = useState(false);

    // Load dark mode preference from localStorage on mount
    useEffect(() => {
        const savedMode = localStorage.getItem("darkMode");
        if (savedMode === "true") {
            setDarkMode(true);
            document.documentElement.classList.add("dark");
        }
    }, []);

    // Toggle dark mode
    const toggleDarkMode = () => {
        const newMode = !darkMode;
        setDarkMode(newMode);
        localStorage.setItem("darkMode", String(newMode));

        if (newMode) {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
    };

    return (
        <div className="p-4 md:p-6">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-xl md:text-2xl font-bold text-text-primary">Settings</h1>
                    <p className="text-sm text-text-secondary mt-1">
                        Manage your clinic preferences and configuration
                    </p>
                </div>

                {/* Doctor Profile Card */}
                <div className="bg-surface rounded-2xl border border-border-light shadow-sm p-6 mb-6">
                    <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-4">
                        Doctor Profile
                    </h2>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold">
                            YC
                        </div>
                        <div>
                            <p className="text-lg font-bold text-text-primary">YC</p>
                            <p className="text-sm text-text-secondary">General Physician</p>
                            <p className="text-xs text-text-secondary mt-1">yc@parchi.ai</p>
                        </div>
                    </div>
                </div>

                {/* Appearance Settings */}
                <div className="bg-surface rounded-2xl border border-border-light shadow-sm p-6 mb-6">
                    <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-4">
                        Appearance
                    </h2>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-primary">dark_mode</span>
                            <div>
                                <p className="text-sm font-semibold text-text-primary">Dark Mode</p>
                                <p className="text-xs text-text-secondary">Reduce eye strain in low light</p>
                            </div>
                        </div>
                        <button
                            onClick={toggleDarkMode}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${darkMode ? "bg-primary" : "bg-skeleton"
                                }`}
                            role="switch"
                            aria-checked={darkMode}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? "translate-x-6" : "translate-x-1"
                                    }`}
                            />
                        </button>
                    </div>
                    {darkMode && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-2">
                            <span className="material-symbols-outlined text-blue-500 text-[18px] mt-0.5">info</span>
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                Dark mode is currently in beta. Some elements may need refinement.
                            </p>
                        </div>
                    )}
                </div>

                {/* Configuration Cards */}
                <div className="space-y-4">
                    {/* API Status */}
                    <div className="bg-surface rounded-xl border border-border-light p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">api</span>
                                <div>
                                    <p className="text-sm font-semibold text-text-primary">API Connection</p>
                                    <p className="text-xs text-text-secondary">Supabase + Google AI</p>
                                </div>
                            </div>
                            <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                                <span className="w-2 h-2 bg-green-500 rounded-full" />
                                Connected
                            </span>
                        </div>
                    </div>

                    {/* Database */}
                    <div className="bg-surface rounded-xl border border-border-light p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">database</span>
                                <div>
                                    <p className="text-sm font-semibold text-text-primary">Database</p>
                                    <p className="text-xs text-text-secondary">Supabase PostgreSQL</p>
                                </div>
                            </div>
                            <span className="text-xs text-text-secondary">xhizybtbsbref...supabase.co</span>
                        </div>
                    </div>

                    {/* AI Model */}
                    <div className="bg-surface rounded-xl border border-border-light p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary">smart_toy</span>
                                <div>
                                    <p className="text-sm font-semibold text-text-primary">AI Model</p>
                                    <p className="text-xs text-text-secondary">Google Gemma-3-27b-it</p>
                                </div>
                            </div>
                            <span className="text-xs text-text-secondary">via Google AI Studio</span>
                        </div>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="mt-8">
                    <h2 className="text-sm font-bold text-text-secondary uppercase tracking-wide mb-4">
                        Quick Actions
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => router.push("/patients")}
                            className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-border-light hover:shadow-md transition"
                        >
                            <span className="material-symbols-outlined text-primary">group</span>
                            <span className="text-sm font-medium">View All Patients</span>
                        </button>
                        <button
                            onClick={() => router.push("/appointments")}
                            className="flex items-center gap-3 p-4 bg-surface rounded-xl border border-border-light hover:shadow-md transition"
                        >
                            <span className="material-symbols-outlined text-primary">calendar_today</span>
                            <span className="text-sm font-medium">Manage Schedule</span>
                        </button>
                    </div>
                </div>

                {/* Version Info */}
                <div className="mt-8 text-center text-xs text-text-secondary">
                    <p>Parchi.ai v1.0.0 (MVP)</p>
                    <p className="mt-1">Built with Next.js, FastAPI, Supabase, Google AI</p>
                </div>
            </div>
        </div>
    );
}
