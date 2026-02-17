"use client";

import { motion } from "framer-motion";
import { PenTool } from "lucide-react";

const Footer = () => {
    return (
        <footer className="border-t border-border bg-background py-12">
            <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-6 sm:flex-row">
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="flex items-center gap-2 cursor-pointer"
                >
                    <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.5 }}
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-primary"
                    >
                        <PenTool size={12} className="text-primary-foreground" />
                    </motion.div>
                    <span className="font-display text-lg font-bold text-foreground">
                        Parchi AI
                    </span>
                </motion.div>

                <div className="flex items-center gap-6">
                    <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
                    <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
                    <a href="#team" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Team</a>
                </div>

                <p className="text-sm text-muted-foreground">
                    © {new Date().getFullYear()} Parchi AI. Built for Indian clinics.
                </p>
            </div>
        </footer>
    );
};

export default Footer;
