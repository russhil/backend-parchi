'use client';

import { useScrollProgress, easeOut, remap } from './ScrollAnimations';

const founders = [
    {
        initials: 'RC',
        name: 'Russhil Chawla',
        role: 'Co-Founder',
        school: 'IIM Bodh Gaya',
        bio: 'MBA graduate who spent months shadowing OPD workflows across small clinics. Obsessed with the gap between how doctors actually work and how software expects them to.',
        linkedin: 'https://www.linkedin.com/in/rixx/',
    },
    {
        initials: 'VS',
        name: 'Vansh Sood',
        role: 'Co-Founder',
        school: 'BITS Pilani',
        bio: 'Engineer who believes the best healthcare tech is invisible. Built systems for high-throughput environments. Now building tools doctors actually want to use.',
        linkedin: 'https://www.linkedin.com/in/vanshsback/',
    },
];

export default function TeamSection() {
    const { ref, progress } = useScrollProgress();

    const headerOpacity = easeOut(remap(progress, 0.05, 0.3, 0, 1));
    const headerY = remap(progress, 0.05, 0.3, 50, 0);

    return (
        <section className="landing-section landing-section-alt" id="team" ref={ref}>
            <div
                className="landing-section-header"
                style={{
                    opacity: headerOpacity,
                    transform: `translateY(${headerY}px)`,
                    willChange: 'transform, opacity',
                }}
            >
                <span className="landing-section-tag">The Team</span>
                <h2 className="landing-section-title">
                    Meet the <span className="hero-headline-accent">Cofounders</span>
                </h2>
            </div>

            <div className="team-grid">
                {founders.map((f, i) => {
                    const cardStart = 0.2 + i * 0.1;
                    const cardEnd = cardStart + 0.3;
                    const cardOpacity = easeOut(remap(progress, cardStart, cardEnd, 0, 1));
                    const cardX = i === 0
                        ? remap(progress, cardStart, cardEnd, -50, 0)
                        : remap(progress, cardStart, cardEnd, 50, 0);

                    return (
                        <div
                            key={i}
                            className="team-card"
                            style={{
                                opacity: cardOpacity,
                                transform: `translateX(${cardX}px)`,
                                willChange: 'transform, opacity',
                            }}
                        >
                            <div className="team-avatar">{f.initials}</div>
                            <h3>{f.name}</h3>
                            <div className="team-school">{f.school}</div>
                            <div className="team-role">{f.role}</div>
                            <p>{f.bio}</p>
                            <a href={f.linkedin} target="_blank" rel="noopener noreferrer" className="team-linkedin">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" /></svg>
                                LinkedIn
                            </a>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
