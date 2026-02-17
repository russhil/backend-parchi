"use client";

import { motion } from "framer-motion";
import {
    FileText,
    BrainCircuit,
    History,
    MessageSquare,
    ShieldCheck,
    Search
} from "lucide-react";

const features = [
    {
        icon: FileText,
        title: "Report Digestion",
        description: "Lab reports, prescriptions, and scans are analyzed instantly. No more reading through 10 pages to find one value.",
    },
    {
        icon: BrainCircuit,
        title: "Pre-Consult Brief",
        description: "Get a structured summary of symptoms, history, and meds. Includes key flags and suggested differentials as optional support.",
    },
    {
        icon: History,
        title: "Seamless Continuity",
        description: "Every visit builds on previous history. Patient trends are tracked, medications remembered, and follow-ups flagged.",
    },
    {
        icon: MessageSquare,
        title: "Messy Workflow Support",
        description: "Works with WhatsApp & Paper. Patients send photos or voice notes. Parchi structures it all into the record.",
    },
    {
        icon: ShieldCheck,
        title: "Doctor Control",
        description: "You are always in charge. The AI suggests, you decide. Full audit trails and privacy-first design.",
    },
    {
        icon: Search,
        title: "Instant Retrieval",
        description: "Find any patient in seconds. \"Show me all patients with migraine from last month\" — search that actually works.",
    },
];

const FeaturesSection = () => {
    return (
        <section id="features" className="py-24 relative overflow-hidden bg-muted/30">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-50" />
            <div className="container px-6 mx-auto">
                <div className="text-center max-w-2xl mx-auto mb-16">
                    <span className="text-primary font-semibold tracking-wide text-sm uppercase">
                        Everything You Need
                    </span>
                    <h2 className="mt-3 text-3xl md:text-4xl font-bold text-foreground font-display">
                        Built for the Chaos of <br />
                        <span className="text-primary">Real-World Clinics</span>
                    </h2>
                    <p className="mt-4 text-muted-foreground text-lg">
                        From intake to follow-up, Parchi handles the workflows that slow you down.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {features.map((f, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.1 }}
                            whileHover={{ y: -6, scale: 1.02 }}
                            className="group relative overflow-hidden rounded-2xl bg-card border border-border p-8 transition-all hover:shadow-[0_0_40px_-10px_rgba(var(--primary-rgb),0.1)] hover:border-primary/30"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <f.icon size={80} />
                            </div>

                            <div className="relative z-10">
                                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                                    <f.icon size={24} />
                                </div>
                                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                                    {f.title}
                                </h3>
                                <p className="text-muted-foreground leading-relaxed">
                                    {f.description}
                                </p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;
