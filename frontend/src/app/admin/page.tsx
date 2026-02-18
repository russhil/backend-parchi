'use client';

import { useEffect, useState } from 'react';
import { getClinics, type Clinic } from '@/lib/admin';

export default function AdminDashboard() {
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getClinics()
            .then((data) => setClinics(data.clinics))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const totalDoctors = clinics.reduce((sum, c) => sum + (c.doctor_count || 0), 0);
    const totalUsers = clinics.reduce((sum, c) => sum + (c.user_count || 0), 0);

    const stats = [
        { label: 'Clinics', value: clinics.length, icon: 'local_hospital', color: 'from-blue-500 to-blue-600' },
        { label: 'Doctors', value: totalDoctors, icon: 'stethoscope', color: 'from-emerald-500 to-emerald-600' },
        { label: 'User Accounts', value: totalUsers, icon: 'group', color: 'from-violet-500 to-violet-600' },
    ];

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
                <p className="text-text-secondary mt-1">Overview of your clinic management system</p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-surface rounded-xl p-6 border border-border-light animate-pulse">
                            <div className="h-12 w-12 bg-skeleton rounded-xl mb-4" />
                            <div className="h-8 w-16 bg-skeleton rounded mb-2" />
                            <div className="h-4 w-24 bg-skeleton rounded" />
                        </div>
                    ))}
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                        {stats.map((stat) => (
                            <div key={stat.label} className="bg-surface rounded-xl p-6 border border-border-light hover:shadow-md transition-shadow">
                                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} mb-4`}>
                                    <span className="material-symbols-outlined text-white text-2xl">{stat.icon}</span>
                                </div>
                                <p className="text-3xl font-bold text-text-primary">{stat.value}</p>
                                <p className="text-sm text-text-secondary mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-surface rounded-xl border border-border-light">
                        <div className="p-5 border-b border-border-light flex items-center justify-between">
                            <h2 className="font-semibold text-text-primary">Recent Clinics</h2>
                            <a href="/admin/clinics" className="text-sm text-primary hover:text-primary-dark font-medium transition-colors">
                                View all →
                            </a>
                        </div>
                        {clinics.length === 0 ? (
                            <div className="p-8 text-center text-text-secondary">
                                <span className="material-symbols-outlined text-4xl mb-2 block opacity-40">local_hospital</span>
                                <p>No clinics yet. Create your first clinic to get started.</p>
                                <a href="/admin/clinics" className="inline-block mt-3 text-sm text-primary hover:text-primary-dark font-medium">
                                    Create Clinic →
                                </a>
                            </div>
                        ) : (
                            <div className="divide-y divide-border-light">
                                {clinics.slice(0, 5).map((clinic) => (
                                    <a
                                        key={clinic.id}
                                        href={`/admin/clinics/${clinic.id}`}
                                        className="flex items-center justify-between p-4 hover:bg-hover transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-primary">local_hospital</span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-text-primary">{clinic.name}</p>
                                                <p className="text-xs text-text-secondary">{clinic.slug}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-text-secondary">
                                            <span>{clinic.doctor_count || 0} doctors</span>
                                            <span>{clinic.user_count || 0} users</span>
                                            <span className="material-symbols-outlined text-lg">chevron_right</span>
                                        </div>
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
