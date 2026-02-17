"use client";

import { motion } from "framer-motion";
import {
    Users,
    Calendar,
    Clock,
    FileText,
    MoreVertical,
    Search,
    CheckCircle2,
    AlertCircle,
    Activity
} from "lucide-react";

export default function DashboardMockup() {
    return (
        <section className="py-12 px-6 relative overflow-hidden">
            <div className="container mx-auto">
                <div className="text-center mb-16">
                    <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
                        Your Pre-Consult <span className="text-primary">Command Center</span>
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto">
                        A clean, India-ready dashboard that organizes patient history and digests reports
                        before they walk in. No more record hunting.
                    </p>
                </div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 40 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="relative max-w-5xl mx-auto"
                >
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-primary/30 to-cyan-500/30 blur-lg opacity-50" />

                    {/* Main Dashboard UI Mockup */}
                    <div className="relative rounded-xl border border-border/50 bg-card/95 backdrop-blur shadow-2xl overflow-hidden aspect-[16/10] md:aspect-[16/9]">
                        {/* Top Bar */}
                        <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-muted/20">
                            <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded-full bg-red-400" />
                                <div className="h-3 w-3 rounded-full bg-yellow-400" />
                                <div className="h-3 w-3 rounded-full bg-green-400" />
                            </div>
                            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-background border border-border w-64">
                                <Search size={14} className="text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Search patients...</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary">DR</span>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar & Content Layout */}
                        <div className="flex h-full">
                            {/* Sidebar */}
                            <div className="w-16 md:w-64 border-r border-border bg-muted/10 hidden md:flex flex-col py-6 gap-2">
                                {[
                                    { icon: Activity, label: "Dashboard", active: true },
                                    { icon: Users, label: "Patients", active: false },
                                    { icon: Calendar, label: "Appointments", active: false },
                                    { icon: FileText, label: "Reports", active: false },
                                ].map((item, i) => (
                                    <div
                                        key={i}
                                        className={`flex items-center gap-3 px-6 py-3 mx-4 rounded-lg cursor-pointer transition-colors ${item.active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/30"
                                            }`}
                                    >
                                        <item.icon size={18} />
                                        <span className="font-medium text-sm">{item.label}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Main Content Area */}
                            <div className="flex-1 p-6 md:p-8 bg-background">
                                <div className="mb-6 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">Good Morning, Dr. Sharma</h3>
                                        <p className="text-sm text-muted-foreground">You have 12 appointments today</p>
                                    </div>
                                    <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                                        + New Consult
                                    </button>
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-3 gap-4 mb-8">
                                    {[
                                        { label: "Patients Waiting", value: "3", color: "text-orange-500" },
                                        { label: "Completed", value: "5", color: "text-green-500" },
                                        { label: "Pending Reports", value: "2", color: "text-blue-500" },
                                    ].map((stat, i) => (
                                        <div key={i} className="rounded-xl border border-border p-4 bg-card">
                                            <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                                            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Upcoming List */}
                                <div className="space-y-3">
                                    <h4 className="text-sm font-semibold text-muted-foreground mb-3">UPCOMING</h4>
                                    {[
                                        { name: "Anjali Mehta", time: "10:30 AM", type: "Follow-up", status: "Brief Ready" },
                                        { name: "Rajesh Kumar", time: "11:00 AM", type: "New Visit", status: "Processing" },
                                        { name: "Priya Sharma", time: "11:15 AM", type: "Report Review", status: "Pending" }
                                    ].map((patient, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/10 transition-colors group cursor-pointer">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                    {patient.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{patient.name}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>{patient.time}</span>
                                                        <span>•</span>
                                                        <span>{patient.type}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {patient.status === "Brief Ready" && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-600 text-[10px] font-medium border border-green-500/20">
                                                        <CheckCircle2 size={12} /> Brief Ready
                                                    </span>
                                                )}
                                                {patient.status === "Processing" && (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 text-[10px] font-medium border border-blue-500/20">
                                                        <Activity size={12} /> Processing
                                                    </span>
                                                )}
                                                <MoreVertical size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Floating cards for effect */}
                    <motion.div
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="hidden md:block absolute -right-12 top-20 glass-card p-4 rounded-xl w-64 shadow-xl z-20"
                    >
                        <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                                <CheckCircle2 size={16} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-foreground">Lab Report Analyzed</p>
                                <p className="text-[10px] text-muted-foreground mt-1">High Hb1Ac (8.2%) detected. Flagged for review.</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                        className="hidden md:block absolute -left-8 bottom-32 glass-card p-4 rounded-xl w-56 shadow-xl z-20"
                    >
                        <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                                <Clock size={16} />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-foreground">Pre-Consult Brief</p>
                                <p className="text-[10px] text-muted-foreground mt-1">Generated in 12s</p>
                            </div>
                        </div>
                    </motion.div>

                </motion.div>
            </div>
        </section>
    );
}
