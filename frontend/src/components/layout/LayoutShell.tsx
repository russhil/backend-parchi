"use client";

import { usePathname } from "next/navigation";

export default function LayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isPublic = pathname === '/login' || pathname === '/landing' || pathname === '/landing2' || pathname === '/privacy-policy' || pathname === '/terms-of-service' || pathname.startsWith('/intake/');

    return (
        <div className={`flex-1 flex flex-col min-w-0 ${isPublic ? '' : 'md:ml-[72px] mb-16 md:mb-0'}`}>
            {children}
        </div>
    );
}
