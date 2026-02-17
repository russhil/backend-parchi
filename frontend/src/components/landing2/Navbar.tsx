"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion } from "framer-motion";

const Navbar = () => {
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <motion.nav
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed left-0 right-0 top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-md"
        >
            <div className="container mx-auto flex h-16 items-center justify-between px-6">
                <a href="#" className="flex items-center gap-2">
                    <span className="font-display text-xl font-bold text-foreground">
                        Parchi AI
                    </span>
                </a>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-8">
                    {["Features", "How It Works", "Team"].map((item) => (
                        <a
                            key={item}
                            href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                        >
                            {item}
                        </a>
                    ))}
                    <a
                        href="#contact"
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:bg-primary/90"
                    >
                        Get Early Access
                    </a>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-foreground"
                    onClick={() => setMobileOpen(!mobileOpen)}
                >
                    {mobileOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {mobileOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="border-t border-border bg-background px-6 py-4 md:hidden"
                >
                    {["Features", "How It Works", "Team"].map((item) => (
                        <a
                            key={item}
                            href={`#${item.toLowerCase().replace(/ /g, "-")}`}
                            className="block py-3 text-sm text-muted-foreground"
                            onClick={() => setMobileOpen(false)}
                        >
                            {item}
                        </a>
                    ))}
                    <a
                        href="#contact"
                        className="mt-2 block rounded-lg bg-primary py-3 text-center text-sm font-medium text-primary-foreground"
                    >
                        Get Early Access
                    </a>
                </motion.div>
            )}
        </motion.nav>
    );
};

export default Navbar;
