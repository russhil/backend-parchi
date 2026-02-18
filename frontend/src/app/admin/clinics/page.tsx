'use client';

import { useEffect, useState } from 'react';
import { getClinics, createClinic, deleteClinic, type Clinic } from '@/lib/admin';

export default function ClinicsPage() {
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', slug: '', phone: '', email: '', address: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchClinics = () => {
        setLoading(true);
        getClinics()
            .then((data) => setClinics(data.clinics))
            .catch(console.error)
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchClinics(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSaving(true);
        try {
            await createClinic(formData);
            setShowForm(false);
            setFormData({ name: '', slug: '', phone: '', email: '', address: '' });
            fetchClinics();
        } catch (err: any) {
            setError(err.message || 'Failed to create clinic');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete clinic "${name}"? This will remove all associated data.`)) return;
        try {
            await deleteClinic(id);
            fetchClinics();
        } catch (err: any) {
            alert(err.message || 'Failed to delete clinic');
        }
    };

    const autoSlug = (name: string) => {
        setFormData({
            ...formData,
            name,
            slug: formData.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        });
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Clinics</h1>
                    <p className="text-text-secondary text-sm mt-1">Manage all onboarded clinics</p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-blue-600 text-white text-sm font-semibold rounded-lg hover:from-primary-dark hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    Create Clinic
                </button>
            </div>

            {/* Create Clinic Form */}
            {showForm && (
                <div className="bg-surface rounded-xl border border-border-light p-6 mb-6 shadow-sm">
                    <h3 className="font-semibold text-text-primary mb-4">New Clinic</h3>
                    <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Clinic Name *</label>
                            <input
                                type="text"
                                required
                                className="w-full px-3 py-2 border border-border-light rounded-lg bg-input-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="Apollo Health Center"
                                value={formData.name}
                                onChange={(e) => autoSlug(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Slug (URL ID) *</label>
                            <input
                                type="text"
                                required
                                className="w-full px-3 py-2 border border-border-light rounded-lg bg-input-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="apollo"
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Phone</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-border-light rounded-lg bg-input-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="+91 98765 43210"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
                            <input
                                type="email"
                                className="w-full px-3 py-2 border border-border-light rounded-lg bg-input-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="info@clinic.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-text-secondary mb-1">Address</label>
                            <input
                                type="text"
                                className="w-full px-3 py-2 border border-border-light rounded-lg bg-input-bg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                placeholder="123 Medical Lane, City"
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            />
                        </div>

                        {error && (
                            <div className="md:col-span-2 text-red-500 text-sm bg-red-50 rounded-lg p-2 border border-red-100">
                                {error}
                            </div>
                        )}

                        <div className="md:col-span-2 flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setError(''); }}
                                className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text-primary rounded-lg border border-border-light hover:bg-hover transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-5 py-2 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 transition-all"
                            >
                                {saving ? 'Creating...' : 'Create Clinic'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Clinics Table */}
            <div className="bg-surface rounded-xl border border-border-light overflow-hidden">
                {loading ? (
                    <div className="p-8 space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4 animate-pulse">
                                <div className="w-10 h-10 bg-skeleton rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-48 bg-skeleton rounded" />
                                    <div className="h-3 w-32 bg-skeleton rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : clinics.length === 0 ? (
                    <div className="p-12 text-center text-text-secondary">
                        <span className="material-symbols-outlined text-5xl mb-3 block opacity-30">local_hospital</span>
                        <p className="font-medium">No clinics yet</p>
                        <p className="text-sm mt-1">Create your first clinic to start onboarding doctors.</p>
                    </div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border-light bg-bg/50">
                                <th className="text-left px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Clinic</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Slug</th>
                                <th className="text-left px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Contact</th>
                                <th className="text-center px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Doctors</th>
                                <th className="text-center px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Users</th>
                                <th className="text-right px-5 py-3 text-xs font-semibold text-text-secondary uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light">
                            {clinics.map((clinic) => (
                                <tr key={clinic.id} className="hover:bg-hover transition-colors">
                                    <td className="px-5 py-4">
                                        <a href={`/admin/clinics/${clinic.id}`} className="font-medium text-text-primary hover:text-primary transition-colors">
                                            {clinic.name}
                                        </a>
                                    </td>
                                    <td className="px-5 py-4">
                                        <code className="text-xs bg-bg px-2 py-1 rounded text-text-secondary">{clinic.slug}</code>
                                    </td>
                                    <td className="px-5 py-4 text-sm text-text-secondary">
                                        {clinic.phone || clinic.email || '—'}
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                            {clinic.doctor_count || 0}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700">
                                            {clinic.user_count || 0}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <a
                                                href={`/admin/clinics/${clinic.id}`}
                                                className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-all"
                                                title="View Details"
                                            >
                                                <span className="material-symbols-outlined text-lg">visibility</span>
                                            </a>
                                            <button
                                                onClick={() => handleDelete(clinic.id, clinic.name)}
                                                className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-red-50 transition-all"
                                                title="Delete"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
