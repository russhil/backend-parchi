'use strict';

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        console.log("Attempting login with:", username);

        try {
            const res = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            console.log("Response status:", res.status);

            if (res.ok) {
                console.log("Login success, setting cookie and redirecting");
                document.cookie = "auth_token=true; path=/; max-age=86400; SameSite=Lax";
                router.push('/');
                router.refresh();
            } else {
                const data = await res.json();
                console.error("Login failed:", data);
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
        <div className="h-full flex items-center justify-center bg-bg p-4">
            <div className="max-w-md w-full space-y-6 md:space-y-8 p-6 md:p-8 bg-surface rounded-xl shadow-lg border border-border-light">
                <div className="text-center">
                    <h2 className="mt-4 md:mt-6 text-2xl md:text-3xl font-bold text-text-primary">
                        Welcome to Parchi
                    </h2>
                    <p className="mt-2 text-sm text-text-secondary">
                        Please sign in to access your dashboard
                    </p>
                </div>
                <form className="mt-6 md:mt-8 space-y-6" onSubmit={handleLogin}>
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div className="mb-4">
                            <label htmlFor="username" className="block text-sm font-medium text-text-secondary mb-1">
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                required
                                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-border-light placeholder-text-secondary text-text-primary bg-surface focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                placeholder="Enter your username"
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
                                className="appearance-none rounded-lg relative block w-full px-3 py-2 border border-border-light placeholder-text-secondary text-text-primary bg-surface focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${isLoading ? 'bg-primary/70' : 'bg-primary hover:bg-primary-dark'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors`}
                        >
                            {isLoading ? 'Signing in...' : 'Sign in'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
