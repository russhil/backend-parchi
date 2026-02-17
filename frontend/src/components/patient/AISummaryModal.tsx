"use client";

import { useEffect, useRef, useState } from "react";
import { generateAISummaryURL } from "@/lib/api";

interface LogEntry {
    type: "info" | "success" | "warning" | "error" | "ai_request" | "ai_response" | "complete";
    message: string;
    timestamp: string;
    data?: Record<string, unknown>;
}

interface AISummaryModalProps {
    patientId: string;
    isOpen: boolean;
    onClose: () => void;
    onComplete: (summary: Record<string, unknown>) => void;
}

export default function AISummaryModal({ patientId, isOpen, onClose, onComplete }: AISummaryModalProps) {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isComplete, setIsComplete] = useState(false);
    const logsEndRef = useRef<HTMLDivElement>(null);
    const eventSourceRef = useRef<EventSource | null>(null);

    useEffect(() => {
        if (isOpen && !isRunning && !isComplete) {
            startGeneration();
        }
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
        };
    }, [isOpen]);

    useEffect(() => {
        // Auto-scroll to bottom when new logs arrive
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const startGeneration = () => {
        setIsRunning(true);
        setLogs([]);
        setIsComplete(false);

        const url = generateAISummaryURL(patientId);
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data) as LogEntry;
                setLogs((prev) => [...prev, data]);

                if (data.type === "complete") {
                    setIsComplete(true);
                    setIsRunning(false);
                    eventSource.close();
                    if (data.data?.summary) {
                        onComplete(data.data.summary as Record<string, unknown>);
                    }
                }

                if (data.type === "error") {
                    setIsRunning(false);
                    eventSource.close();
                }
            } catch (err) {
                console.error("Failed to parse SSE event:", err);
            }
        };

        eventSource.onerror = () => {
            setIsRunning(false);
            setLogs((prev) => [...prev, {
                type: "error",
                message: "❌ Connection lost to server",
                timestamp: new Date().toISOString(),
            }]);
            eventSource.close();
        };
    };

    const getLogColor = (type: LogEntry["type"]) => {
        switch (type) {
            case "success":
                return "text-green-600";
            case "error":
                return "text-red-600";
            case "warning":
                return "text-yellow-600";
            case "ai_request":
                return "text-blue-600";
            case "ai_response":
                return "text-purple-600";
            case "complete":
                return "text-emerald-600 font-semibold";
            default:
                return "text-text-secondary";
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={isComplete ? onClose : undefined}
            />

            {/* Modal */}
            <div className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden border border-border-light">
                {/* Header */}
                <div className="px-5 py-4 border-b border-border-light flex items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isRunning ? "bg-primary/10 animate-pulse" : isComplete ? "bg-green-100" : "bg-red-100"}`}>
                            <span className={`material-symbols-outlined text-[24px] ${isRunning ? "text-primary" : isComplete ? "text-green-600" : "text-red-600"}`}>
                                {isRunning ? "sync" : isComplete ? "check_circle" : "error"}
                            </span>
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-text-primary">AI Summary Generation</h2>
                            <p className="text-xs text-text-secondary">
                                {isRunning ? "Processing..." : isComplete ? "Completed successfully" : "Generation stopped"}
                            </p>
                        </div>
                    </div>
                    {(isComplete || !isRunning) && (
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-hover transition-colors"
                        >
                            <span className="material-symbols-outlined text-[20px] text-text-secondary">close</span>
                        </button>
                    )}
                </div>

                {/* Log Console */}
                <div className="h-80 overflow-y-auto bg-gray-900 p-4 font-mono text-xs">
                    {logs.length === 0 && (
                        <div className="text-gray-500 animate-pulse">Connecting to server...</div>
                    )}
                    {logs.map((log, index) => (
                        <div key={index} className="mb-1.5 flex gap-2">
                            <span className="text-gray-500 shrink-0">
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={getLogColor(log.type)}>
                                {log.message}
                            </span>
                            {log.data && (
                                <span className="text-gray-500 ml-2">
                                    {JSON.stringify(log.data).slice(0, 60)}
                                    {JSON.stringify(log.data).length > 60 && "..."}
                                </span>
                            )}
                        </div>
                    ))}
                    <div ref={logsEndRef} />
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-border-light bg-bg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {isRunning && (
                            <div className="flex items-center gap-2 text-xs text-text-secondary">
                                <div className="w-2 h-2 rounded-full bg-primary animate-ping" />
                                <span>Real-time streaming</span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        {!isRunning && !isComplete && (
                            <button
                                onClick={startGeneration}
                                className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-colors"
                            >
                                Retry
                            </button>
                        )}
                        {isComplete && (
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-dark transition-colors"
                            >
                                Done
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
