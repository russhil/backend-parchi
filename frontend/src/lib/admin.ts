import { API_BASE } from "./api";

function getAdminToken(): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split('; admin_token=');
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
}

async function adminFetch<T>(url: string, options?: RequestInit): Promise<T> {
    const token = getAdminToken();
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options?.headers as Record<string, string>),
    };

    const res = await fetch(`${API_BASE}${url}`, { ...options, headers });

    if (res.status === 401 || res.status === 403) {
        if (typeof window !== 'undefined') {
            window.location.href = "/admin/login";
        }
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `API error: ${res.status}`);
    }
    return res.json();
}

// --- Auth ---

export async function adminLogin(password: string) {
    const res = await fetch(`${API_BASE}/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
    });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: "Invalid password" }));
        throw new Error(err.detail || "Invalid password");
    }
    return res.json() as Promise<{ access_token: string; token_type: string }>;
}

export function adminLogout() {
    document.cookie = "admin_token=; path=/; max-age=0";
    window.location.href = "/admin/login";
}

// --- Clinics ---

export interface Clinic {
    id: string;
    name: string;
    slug: string;
    phone?: string;
    email?: string;
    address?: string;
    created_at: string;
    doctor_count?: number;
    user_count?: number;
}

export async function getClinics() {
    return adminFetch<{ clinics: Clinic[] }>("/admin/clinics");
}

export async function createClinic(data: { name: string; slug: string; phone?: string; email?: string; address?: string }) {
    return adminFetch<{ clinic: Clinic }>("/admin/clinics", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function updateClinic(clinicId: string, data: { name: string; slug: string; phone?: string; email?: string; address?: string }) {
    return adminFetch<{ clinic: Clinic }>(`/admin/clinics/${clinicId}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export async function deleteClinic(clinicId: string) {
    return adminFetch<{ success: boolean }>(`/admin/clinics/${clinicId}`, {
        method: "DELETE",
    });
}

// --- Doctors ---

export interface Doctor {
    id: string;
    clinic_id: string;
    name: string;
    role: string;
    specialization?: string;
    created_at: string;
}

export async function getDoctors(clinicId: string) {
    return adminFetch<{ doctors: Doctor[] }>(`/admin/clinics/${clinicId}/doctors`);
}

export async function createDoctor(data: { clinic_id: string; name: string; specialization?: string; role?: string }) {
    return adminFetch<{ doctor: Doctor }>("/admin/doctors", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function updateDoctor(doctorId: string, data: { clinic_id: string; name: string; specialization?: string; role?: string }) {
    return adminFetch<{ doctor: Doctor }>(`/admin/doctors/${doctorId}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
}

export async function deleteDoctor(doctorId: string) {
    return adminFetch<{ success: boolean }>(`/admin/doctors/${doctorId}`, {
        method: "DELETE",
    });
}

// --- Users ---

export interface UserAccount {
    id: string;
    username: string;
    clinic_id: string;
    doctor_id?: string;
    doctor_name?: string;
    created_at: string;
}

export async function getUsers(clinicId: string) {
    return adminFetch<{ users: UserAccount[] }>(`/admin/clinics/${clinicId}/users`);
}

export async function createUser(data: { username: string; password: string; clinic_id: string; doctor_id?: string }) {
    return adminFetch<{ user: UserAccount }>("/admin/users", {
        method: "POST",
        body: JSON.stringify(data),
    });
}

export async function deleteUser(userId: string) {
    return adminFetch<{ success: boolean }>(`/admin/users/${userId}`, {
        method: "DELETE",
    });
}
