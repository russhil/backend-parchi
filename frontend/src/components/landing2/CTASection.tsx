"use client";

import { motion } from "framer-motion";
import { ArrowRight, Mail } from "lucide-react";

const CTASection = () => {
    return (
        <section id="contact" className="py-24 px-6">
            <div className="container max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="relative rounded-3xl overflow-hidden bg-primary px-6 py-16 md:px-16 text-center"
                >
                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" />
                    <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                    <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-5xl font-bold text-primary-foreground mb-6 font-display">
                            Start Every Consult <br />
                            Prepared
                        </h2>
                        <p className="text-primary-foreground/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
                            Join the clinics eliminating 15 minutes of administrative work per patient.
                            Simple setup. Works with your flow.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <motion.a
                                href="#contact"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex items-center gap-2 rounded-xl bg-white text-primary px-8 py-4 font-bold shadow-xl hover:shadow-2xl transition-all w-full sm:w-auto justify-center"
                            >
                                Get Early Access
                                <ArrowRight size={18} />
                            </motion.a>
                            <motion.a
                                href="mailto:hello@parchi.tech"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 text-white px-8 py-4 font-bold backdrop-blur-sm hover:bg-white/20 transition-all w-full sm:w-auto justify-center"
                            >
                                <Mail size={18} />
                                Contact Sales
                            </motion.a>
                        </div>

                        <p className="mt-8 text-primary-foreground/60 text-sm">
                            No credit card required · Cancel anytime
                        </p>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

export default CTASection;
