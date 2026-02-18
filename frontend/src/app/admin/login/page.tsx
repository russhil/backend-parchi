'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminLogin } from '@/lib/admin';

export default function AdminLoginPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const data = await adminLogin(password);
            document.cookie = `admin_token=${data.access_token}; path=/; max-age=43200; SameSite=Lax`;
            router.push('/admin');
            router.refresh();
        } catch (err: any) {
            setError(err.message || 'Invalid password');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-4">
            <div className="max-w-md w-full space-y-6 p-8 bg-surface rounded-xl shadow-lg border border-border-light">
                <div className="text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 mb-4">
                        <span className="material-symbols-outlined text-white text-3xl">admin_panel_settings</span>
                    </div>
                    <h2 className="text-2xl font-bold text-text-primary">Admin Panel</h2>
                    <p className="mt-2 text-text-secondary text-sm">
                        Enter admin password to manage clinics &amp; doctors
                    </p>
                </div>

                <form className="mt-6 space-y-5" onSubmit={handleLogin}>
                    <div>
                        <label htmlFor="admin-password" className="block text-sm font-medium text-text-secondary mb-1">
                            Admin Password
                        </label>
                        <input
                            id="admin-password"
                            type="password"
                            required
                            className="appearance-none relative block w-full px-4 py-3 border border-border-light placeholder-gray-400 text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm bg-input-bg transition-all"
                            placeholder="Enter admin password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                        />
                    </div>

                    {error && (
                        <div className="text-red-500 text-sm text-center bg-red-50 rounded-lg p-2 border border-red-100">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-primary to-blue-600 hover:from-primary-dark hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                    >
                        {isLoading ? 'Authenticating...' : 'Access Admin Panel'}
                    </button>

                    <div className="text-center">
                        <a href="/login" className="text-sm text-text-secondary hover:text-primary transition-colors">
                            ← Back to Login
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
}
