'use client';

import { useScrollExit, easeOut, remap } from './ScrollAnimations';

export default function HeroSection() {
    const { ref, exitProgress } = useScrollExit();

    const opacity = remap(exitProgress, 0.3, 0.8, 1, 0);
    const scale = remap(exitProgress, 0.2, 0.8, 1, 0.92);
    const translateY = remap(exitProgress, 0.2, 0.8, 0, -60);

    return (
        <section className="hero-section" id="hero" ref={ref}>
            <div
                className="hero-content"
                style={{
                    opacity: easeOut(Math.max(0, opacity)),
                    transform: `scale(${scale}) translateY(${translateY}px)`,
                    willChange: 'transform, opacity',
                }}
            >
                <div className="hero-badge">
                    <span className="hero-badge-dot"></span>
                    AI-Powered Healthcare Reception
                    <span className="material-symbols-outlined hero-badge-icon">stethoscope</span>
                </div>
                <h1 className="hero-headline">
                    Your Clinic&apos;s AI{' '}
                    <br />
                    <span className="hero-headline-accent">Receptionist &amp; Assistant</span>
                </h1>
                <p className="hero-sub">
                    Parchi AI handles bookings, manages patient records, summarizes cases, and
                    provides differential diagnoses — all through voice and text.
                </p>
                <div className="hero-cta-group">
                    <a href="#demo" className="landing-btn landing-btn-primary">
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>mic</span>
                        Talk to Parchi
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                    </a>
                    <a href="#features" className="landing-btn landing-btn-secondary">
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chat</span>
                        See Features
                    </a>
                </div>

                <div className="hero-stats">
                    <div className="hero-stat-card">
                        <span className="material-symbols-outlined hero-stat-icon">calendar_month</span>
                        <div>
                            <span className="hero-stat-value">50+</span>
                            <span className="hero-stat-label">Bookings Handled</span>
                        </div>
                    </div>
                    <div className="hero-stat-card">
                        <span className="material-symbols-outlined hero-stat-icon">trending_up</span>
                        <div>
                            <span className="hero-stat-value">1</span>
                            <span className="hero-stat-label">Active Clinic Partner</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
