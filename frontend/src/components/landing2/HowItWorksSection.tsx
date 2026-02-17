"use client";

import { motion } from "framer-motion";
import { UploadCloud, Sparkles, Stethoscope } from "lucide-react";

const steps = [
    {
        step: "01",
        title: "Patient Sends Info",
        description: "Via WhatsApp, link, or chat. They upload old reports, prescriptions, or record a voice note about their symptoms.",
        icon: UploadCloud,
    },
    {
        step: "02",
        title: "Parchi Organizes It",
        description: "AI extracts history, digests reports into key values, and highlights red flags for your review.",
        icon: Sparkles,
    },
    {
        step: "03",
        title: "You Start Prepared",
        description: "Review the 1-page clinical brief in 30 seconds. Walk into the consult knowing the full story.",
        icon: Stethoscope,
    },
];

const HowItWorksSection = () => {
    return (
        <section id="how-it-works" className="py-24 relative">
            <div className="container px-6 mx-auto">
                <div className="text-center mb-16">
                    <span className="text-primary font-semibold tracking-wide text-sm uppercase">
                        How It Works
                    </span>
                    <h2 className="mt-3 text-3xl md:text-4xl font-bold text-foreground font-display">
                        Three Steps to a <br />
                        <span className="text-primary">Smarter Clinic</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative max-w-5xl mx-auto">
                    {/* Connector Line (Desktop) */}
                    <div className="hidden md:block absolute top-[20%] left-[16%] right-[16%] h-0.5 bg-gradient-to-r from-border via-primary/30 to-border -z-10" />

                    {steps.map((s, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.2 }}
                            className="flex flex-col items-center text-center group cursor-default"
                        >
                            <div className="relative mb-6">
                                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                <div className="relative h-20 w-20 rounded-2xl bg-card border border-border flex items-center justify-center shadow-lg group-hover:border-primary/50 group-hover:-translate-y-2 transition-all duration-300">
                                    <s.icon size={32} className="text-primary" />
                                </div>
                                <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm border-2 border-background shadow-sm">
                                    {s.step}
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-foreground mb-3 font-display">
                                {s.title}
                            </h3>
                            <p className="text-muted-foreground leading-relaxed max-w-xs">
                                {s.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default HowItWorksSection;
