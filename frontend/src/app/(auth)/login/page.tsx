'use strict';

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_BASE } from "@/lib/api";

export default function LoginPage() {
    const router = useRouter();
    const [clinicSlug, setClinicSlug] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        console.log("Attempting login with:", username);

        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, clinic_slug: clinicSlug }),
            });

            console.log("Response status:", res.status);

            if (res.ok) {
                const data = await res.json();
                console.log("Login success");
                // Store token in cookie for middleware/SSR and API
                document.cookie = `auth_token=${data.access_token}; path=/; max-age=86400; SameSite=Lax`;
                // Store other info in localStorage if needed
                localStorage.setItem("user_info", JSON.stringify({
                    clinic_id: data.clinic_id,
                    clinic_name: data.clinic_name,
                    doctor_id: data.doctor_id,
                    doctor_name: data.doctor_name,
                    role: data.role
                }));
                router.push('/');
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.detail || 'Login failed');
                setIsLoading(false);
            }
        } catch (err: any) {
            console.error("Login error:", err);
            setError('An error occurred: ' + (err.message || String(err)));
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-4">
            <div className="max-w-md w-full space-y-6 md:space-y-8 p-6 md:p-8 bg-surface rounded-xl shadow-lg border border-border-light">
                <div className="text-center">
                    <h2 className="mt-4 md:mt-6 text-2xl md:text-3xl font-bold text-text-primary">
                        Clinic Login
                    </h2>
                    <p className="mt-2 text-text-secondary">
                        Enter your clinic ID and credentials
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="clinic" className="block text-sm font-medium text-text-secondary mb-1">
                                Clinic ID (Slug)
                            </label>
                            <input
                                id="clinic"
                                name="clinic"
                                type="text"
                                required
                                className="appearance-none relative block w-full px-3 py-2 border border-border-light placeholder-gray-400 text-text-primary rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-input-bg"
                                placeholder="e.g. apollo"
                                value={clinicSlug}
                                onChange={(e) => setClinicSlug(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-1">
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                className="appearance-none relative block w-full px-3 py-2 border border-border-light placeholder-gray-400 text-text-primary rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-input-bg"
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                required
                                className="appearance-none relative block w-full px-3 py-2 border border-border-light placeholder-gray-400 text-text-primary rounded-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm bg-input-bg"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
