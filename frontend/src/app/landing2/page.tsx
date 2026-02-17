import type { Metadata } from 'next';
// import './landing2.css'; // Moved to globals.css

import Navbar from '@/components/landing2/Navbar';
import HeroSection from '@/components/landing2/HeroSection';
import DashboardMockup from '@/components/landing2/DashboardMockup';
import FeaturesSection from '@/components/landing2/FeaturesSection';
import HowItWorksSection from '@/components/landing2/HowItWorksSection';
import CofoundersSection from '@/components/landing2/CofoundersSection';
import CTASection from '@/components/landing2/CTASection';
import Footer from '@/components/landing2/Footer';

export const metadata: Metadata = {
    title: 'Parchi AI — Start Every Consult Prepared | Eliminates 10-15 Min Admin',
    description:
        'Doctor-first AI for Indian clinics. Eliminates 10–15 mins of history-taking and report reading per consult. Pre-consult briefs, secure records, and seamless continuity.',
    openGraph: {
        title: 'Parchi AI — Start Every Consult Prepared',
        description: 'Eliminate 10-15 minutes of admin per consult. Pre-consult briefs, report digestion, and messy workflow support for Indian clinics.',
    },
};

export default function LandingPage() {
    return (
        <div className="landing-page min-h-screen bg-background text-foreground font-sans overflow-x-hidden selection:bg-primary/20">
            <Navbar />
            <HeroSection />
            <DashboardMockup />
            <FeaturesSection />
            <HowItWorksSection />
            <CofoundersSection />
            <CTASection />
            <Footer />
        </div>
    );
}
