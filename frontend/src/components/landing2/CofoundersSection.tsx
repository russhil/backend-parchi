"use client";

import { motion } from "framer-motion";
import { Linkedin } from "lucide-react";
import Image from "next/image";

// Import images or use placeholders if specific images are not available in this context
// Since I can't easily access the assets from the bansh repo without copying them, 
// I'll assume we can use the same pattern or placeholders. 
// Ideally we should copy the assets too, but for code correctness i will try to use next/image

const founders = [
    {
        name: "Russhil Chawla",
        role: "Co-Founder",
        bio: "MBA graduate who spent months shadowing OPD workflows across small clinics. Obsessed with the gap between how doctors actually work and how software expects them to.",
        linkedin: "https://www.linkedin.com/in/rixx/",
        initials: "RC"
    },
    {
        name: "Vansh Sood",
        role: "Co-Founder",
        bio: "Engineer who believes the best healthcare tech is invisible. Built systems for high-throughput environments. Now building tools doctors actually want to use.",
        linkedin: "https://www.linkedin.com/in/vanshsback/",
        initials: "VS"
    },
];

const CofoundersSection = () => {
    return (
        <section id="team" className="py-24 bg-muted/30">
            <div className="container px-6 mx-auto">
                <div className="text-center mb-16">
                    <span className="text-primary font-semibold tracking-wide text-sm uppercase">
                        The Team
                    </span>
                    <h2 className="mt-3 text-3xl md:text-4xl font-bold text-foreground font-display">
                        Built for Indian <span className="text-primary">Healthcare</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {founders.map((person, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: i * 0.2 }}
                            className="group bg-card border border-border rounded-2xl p-8 hover:border-primary/30 hover:shadow-lg transition-all"
                        >
                            <div className="flex items-start gap-6">
                                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 text-2xl font-bold text-primary">
                                    {person.initials}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-foreground">
                                        {person.name}
                                    </h3>
                                    <p className="text-sm font-medium text-primary mb-3">
                                        {person.role}
                                    </p>

                                    <a
                                        href={person.linkedin}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-blue-600 transition-colors"
                                    >
                                        <Linkedin size={14} />
                                        LinkedIn Profile
                                    </a>
                                </div>
                            </div>

                            <p className="mt-6 text-muted-foreground leading-relaxed">
                                {person.bio}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default CofoundersSection;
