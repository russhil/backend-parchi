"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const navItems = [
  { icon: "home", label: "Home", href: "/" },
  { icon: "calendar_today", label: "Schedule", href: "/appointments" },
  { icon: "assignment", label: "Intake", href: "/setup-intake" },
  { icon: "group", label: "Patients", href: "/patients" },
  { icon: "settings", label: "Settings", href: "/settings" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [initials, setInitials] = useState("Dr");

  useEffect(() => {
    setDarkMode(document.documentElement.classList.contains("dark"));
    const stored = localStorage.getItem("user_info");
    if (stored) {
      try {
        const userInfo = JSON.parse(stored);
        if (userInfo.doctor_name) {
          setInitials(getInitials(userInfo.doctor_name));
        }
      } catch (e) {
        console.error("Failed to parse user info", e);
      }
    }
  }, []);

  const toggleDarkMode = () => {
    const html = document.documentElement;
    if (html.classList.contains("dark")) {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
      setDarkMode(false);
    } else {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
      setDarkMode(true);
    }
  };

  // Hide sidebar on public pages
  if (pathname === '/login' || pathname === '/landing' || pathname === '/landing2' || pathname === '/privacy-policy' || pathname === '/terms-of-service' || pathname.startsWith('/intake/')) return null;

  const handleSignOut = () => {
    // Clear the auth cookie
    document.cookie = "auth_token=; path=/; max-age=0; SameSite=Lax";
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[72px] bg-surface border-r border-border-light flex-col items-center py-4 z-50">
        {/* Logo */}
        <Link href="/" className="mb-8 flex items-center justify-center w-10 h-10">
          <Image src="/logo.png" alt="Parchi" width={44} height={44} className="rounded-full" />
        </Link>

        {/* Nav Items */}
        <nav className="flex flex-col gap-2 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/" && item.href !== "#" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors ${isActive
                  ? "bg-primary-light text-primary"
                  : "text-text-secondary hover:bg-hover"
                  }`}
                title={item.label}
              >
                <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="mt-auto flex flex-col gap-3 items-center">
          <button
            onClick={toggleDarkMode}
            className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-text-secondary hover:bg-hover transition-colors"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <span className="material-symbols-outlined text-[22px]">{darkMode ? "light_mode" : "dark_mode"}</span>
            <span className="text-[10px] mt-0.5 font-medium">{darkMode ? "Light" : "Dark"}</span>
          </button>
          <button
            onClick={handleSignOut}
            className="flex flex-col items-center justify-center w-12 h-12 rounded-xl text-text-secondary hover:bg-red-50 hover:text-red-600 transition-colors"
            title="Sign Out"
          >
            <span className="material-symbols-outlined text-[22px]">logout</span>
            <span className="text-[10px] mt-0.5 font-medium">Log out</span>
          </button>

          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm mb-2">
            {initials}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border-light flex items-center justify-around z-50 px-2 safe-area-pb">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && item.href !== "#" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${isActive
                ? "text-primary"
                : "text-text-secondary"
                }`}
            >
              <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
