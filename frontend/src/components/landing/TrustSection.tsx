'use client';

import { useScrollProgress, easeOut, remap } from './ScrollAnimations';

const steps = [
    {
        step: '01',
        icon: 'mic',
        title: 'Patient Calls or Chats',
        desc: 'The patient interacts with Parchi through voice call or chat. The bot collects symptoms, history, and uploads.',
    },
    {
        step: '02',
        icon: 'auto_awesome',
        title: 'AI Prepares the Brief',
        desc: 'Reports are analyzed, data structured, and a clinical brief with differential diagnosis is generated automatically.',
    },
    {
        step: '03',
        icon: 'stethoscope',
        title: 'Doctor Starts Prepared',
        desc: 'When the patient walks in, the doctor sees a one-page summary — no repetitive questioning needed.',
    },
];

export default function TrustSection() {
    const { ref, progress } = useScrollProgress();

    const headerOpacity = easeOut(remap(progress, 0.05, 0.3, 0, 1));
    const headerY = remap(progress, 0.05, 0.3, 50, 0);

    return (
        <section className="landing-section" id="how-it-works" ref={ref}>
            <div
                className="landing-section-header"
                style={{
                    opacity: headerOpacity,
                    transform: `translateY(${headerY}px)`,
                    willChange: 'transform, opacity',
                }}
            >
                <span className="landing-section-tag">How It Works</span>
                <h2 className="landing-section-title">
                    Three Steps to a <span className="hero-headline-accent">Smarter Clinic</span>
                </h2>
                <p className="landing-section-subtitle">
                    From patient call to doctor&apos;s desk — seamless and automatic.
                </p>
            </div>

            <div className="steps-grid">
                {steps.map((s, i) => {
                    const cardStart = 0.15 + i * 0.1;
                    const cardEnd = cardStart + 0.3;
                    const cardOpacity = easeOut(remap(progress, cardStart, cardEnd, 0, 1));
                    const cardY = remap(progress, cardStart, cardEnd, 50, 0);
                    const cardScale = remap(progress, cardStart, cardEnd, 0.92, 1);

                    return (
                        <div
                            key={i}
                            className="step-card"
                            style={{
                                opacity: cardOpacity,
                                transform: `translateY(${cardY}px) scale(${cardScale})`,
                                willChange: 'transform, opacity',
                            }}
                        >
                            <div className="step-number">{s.step}</div>
                            <div className="step-icon">
                                <span className="material-symbols-outlined">{s.icon}</span>
                            </div>
                            <h3>{s.title}</h3>
                            <p>{s.desc}</p>
                            {i < steps.length - 1 && (
                                <div className="step-connector">
                                    <span className="material-symbols-outlined">arrow_forward</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
