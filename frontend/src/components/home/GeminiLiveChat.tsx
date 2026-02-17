"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000";

type Status = "idle" | "connecting" | "listening" | "speaking" | "error";

interface GeminiLiveChatProps {
    onClose: () => void;
}

// --- Audio utility functions ---

function downsampleBuffer(buffer: Float32Array, sampleRate: number, outSampleRate: number): Float32Array {
    if (outSampleRate === sampleRate) return buffer;
    const ratio = sampleRate / outSampleRate;
    const newLength = Math.round(buffer.length / ratio);
    const result = new Float32Array(newLength);
    let offsetResult = 0;
    let offsetBuffer = 0;
    while (offsetResult < result.length) {
        const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
        let accum = 0, count = 0;
        for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
            accum += buffer[i];
            count++;
        }
        result[offsetResult] = accum / count;
        offsetResult++;
        offsetBuffer = nextOffsetBuffer;
    }
    return result;
}

function convertFloat32ToInt16(buffer: Float32Array): ArrayBuffer {
    const buf = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
        buf[i] = Math.min(1, Math.max(-1, buffer[i])) * 0x7FFF;
    }
    return buf.buffer;
}

export default function GeminiLiveChat({ onClose }: GeminiLiveChatProps) {
    const [status, setStatus] = useState<Status>("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [transcript, setTranscript] = useState<{ role: "user" | "gemini"; text: string }[]>([]);
    const [isMicOn, setIsMicOn] = useState(true);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const workletNodeRef = useRef<AudioWorkletNode | null>(null);

    // Playback scheduling
    const nextStartTimeRef = useRef(0);
    const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);

    // Refs for async callback access
    const isMicOnRef = useRef(true);
    const statusRef = useRef<Status>("idle");
    const connectingRef = useRef(false);

    // Current transcript accumulation refs
    const currentUserRef = useRef<number | null>(null);
    const currentGeminiRef = useRef<number | null>(null);

    const transcriptEndRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => { isMicOnRef.current = isMicOn; }, [isMicOn]);
    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => {
        transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [transcript]);

    // --- Audio context ---
    const initAudioContext = useCallback(async () => {
        if (!audioContextRef.current) {
            audioContextRef.current = new AudioContext();
        }
        if (audioContextRef.current.state === "suspended") {
            await audioContextRef.current.resume();
        }
    }, []);

    // --- Stop playback ---
    const stopPlayback = useCallback(() => {
        scheduledSourcesRef.current.forEach(s => {
            try { s.stop(); s.disconnect(); } catch { }
        });
        scheduledSourcesRef.current = [];
        if (audioContextRef.current) {
            nextStartTimeRef.current = audioContextRef.current.currentTime;
        }
    }, []);

    // --- Play received audio (raw Int16 PCM at 24kHz from Gemini) ---
    const playAudio = useCallback((arrayBuffer: ArrayBuffer) => {
        if (!audioContextRef.current) return;
        if (audioContextRef.current.state === "suspended") {
            audioContextRef.current.resume();
        }

        const pcmData = new Int16Array(arrayBuffer);
        const float32Data = new Float32Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            float32Data[i] = pcmData[i] / 32768.0;
        }

        const buffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);
        buffer.getChannelData(0).set(float32Data);

        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);

        const now = audioContextRef.current.currentTime;
        nextStartTimeRef.current = Math.max(now, nextStartTimeRef.current);
        source.start(nextStartTimeRef.current);
        nextStartTimeRef.current += buffer.duration;

        scheduledSourcesRef.current.push(source);
        source.onended = () => {
            scheduledSourcesRef.current = scheduledSourcesRef.current.filter(s => s !== source);
            if (scheduledSourcesRef.current.length === 0 && statusRef.current === "speaking") {
                setStatus("listening");
            }
        };
    }, []);

    // --- Start mic capture with AudioWorklet ---
    const startAudioCapture = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
            });
            mediaStreamRef.current = stream;

            await initAudioContext();
            const ctx = audioContextRef.current!;

            await ctx.audioWorklet.addModule("/pcm-processor.js");

            const source = ctx.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(ctx, "pcm-processor");

            workletNode.port.onmessage = (e: MessageEvent<Float32Array>) => {
                if (wsRef.current?.readyState !== WebSocket.OPEN) return;
                if (statusRef.current !== "listening" || !isMicOnRef.current) return;

                const downsampled = downsampleBuffer(e.data, ctx.sampleRate, 16000);
                const pcm16 = convertFloat32ToInt16(downsampled);
                wsRef.current.send(pcm16);
            };

            source.connect(workletNode);
            // Mute local feedback
            const muteGain = ctx.createGain();
            muteGain.gain.value = 0;
            workletNode.connect(muteGain);
            muteGain.connect(ctx.destination);

            workletNodeRef.current = workletNode;
            return true;
        } catch (error) {
            setErrorMessage("Microphone error: " + (error instanceof Error ? error.message : "Unknown"));
            setStatus("error");
            return false;
        }
    }, [initAudioContext]);

    // --- Connect ---
    const connect = useCallback(async () => {
        if (connectingRef.current) return;
        connectingRef.current = true;
        setStatus("connecting");
        setErrorMessage("");
        setTranscript([]);
        currentUserRef.current = null;
        currentGeminiRef.current = null;
        console.log("[GeminiLive] Starting connection...");

        try {
            const audioOk = await startAudioCapture();
            if (!audioOk) {
                console.log("[GeminiLive] Audio capture failed");
                connectingRef.current = false;
                return;
            }
            console.log("[GeminiLive] Audio capture ready");

            const ws = new WebSocket(`${WS_URL}/ws/gemini-live`);
            ws.binaryType = "arraybuffer";
            wsRef.current = ws;

            // 10s connection timeout
            const connectTimeout = setTimeout(() => {
                if (statusRef.current === "connecting") {
                    console.log("[GeminiLive] Connection timeout (10s)");
                    setErrorMessage("Connection timed out. Backend may be unreachable or Gemini API is slow.");
                    setStatus("error");
                    connectingRef.current = false;
                    ws.close();
                }
            }, 10000);

            ws.onopen = () => {
                clearTimeout(connectTimeout);
                console.log("[GeminiLive] WebSocket open");
                setStatus("listening");
                connectingRef.current = false;
            };

            ws.onmessage = (event) => {
                if (event.data instanceof ArrayBuffer) {
                    // Binary = audio from Gemini
                    if (statusRef.current !== "speaking") {
                        console.log("[GeminiLive] Receiving audio, switching to speaking");
                        setStatus("speaking");
                    }
                    playAudio(event.data);
                } else {
                    // Text = JSON event
                    try {
                        const msg = JSON.parse(event.data);
                        console.log("[GeminiLive] Event:", msg.type, msg.type === "error" ? msg.error : "");

                        if (msg.type === "user") {
                            setTranscript(prev => {
                                if (currentUserRef.current !== null && prev.length > 0 && currentUserRef.current === prev.length - 1) {
                                    const updated = [...prev];
                                    updated[currentUserRef.current] = {
                                        ...updated[currentUserRef.current],
                                        text: updated[currentUserRef.current].text + msg.text,
                                    };
                                    return updated;
                                }
                                currentUserRef.current = prev.length;
                                currentGeminiRef.current = null;
                                return [...prev, { role: "user", text: msg.text }];
                            });
                        } else if (msg.type === "gemini") {
                            setTranscript(prev => {
                                if (currentGeminiRef.current !== null && prev.length > 0 && currentGeminiRef.current === prev.length - 1) {
                                    const updated = [...prev];
                                    updated[currentGeminiRef.current] = {
                                        ...updated[currentGeminiRef.current],
                                        text: updated[currentGeminiRef.current].text + msg.text,
                                    };
                                    return updated;
                                }
                                currentGeminiRef.current = prev.length;
                                currentUserRef.current = null;
                                return [...prev, { role: "gemini", text: msg.text }];
                            });
                        } else if (msg.type === "turn_complete") {
                            currentGeminiRef.current = null;
                            currentUserRef.current = null;
                            setStatus("listening");
                        } else if (msg.type === "interrupted") {
                            stopPlayback();
                            currentGeminiRef.current = null;
                            currentUserRef.current = null;
                            setStatus("listening");
                        } else if (msg.type === "tool_call") {
                            setTranscript(prev => [...prev, { role: "gemini", text: `[Looking up: ${msg.name}...]` }]);
                            currentGeminiRef.current = null;
                        } else if (msg.type === "error") {
                            setErrorMessage(msg.error || "Unknown error");
                            setStatus("error");
                        }
                    } catch (parseErr) {
                        console.error("[GeminiLive] JSON parse error:", parseErr, "raw:", event.data);
                    }
                }
            };

            ws.onerror = (event) => {
                clearTimeout(connectTimeout);
                console.error("[GeminiLive] WebSocket error:", event);
                setErrorMessage("Connection failed. Check if backend is running.");
                setStatus("error");
                connectingRef.current = false;
            };

            ws.onclose = (event) => {
                clearTimeout(connectTimeout);
                console.log("[GeminiLive] WebSocket closed, code:", event.code, "reason:", event.reason);
                connectingRef.current = false;
                // If closed while still connecting, treat as error
                if (statusRef.current === "connecting") {
                    setErrorMessage("Connection closed before session started. Check backend logs.");
                    setStatus("error");
                } else if (statusRef.current !== "error") {
                    setStatus("idle");
                }
            };
        } catch (err) {
            console.error("[GeminiLive] Connect error:", err);
            setErrorMessage(err instanceof Error ? err.message : "Failed to connect");
            setStatus("error");
            connectingRef.current = false;
        }
    }, [startAudioCapture, playAudio, stopPlayback]);

    // --- Mic toggle ---
    const handleMicToggle = useCallback(() => {
        if (statusRef.current === "idle" || statusRef.current === "error") {
            connect();
            return;
        }
        if (statusRef.current === "connecting") return;

        if (statusRef.current === "speaking") {
            stopPlayback();
            setStatus("listening");
            setIsMicOn(true);
        } else if (statusRef.current === "listening") {
            setIsMicOn(prev => !prev);
        }
    }, [connect, stopPlayback]);

    // --- Disconnect ---
    const disconnect = useCallback(() => {
        stopPlayback();

        if (workletNodeRef.current) {
            workletNodeRef.current.disconnect();
            workletNodeRef.current = null;
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop());
            mediaStreamRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => { });
            audioContextRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setStatus("idle");
        connectingRef.current = false;
    }, [stopPlayback]);

    const handleClose = useCallback(() => {
        disconnect();
        onClose();
    }, [disconnect, onClose]);

    useEffect(() => {
        return () => { disconnect(); };
    }, [disconnect]);

    const getStatusText = () => {
        switch (status) {
            case "connecting": return "Connecting...";
            case "listening": return isMicOn ? "Listening..." : "Mic Muted";
            case "speaking": return "Speaking...";
            case "error": return errorMessage || "Error occurred";
            default: return "Tap to start";
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden transform transition-all">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-light bg-surface/50">
                    <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">graphic_eq</span>
                        Voice Chat
                    </h2>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-hover rounded-full transition text-text-secondary"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-8 flex flex-col items-center min-h-[400px] justify-between bg-gradient-to-b from-surface to-bg">
                    <div className="flex-1 w-full flex flex-col items-center justify-center">
                        <div className="relative mb-8">
                            <button
                                onClick={handleMicToggle}
                                className={`w-28 h-28 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl
                                    ${status === "listening" && isMicOn
                                        ? "bg-red-500 shadow-red-500/40 scale-110"
                                        : status === "speaking"
                                            ? "bg-green-500 shadow-green-500/40"
                                            : status === "connecting"
                                                ? "bg-yellow-500 animate-pulse"
                                                : status === "error"
                                                    ? "bg-red-700"
                                                    : "bg-skeleton hover:bg-text-secondary"
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-white text-5xl transition-transform duration-300 ${status === "listening" && isMicOn ? "scale-110" : ""}`}>
                                    {status === "error" ? "error" :
                                        status === "speaking" ? "graphic_eq" :
                                            status === "connecting" ? "sync" :
                                                isMicOn ? "mic" : "mic_off"}
                                </span>
                            </button>

                            {status === "listening" && isMicOn && (
                                <>
                                    <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: '1.5s' }} />
                                    <div className="absolute inset-[-12px] rounded-full border border-red-500/30 animate-pulse" />
                                </>
                            )}

                            {status === "speaking" && (
                                <div className="absolute inset-[-8px] rounded-full border-2 border-green-500/30 animate-spin-slow border-t-transparent" />
                            )}
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            <div className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors duration-300
                                ${status === "listening" && isMicOn ? "bg-red-50 text-red-600" :
                                    status === "speaking" ? "bg-green-50 text-green-600" :
                                        status === "connecting" ? "bg-yellow-50 text-yellow-600" :
                                            status === "error" ? "bg-red-50 text-red-700" :
                                                "bg-muted text-text-secondary"
                                }`}>
                                {getStatusText()}
                            </div>
                            {status === "error" && errorMessage && (
                                <div className="mt-2 px-4 py-2 bg-red-50 border border-red-200 rounded-xl max-w-xs text-center">
                                    <p className="text-xs text-red-700 leading-relaxed">{errorMessage}</p>
                                    <p className="text-[10px] text-red-400 mt-1">Tap the mic to retry</p>
                                </div>
                            )}
                            <p className="text-xs text-text-secondary h-4">
                                {status === "listening" && isMicOn ? "Tap to mute" :
                                    status === "listening" && !isMicOn ? "Tap to unmute" :
                                        status === "speaking" ? "Tap to interrupt" :
                                            status === "idle" ? "Tap microphone to start" : ""}
                            </p>
                        </div>
                    </div>

                    <div className="w-full mt-6">
                        <div className="bg-surface border border-border-light rounded-2xl p-4 h-40 overflow-y-auto shadow-sm">
                            {transcript.length > 0 ? (
                                <div className="space-y-2">
                                    {transcript.map((msg, i) => (
                                        <p key={i} className={`text-sm leading-relaxed ${msg.role === "user" ? "text-blue-700" : "text-text-secondary"}`}>
                                            <span className="font-medium">{msg.role === "user" ? "You: " : "AI: "}</span>
                                            {msg.text}
                                        </p>
                                    ))}
                                    <div ref={transcriptEndRef} />
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-text-light italic text-sm">
                                    Conversation transcript will appear here...
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-bg/80 border-t border-border-light backdrop-blur-sm">
                    <p className="text-[10px] uppercase tracking-wider text-text-light text-center font-medium">
                        Powered by Gemini Live
                    </p>
                </div>
            </div>
        </div>
    );
}
