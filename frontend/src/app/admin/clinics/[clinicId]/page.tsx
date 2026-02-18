'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
    getClinics,
    getDoctors,
    getUsers,
    createDoctor,
    deleteDoctor,
    createUser,
    deleteUser,
    type Clinic,
    type Doctor,
    type UserAccount,
} from '@/lib/admin';

export default function ClinicDetailPage() {
    const params = useParams();
    const clinicId = params.clinicId as string;

    const [clinic, setClinic] = useState<Clinic | null>(null);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [users, setUsers] = useState<UserAccount[]>([]);
    const [loading, setLoading] = useState(true);

    // Doctor form
    const [showDoctorForm, setShowDoctorForm] = useState(false);
    const [doctorForm, setDoctorForm] = useState({ name: '', specialization: '', role: 'doctor' });
    const [savingDoctor, setSavingDoctor] = useState(false);

    // User form
    const [showUserForm, setShowUserForm] = useState(false);
    const [userForm, setUserForm] = useState({ username: '', password: '', doctor_id: '' });
    const [savingUser, setSavingUser] = useState(false);

    const [error, setError] = useState('');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [clinicsRes, doctorsRes, usersRes] = await Promise.all([
                getClinics(),
                getDoctors(clinicId),
                getUsers(clinicId),
            ]);
            const found = clinicsRes.clinics.find((c) => c.id === clinicId);
            setClinic(found || null);
            setDoctors(doctorsRes.doctors);
            setUsers(usersRes.users);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [clinicId]);

    const handleCreateDoctor = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSavingDoctor(true);
        try {
            await createDoctor({
                clinic_id: clinicId,
                name: doctorForm.name,
                specialization: doctorForm.specialization || undefined,
                role: doctorForm.role,
            });
            setShowDoctorForm(false);
            setDoctorForm({ name: '', specialization: '', role: 'doctor' });
            fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSavingDoctor(false);
        }
    };

    const handleDeleteDoctor = async (id: string, name: string) => {
        if (!confirm(`Delete doctor "${name}"?`)) return;
        try {
            await deleteDoctor(id);
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSavingUser(true);
        try {
            await createUser({
                username: userForm.username,
                password: userForm.password,
                clinic_id: clinicId,
                doctor_id: userForm.doctor_id || undefined,
            });
            setShowUserForm(false);
            setUserForm({ username: '', password: '', doctor_id: '' });
            fetchData();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSavingUser(false);
        }
    };

    const handleDeleteUser = async (id: string, username: string) => {
        if (!confirm(`Delete user "${username}"?`)) return;
        try {
            await deleteUser(id);
            fetchData();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const generatePassword = () => {
        const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
        let pwd = '';
        for (let i = 0; i < 8; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
        setUserForm({ ...userForm, password: pwd });
    };

    if (loading) {
        return (
            <div className="space-y-6 animate-pulse">
                <div className="h-8 w-64 bg-skeleton rounded" />
                <div className="h-4 w-48 bg-skeleton rounded" />
                <div className="h-48 bg-skeleton rounded-xl" />
            </div>
        );
    }

    if (!clinic) {
        return (
            <div className="text-center py-12">
                <span className="material-symbols-outlined text-5xl opacity-30 mb-3 block">error</span>
                <p className="text-text-secondary">Clinic not found</p>
                <a href="/admin/clinics" className="text-primary text-sm mt-2 inline-block">← Back to Clinics</a>
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <a href="/admin/clinics" className="text-sm text-text-secondary hover:text-primary transition-colors mb-2 inline-flex items-center gap-1">
                    <span className="material-symbols-outlined text-base">arrow_back</span>
                    Back to Clinics
                </a>
                <div className="flex items-center gap-4 mt-2">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-white text-2xl">local_hospital</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">{clinic.name}</h1>
                        <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
                            <code className="bg-bg px-2 py-0.5 rounded text-xs">{clinic.slug}</code>
                            {clinic.phone && <span>📞 {clinic.phone}</span>}
                            {clinic.email && <span>✉️ {clinic.email}</span>}
                        </div>
                    </div>
                </div>
                {clinic.address && (
                    <p className="text-sm text-text-secondary mt-2 ml-[4.5rem]">📍 {clinic.address}</p>
                )}
            </div>

            {error && (
                <div className="text-red-500 text-sm bg-red-50 rounded-lg p-3 border border-red-100 mb-6">
                    {error}
                </div>
            )}

            {/* Doctors Section */}
            <div className="bg-surface rounded-xl border border-border-light mb-6">
                <div className="p-5 border-b border-border-light flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600">stethoscope</span>
                        <h2 className="font-semibold text-text-primary">Doctors ({doctors.length})</h2>
                    </div>
                    <button
                        onClick={() => setShowDoctorForm(!showDoctorForm)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-all"
                    >
                        <span className="material-symbols-outlined text-base">add</span>
                        Add Doctor
                    </button>
                </div>

                {showDoctorForm && (
                    <div className="p-5 border-b border-border-light bg-bg/50">
                        <form onSubmit={handleCreateDoctor} className="flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-xs font-medium text-text-secondary mb-1">Doctor Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-border-light rounded-lg bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Dr. John Smith"
                                    value={doctorForm.name}
                                    onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                                />
                            </div>
                            <div className="w-48">
                                <label className="block text-xs font-medium text-text-secondary mb-1">Specialization</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border border-border-light rounded-lg bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="Cardiologist"
                                    value={doctorForm.specialization}
                                    onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                                />
                            </div>
                            <div className="w-36">
                                <label className="block text-xs font-medium text-text-secondary mb-1">Role</label>
                                <select
                                    className="w-full px-3 py-2 border border-border-light rounded-lg bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={doctorForm.role}
                                    onChange={(e) => setDoctorForm({ ...doctorForm, role: e.target.value })}
                                >
                                    <option value="doctor">Doctor</option>
                                    <option value="owner">Owner</option>
                                    <option value="receptionist">Receptionist</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDoctorForm(false)}
                                    className="px-3 py-2 text-sm text-text-secondary border border-border-light rounded-lg hover:bg-hover"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingDoctor}
                                    className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                                >
                                    {savingDoctor ? 'Adding...' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {doctors.length === 0 ? (
                    <div className="p-8 text-center text-text-secondary">
                        <p className="text-sm">No doctors added yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border-light">
                        {doctors.map((doc) => (
                            <div key={doc.id} className="flex items-center justify-between px-5 py-3 hover:bg-hover transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-emerald-50 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-emerald-600 text-lg">person</span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-text-primary text-sm">{doc.name}</p>
                                        <div className="flex items-center gap-2">
                                            {doc.specialization && (
                                                <span className="text-xs text-text-secondary">{doc.specialization}</span>
                                            )}
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${doc.role === 'owner' ? 'bg-amber-50 text-amber-700' :
                                                    doc.role === 'receptionist' ? 'bg-purple-50 text-purple-700' :
                                                        'bg-blue-50 text-blue-700'
                                                }`}>
                                                {doc.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="text-xs text-text-secondary bg-bg px-2 py-0.5 rounded">{doc.id}</code>
                                    <button
                                        onClick={() => handleDeleteDoctor(doc.id, doc.name)}
                                        className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-red-50 transition-all"
                                        title="Delete"
                                    >
                                        <span className="material-symbols-outlined text-base">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Users Section */}
            <div className="bg-surface rounded-xl border border-border-light">
                <div className="p-5 border-b border-border-light flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-violet-600">key</span>
                        <h2 className="font-semibold text-text-primary">Login Credentials ({users.length})</h2>
                    </div>
                    <button
                        onClick={() => setShowUserForm(!showUserForm)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-violet-700 bg-violet-50 rounded-lg hover:bg-violet-100 transition-all"
                    >
                        <span className="material-symbols-outlined text-base">add</span>
                        Create Credentials
                    </button>
                </div>

                {showUserForm && (
                    <div className="p-5 border-b border-border-light bg-bg/50">
                        <form onSubmit={handleCreateUser} className="flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[180px]">
                                <label className="block text-xs font-medium text-text-secondary mb-1">Username *</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 border border-border-light rounded-lg bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="dr.smith"
                                    value={userForm.username}
                                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                                />
                            </div>
                            <div className="w-48">
                                <label className="block text-xs font-medium text-text-secondary mb-1">Password *</label>
                                <div className="flex gap-1">
                                    <input
                                        type="text"
                                        required
                                        className="flex-1 px-3 py-2 border border-border-light rounded-lg bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                                        placeholder="password"
                                        value={userForm.password}
                                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                                    />
                                    <button
                                        type="button"
                                        onClick={generatePassword}
                                        className="px-2 py-2 border border-border-light rounded-lg text-text-secondary hover:bg-hover text-xs"
                                        title="Generate random password"
                                    >
                                        <span className="material-symbols-outlined text-base">casino</span>
                                    </button>
                                </div>
                            </div>
                            <div className="w-48">
                                <label className="block text-xs font-medium text-text-secondary mb-1">Link to Doctor</label>
                                <select
                                    className="w-full px-3 py-2 border border-border-light rounded-lg bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    value={userForm.doctor_id}
                                    onChange={(e) => setUserForm({ ...userForm, doctor_id: e.target.value })}
                                >
                                    <option value="">— No doctor —</option>
                                    {doctors.map((doc) => (
                                        <option key={doc.id} value={doc.id}>
                                            {doc.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowUserForm(false)}
                                    className="px-3 py-2 text-sm text-text-secondary border border-border-light rounded-lg hover:bg-hover"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingUser}
                                    className="px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50"
                                >
                                    {savingUser ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {users.length === 0 ? (
                    <div className="p-8 text-center text-text-secondary">
                        <p className="text-sm">No login credentials created yet.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-border-light">
                        {users.map((user) => (
                            <div key={user.id} className="flex items-center justify-between px-5 py-3 hover:bg-hover transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-violet-50 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-violet-600 text-lg">account_circle</span>
                                    </div>
                                    <div>
                                        <p className="font-medium text-text-primary text-sm font-mono">{user.username}</p>
                                        {user.doctor_name && (
                                            <p className="text-xs text-text-secondary">Linked to: {user.doctor_name}</p>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteUser(user.id, user.username)}
                                    className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-red-50 transition-all"
                                    title="Delete"
                                >
                                    <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
