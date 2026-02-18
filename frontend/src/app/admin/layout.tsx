'use client';

import { usePathname } from 'next/navigation';
import { adminLogout } from '@/lib/admin';

const navItems = [
    { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
    { href: '/admin/clinics', label: 'Clinics', icon: 'local_hospital' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    // Don't wrap the login page in the admin layout
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    return (
        <div className="min-h-screen bg-bg flex">
            {/* Sidebar */}
            <aside className="w-64 bg-surface border-r border-border-light flex flex-col shrink-0">
                <div className="p-5 border-b border-border-light">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                            <span className="material-symbols-outlined text-white text-lg">admin_panel_settings</span>
                        </div>
                        <div>
                            <h1 className="text-base font-bold text-text-primary">Parchi Admin</h1>
                            <p className="text-xs text-text-secondary">Management Panel</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-3 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
                        return (
                            <a
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                        ? 'bg-primary/10 text-primary'
                                        : 'text-text-secondary hover:bg-hover hover:text-text-primary'
                                    }`}
                            >
                                <span className="material-symbols-outlined text-xl">{item.icon}</span>
                                {item.label}
                            </a>
                        );
                    })}
                </nav>

                <div className="p-3 border-t border-border-light">
                    <button
                        onClick={adminLogout}
                        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:bg-hover hover:text-danger transition-all"
                    >
                        <span className="material-symbols-outlined text-xl">logout</span>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto">
                <div className="max-w-6xl mx-auto p-6 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
