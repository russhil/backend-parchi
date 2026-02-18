"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

interface UserInfo {
    doctor_name: string;
    clinic_name: string;
    specialization?: string;
    role?: string;
}

export default function SettingsPage() {
    const router = useRouter();
    const [darkMode, setDarkMode] = useState(false);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

    useEffect(() => {
        const savedMode = localStorage.getItem("darkMode");
        if (savedMode === "true") {
            setDarkMode(true);
            document.documentElement.classList.add("dark");
        }

        const stored = localStorage.getItem("user_info");
        if (stored) {
            try {
                setUserInfo(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse user info", e);
            }
        }
    }, []);

    const initials = useMemo(
        () => (userInfo?.doctor_name ? getInitials(userInfo.doctor_name) : "Dr"),
        [userInfo?.doctor_name]
    );

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

    const handleSignOut = () => {
        document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
        localStorage.removeItem("user_info");
        router.push("/login");
        router.refresh();
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
                            {initials}
                        </div>
                        <div>
                            <p className="text-lg font-bold text-text-primary">
                                {userInfo?.doctor_name || "Doctor"}
                            </p>
                            <p className="text-sm text-text-secondary">
                                {userInfo?.specialization || userInfo?.role || "Physician"}
                            </p>
                            <p className="text-xs text-text-secondary mt-1">
                                {userInfo?.clinic_name || "Clinic"}
                            </p>
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

                {/* Quick Links */}
                <div className="mb-6">
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

                {/* Sign Out */}
                <div className="mb-8">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center justify-center gap-2 p-3 bg-surface rounded-xl border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition font-medium text-sm"
                    >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        Sign Out
                    </button>
                </div>

                {/* Version Info */}
                <div className="text-center text-xs text-text-secondary">
                    <p>Parchi v1.0.0</p>
                </div>
            </div>
        </div>
    );
}
