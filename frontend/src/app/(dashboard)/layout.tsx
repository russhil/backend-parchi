"use client";

import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import LayoutShell from "@/components/layout/LayoutShell";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { API_BASE } from "@/lib/api"; // Ensure API_BASE export or re-declare

// Simple fetch to check session without importing full api to avoid circular deps if any
// Simple fetch to check session without importing full api to avoid circular deps if any
async function checkSession() {
    try {
        const res = await fetch(`${API_BASE}/me`, {
            headers: {
                "Authorization": `Bearer ${getCookie("auth_token")}`
            }
        });
        return res.ok;
    } catch (error) {
        console.error("Session check failed:", error);
        return false;
    }
}

function getCookie(name: string): string | null {
    if (typeof document === 'undefined') return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
    return null;
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    useEffect(() => {
        const validateSession = async () => {
            const isValid = await checkSession();
            if (!isValid) {
                // Clear cookie and redirect
                document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
                localStorage.removeItem("user_info");
                router.push("/login");
            }
        };
        validateSession();
    }, [router]);

    return (
        <div className="flex min-h-screen w-full bg-bg">
            <Sidebar />
            <LayoutShell>
                <Header />
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </LayoutShell>
        </div>
    );
}
