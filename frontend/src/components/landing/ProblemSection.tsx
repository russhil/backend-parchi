'use client';

import { useScrollProgress, easeOut, remap } from './ScrollAnimations';

export default function ProblemSection() {
    const { ref, progress } = useScrollProgress();

    const headerOpacity = easeOut(remap(progress, 0.05, 0.35, 0, 1));
    const headerY = remap(progress, 0.05, 0.35, 50, 0);

    const mockupOpacity = easeOut(remap(progress, 0.15, 0.45, 0, 1));
    const mockupScale = remap(progress, 0.15, 0.5, 0.9, 1);
    const mockupY = remap(progress, 0.15, 0.45, 60, 0);

    return (
        <section className="landing-section" id="dashboard-preview" ref={ref}>
            <div
                className="landing-section-header"
                style={{
                    opacity: headerOpacity,
                    transform: `translateY(${headerY}px)`,
                    willChange: 'transform, opacity',
                }}
            >
                <div className="dashboard-transition-badge">
                    <span>From Manual 📝 to AI-Powered</span>
                </div>
                <h2 className="landing-section-title">
                    See How Your Clinic <span className="hero-headline-accent">Dashboard</span> Looks
                </h2>
                <p className="landing-section-subtitle">
                    A real-time dashboard built for Indian OPDs — track appointments, manage patients,
                    and let AI do the heavy lifting.
                </p>
            </div>

            <div
                className="dashboard-preview-wrapper"
                style={{
                    opacity: mockupOpacity,
                    transform: `translateY(${mockupY}px) scale(${mockupScale})`,
                    willChange: 'transform, opacity',
                }}
            >
                <div className="dashboard-preview-frame">
                    {/* Mock Dashboard UI */}
                    <div className="dashboard-mock-header">
                        <div className="dashboard-mock-sidebar">
                            <div className="dashboard-mock-logo">
                                <div className="dashboard-mock-logo-circle"></div>
                                <span>Parchi</span>
                            </div>
                            <div className="dashboard-mock-menu">
                                <div className="dashboard-mock-menu-item active">
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>dashboard</span>
                                    <span>Dashboard</span>
                                </div>
                                <div className="dashboard-mock-menu-item">
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>people</span>
                                    <span>Patients</span>
                                </div>
                                <div className="dashboard-mock-menu-item">
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_month</span>
                                    <span>Appointments</span>
                                </div>
                                <div className="dashboard-mock-menu-item">
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>description</span>
                                    <span>Documents</span>
                                </div>
                            </div>
                        </div>
                        <div className="dashboard-mock-main">
                            <div className="dashboard-mock-topbar">
                                <span className="dashboard-mock-greeting">Good Morning, Dr. Sharma</span>
                                <div className="dashboard-mock-search">
                                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>search</span>
                                    <span>Search patients...</span>
                                </div>
                            </div>
                            <div className="dashboard-mock-stats">
                                <div className="dashboard-mock-stat-card">
                                    <span className="dashboard-mock-stat-value">12</span>
                                    <span className="dashboard-mock-stat-label">Today&apos;s Appointments</span>
                                </div>
                                <div className="dashboard-mock-stat-card">
                                    <span className="dashboard-mock-stat-value">3</span>
                                    <span className="dashboard-mock-stat-label">AI Briefs Ready</span>
                                </div>
                                <div className="dashboard-mock-stat-card">
                                    <span className="dashboard-mock-stat-value">156</span>
                                    <span className="dashboard-mock-stat-label">Total Patients</span>
                                </div>
                            </div>
                            <div className="dashboard-mock-appointments">
                                <div className="dashboard-mock-appointment-header">Upcoming Appointments</div>
                                {['Anjali Mehta — 9:30 AM — Migraine Follow-up',
                                    'Rajesh Kumar — 10:00 AM — Diabetes Review',
                                    'Priya Sharma — 10:30 AM — New Visit'].map((apt, i) => (
                                        <div key={i} className="dashboard-mock-apt-row">
                                            <div className="dashboard-mock-apt-dot" style={{ background: ['#3b82f6', '#f59e0b', '#10b981'][i] }}></div>
                                            <span>{apt}</span>
                                            {i === 0 && <span className="dashboard-mock-apt-badge">AI Brief</span>}
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
