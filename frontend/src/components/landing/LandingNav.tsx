'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function LandingNav() {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <nav className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
            <Link href="/landing" className="landing-nav-logo">
                <span className="landing-nav-logo-text">parchi</span>
                <span className="landing-nav-logo-dot"></span>
            </Link>

            <div className="landing-nav-links">
                <a href="#features" className="landing-nav-link">Features</a>
                <a href="#how-it-works" className="landing-nav-link">How It Works</a>
                <a href="#team" className="landing-nav-link">Team</a>
            </div>

            <div className="landing-nav-actions">
                <a href="#cta" className="landing-btn landing-btn-primary landing-btn-sm">
                    Get Started
                </a>
            </div>
        </nav>
    );
}
