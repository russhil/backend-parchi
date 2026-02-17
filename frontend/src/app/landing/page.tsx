import type { Metadata } from 'next';
import './landing.css';

import LandingNav from '@/components/landing/LandingNav';
import HeroSection from '@/components/landing/HeroSection';
import InteractiveDemo from '@/components/landing/InteractiveDemo';
import ProblemSection from '@/components/landing/ProblemSection';
import SolutionSection from '@/components/landing/SolutionSection';
import TrustSection from '@/components/landing/TrustSection';
import TeamSection from '@/components/landing/TeamSection';
import FinalCTASection from '@/components/landing/FinalCTASection';
import Footer from '@/components/landing/Footer';

export const metadata: Metadata = {
    title: 'Parchi AI — Your Clinic\'s AI Receptionist & Assistant',
    description:
        'Parchi AI handles bookings, manages patient records, summarizes cases, and provides differential diagnoses — all through voice and text. Built for Indian clinics.',
};

export default function LandingPage() {
    return (
        <div className="landing-page">
            <LandingNav />
            <HeroSection />
            <ProblemSection />
            <InteractiveDemo />
            <SolutionSection />
            <TrustSection />
            <TeamSection />
            <FinalCTASection />
            <Footer />
        </div>
    );
}
