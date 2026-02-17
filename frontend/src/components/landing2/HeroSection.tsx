"use client";

import { motion } from "framer-motion";
import { ArrowRight, Play, TrendingUp } from "lucide-react";

const HeroSection = () => {
    return (
        <section className="relative min-h-screen overflow-hidden pt-32 pb-20 flex flex-col items-center justify-center text-center px-6">
            {/* Background gradients */}
            <div className="hero-glow top-0 left-1/2 -translate-x-1/2" />
            <div className="section-glow bottom-0 right-0" />

            <div className="container relative z-10 max-w-5xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary mb-8">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                        </span>
                        Doctor-First Clinic Assistant
                    </span>

                    <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight text-foreground mb-6 leading-[1.1]">
                        Start Every Consult <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">
                            Prepared
                        </span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed">
                        Eliminate 10–15 mins of history-taking and report reading per consult.
                        Parchi AI provides a pre-consult brief, digests patient reports, and ensures continuity across visits.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                        <motion.a
                            href="#contact"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-2 rounded-xl bg-primary px-8 py-4 font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all w-full sm:w-auto justify-center"
                        >
                            Get Early Access
                            <ArrowRight size={18} />
                        </motion.a>

                        <motion.a
                            href="#how-it-works"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="flex items-center gap-2 rounded-xl border border-border bg-background/50 px-8 py-4 font-semibold text-foreground backdrop-blur-sm transition-all hover:bg-background/80 w-full sm:w-auto justify-center"
                        >
                            <Play size={18} className="fill-foreground" />
                            See How It Works
                        </motion.a>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.5 }}
                        className="grid grid-cols-2 md:grid-cols-2 gap-8 max-w-2xl mx-auto border-t border-border pt-8"
                    >
                        <div className="flex flex-col items-center">
                            <p className="font-display text-3xl font-bold text-foreground mb-1">15m</p>
                            <p className="text-sm text-muted-foreground">Saved Per Consult</p>
                        </div>
                        <div className="flex flex-col items-center">
                            <p className="font-display text-3xl font-bold text-foreground mb-1">100%</p>
                            <p className="text-sm text-muted-foreground">Doctor Control</p>
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                animate={{ y: [0, 8, 0], opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <div className="h-8 w-5 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center pt-1.5">
                    <motion.div
                        animate={{ y: [0, 8, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="h-1.5 w-1.5 rounded-full bg-primary"
                    />
                </div>
            </motion.div>
        </section>
    );
};

export default HeroSection;
