'use client';

import { useScrollProgress, easeOut, remap } from './ScrollAnimations';

export default function FinalCTASection() {
    const { ref, progress } = useScrollProgress();

    const contentOpacity = easeOut(remap(progress, 0.1, 0.4, 0, 1));
    const contentScale = remap(progress, 0.1, 0.45, 0.9, 1);
    const contentY = remap(progress, 0.1, 0.4, 40, 0);

    return (
        <section className="final-cta" id="cta" ref={ref}>
            <div
                style={{
                    opacity: contentOpacity,
                    transform: `translateY(${contentY}px) scale(${contentScale})`,
                    willChange: 'transform, opacity',
                }}
            >
                <h2>
                    Ready to Transform<br />
                    <span className="hero-headline-accent">Your Clinic?</span>
                </h2>
                <p>
                    Join the clinics already using AI to prepare better for every patient.
                    No setup headaches. No long onboarding.
                </p>
                <div className="final-cta-buttons">
                    <a href="mailto:hello@parchi.tech" className="landing-btn landing-btn-primary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>mic</span>
                        Talk to Parchi
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_forward</span>
                    </a>
                    <a href="mailto:hello@parchi.tech" className="landing-btn landing-btn-secondary" style={{ padding: '0.75rem 2rem', fontSize: '1rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>mail</span>
                        Contact Us
                    </a>
                </div>
            </div>
        </section>
    );
}
