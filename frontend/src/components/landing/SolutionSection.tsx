'use client';

import { useScrollProgress, easeOut, remap } from './ScrollAnimations';

const features = [
    {
        icon: 'calendar_month',
        title: 'Automated Bookings',
        desc: 'Patients book via voice or chat. The bot handles scheduling, rescheduling, and cancellations.',
    },
    {
        icon: 'search',
        title: 'Smart Patient Search',
        desc: 'Natural language search across your entire patient database — find by condition, lab values, visits.',
    },
    {
        icon: 'description',
        title: 'Document Analysis',
        desc: 'Lab reports, prescriptions, scans analyzed automatically. Key values extracted and flagged.',
    },
    {
        icon: 'psychology',
        title: 'AI Clinical Briefs',
        desc: 'Get a structured summary of symptoms, history, medications, and differential diagnosis before the visit.',
    },
    {
        icon: 'mic',
        title: 'Voice Interface',
        desc: 'Patients interact through voice in their language. No typing required. Accessible for all demographics.',
    },
    {
        icon: 'trending_up',
        title: 'Visit Continuity',
        desc: 'Every visit builds on the last. Trends tracked, medications remembered, follow-ups flagged automatically.',
    },
];

export default function SolutionSection() {
    const { ref, progress } = useScrollProgress();

    const headerOpacity = easeOut(remap(progress, 0.05, 0.3, 0, 1));
    const headerY = remap(progress, 0.05, 0.3, 50, 0);

    return (
        <section className="landing-section landing-section-alt" id="features" ref={ref}>
            <div
                className="landing-section-header"
                style={{
                    opacity: headerOpacity,
                    transform: `translateY(${headerY}px)`,
                    willChange: 'transform, opacity',
                }}
            >
                <span className="landing-section-tag">Features</span>
                <h2 className="landing-section-title">
                    Everything Your Clinic <span className="hero-headline-accent">Needs</span>
                </h2>
                <p className="landing-section-subtitle">
                    From intake to follow-up, Parchi handles the workflows that slow you down.
                </p>
            </div>

            <div className="features-grid">
                {features.map((f, i) => {
                    const cardStart = 0.15 + i * 0.06;
                    const cardEnd = cardStart + 0.25;
                    const cardOpacity = easeOut(remap(progress, cardStart, cardEnd, 0, 1));
                    const cardY = remap(progress, cardStart, cardEnd, 40, 0);

                    return (
                        <div
                            key={i}
                            className="feature-card"
                            style={{
                                opacity: cardOpacity,
                                transform: `translateY(${cardY}px)`,
                                willChange: 'transform, opacity',
                            }}
                        >
                            <div className="feature-icon">
                                <span className="material-symbols-outlined">{f.icon}</span>
                            </div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
