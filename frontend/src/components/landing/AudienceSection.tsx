'use client';

import { useScrollProgress, easeOut, remap } from './ScrollAnimations';

const audiences = [
    {
        icon: 'person',
        title: 'Solo Practitioners',
        desc: 'One doctor, many patients. Parchi handles the prep so you can focus on care.',
    },
    {
        icon: 'group',
        title: '2–5 Doctor Clinics',
        desc: 'Shared patient context across doctors. No more "what did they come for last time?"',
    },
    {
        icon: 'speed',
        title: 'High-Volume OPDs',
        desc: 'When you see 40+ patients a day, every saved minute compounds.',
    },
    {
        icon: 'event_repeat',
        title: 'Chronic Follow-Up Clinics',
        desc: 'Diabetes, hypertension, thyroid — where continuity and trend tracking matter most.',
    },
];

export default function AudienceSection() {
    const { ref, progress } = useScrollProgress();

    const headerOpacity = easeOut(remap(progress, 0.05, 0.3, 0, 1));
    const headerY = remap(progress, 0.05, 0.3, 50, 0);

    return (
        <section className="landing-section" id="features" ref={ref}>
            <div
                className="landing-section-header"
                style={{
                    opacity: headerOpacity,
                    transform: `translateY(${headerY}px)`,
                    willChange: 'transform, opacity',
                }}
            >
                <span className="landing-section-tag">Who It&apos;s For</span>
                <h2 className="landing-section-title">Built for Clinics That Move Fast.</h2>
            </div>

            <div className="audience-grid">
                {audiences.map((a, i) => {
                    const cardStart = 0.15 + i * 0.07;
                    const cardEnd = cardStart + 0.25;
                    const cardOpacity = easeOut(remap(progress, cardStart, cardEnd, 0, 1));
                    const cardY = remap(progress, cardStart, cardEnd, 40, 0);
                    const cardScale = remap(progress, cardStart, cardEnd, 0.92, 1);

                    return (
                        <div
                            key={i}
                            className="audience-card"
                            style={{
                                opacity: cardOpacity,
                                transform: `translateY(${cardY}px) scale(${cardScale})`,
                                willChange: 'transform, opacity',
                            }}
                        >
                            <div className="audience-icon">
                                <span className="material-symbols-outlined">{a.icon}</span>
                            </div>
                            <h3>{a.title}</h3>
                            <p>{a.desc}</p>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
