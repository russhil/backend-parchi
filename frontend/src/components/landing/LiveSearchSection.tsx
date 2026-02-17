'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useScrollProgress, easeOut, remap } from './ScrollAnimations';

const queries = [
    {
        text: 'Migraine patients with elevated CRP',
        results: [
            { name: 'Anjali Mehta', detail: 'CRP 8.2 · Chronic migraine · Last visit 3 days ago', color: '#ef4444' },
            { name: 'Kavita Rao', detail: 'CRP 12.1 · Migraine with aura · Last visit 1 week ago', color: '#f59e0b' },
        ],
    },
    {
        text: 'Diabetes patients overdue for follow-up',
        results: [
            { name: 'Rajesh Kumar', detail: 'HbA1c 8.1% · Last visit 4 months ago · Overdue', color: '#ef4444' },
            { name: 'Sunita Devi', detail: 'HbA1c 7.4% · Last visit 3 months ago · Due', color: '#f59e0b' },
            { name: 'Mohammed Ali', detail: 'HbA1c 9.2% · Last visit 6 months ago · Overdue', color: '#ef4444' },
        ],
    },
    {
        text: 'Fever cases this week',
        results: [
            { name: 'Priya Sharma', detail: 'Low-grade fever · Day 5 · WBC 11,200', color: '#3b82f6' },
            { name: 'Arjun Singh', detail: 'High fever · Day 2 · Dengue NS1 pending', color: '#ef4444' },
        ],
    },
];

export default function LiveSearchSection() {
    const [currentQuery, setCurrentQuery] = useState(0);
    const [displayedText, setDisplayedText] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [isTyping, setIsTyping] = useState(true);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const { ref: sectionRef, progress } = useScrollProgress();

    const typeQuery = useCallback((queryIndex: number) => {
        const text = queries[queryIndex].text;
        let charIndex = 0;
        setDisplayedText('');
        setShowResults(false);
        setIsTyping(true);

        const typeChar = () => {
            if (charIndex <= text.length) {
                setDisplayedText(text.slice(0, charIndex));
                charIndex++;
                timeoutRef.current = setTimeout(typeChar, 40 + Math.random() * 30);
            } else {
                setIsTyping(false);
                timeoutRef.current = setTimeout(() => {
                    setShowResults(true);
                    timeoutRef.current = setTimeout(() => {
                        const next = (queryIndex + 1) % queries.length;
                        setCurrentQuery(next);
                    }, 3000);
                }, 400);
            }
        };

        timeoutRef.current = setTimeout(typeChar, 600);
    }, []);

    useEffect(() => {
        typeQuery(currentQuery);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, [currentQuery, typeQuery]);

    const headerOpacity = easeOut(remap(progress, 0.05, 0.3, 0, 1));
    const headerY = remap(progress, 0.05, 0.3, 50, 0);
    const containerOpacity = easeOut(remap(progress, 0.15, 0.4, 0, 1));
    const containerScale = remap(progress, 0.15, 0.45, 0.9, 1);
    const containerY = remap(progress, 0.15, 0.4, 30, 0);

    const query = queries[currentQuery];

    return (
        <section className="landing-section" id="search" ref={sectionRef}>
            <div
                className="landing-section-header"
                style={{
                    opacity: headerOpacity,
                    transform: `translateY(${headerY}px)`,
                    willChange: 'transform, opacity',
                }}
            >
                <span className="landing-section-tag">Power Feature</span>
                <h2 className="landing-section-title">Search Your Clinic Like Google.</h2>
                <p className="landing-section-subtitle">
                    Find patients by condition, lab value, medication, or visit status.
                    Instant. Intelligent. No filters to configure.
                </p>
            </div>

            <div
                className="search-demo-container"
                style={{
                    opacity: containerOpacity,
                    transform: `translateY(${containerY}px) scale(${containerScale})`,
                    willChange: 'transform, opacity',
                }}
            >
                <div className={`search-demo-bar ${showResults ? 'active' : ''}`}>
                    <div className="search-demo-input">
                        <span className="icon material-symbols-outlined" style={{ fontSize: '1.25rem' }}>search</span>
                        <span className="search-demo-text">
                            {displayedText}
                            {isTyping && <span className="search-cursor" />}
                        </span>
                    </div>

                    {showResults && (
                        <div className="search-demo-results">
                            {query.results.map((r, i) => (
                                <div key={i} className="search-result-item">
                                    <div className="search-result-dot" style={{ background: r.color }} />
                                    <div>
                                        <div className="search-result-name">{r.name}</div>
                                        <div className="search-result-detail">{r.detail}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}
