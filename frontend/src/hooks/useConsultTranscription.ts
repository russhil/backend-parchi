"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000";

export type TranscriptionStatus =
  | "idle"
  | "connecting"
  | "recording"
  | "stopping"
  | "error";

interface UseConsultTranscriptionReturn {
  status: TranscriptionStatus;
  transcript: string;
  dumpId: string | null;
  error: string | null;
  elapsedSeconds: number;
  start: (sessionId: string) => Promise<void>;
  stop: () => void;
  appendManualNote: (text: string) => void;
}

// --- Audio utility functions (same as GeminiLiveChat) ---

function downsampleBuffer(
  buffer: Float32Array,
  sampleRate: number,
  outSampleRate: number
): Float32Array {
  if (outSampleRate === sampleRate) return buffer;
  const ratio = sampleRate / outSampleRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0,
      count = 0;
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
    buf[i] = Math.min(1, Math.max(-1, buffer[i])) * 0x7fff;
  }
  return buf.buffer;
}

export function useConsultTranscription(): UseConsultTranscriptionReturn {
  const [status, setStatus] = useState<TranscriptionStatus>("idle");
  const [transcript, setTranscript] = useState("");
  const [dumpId, setDumpId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusRef = useRef<TranscriptionStatus>("idle");

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const start = useCallback(
    async (sessionId: string) => {
      setError(null);
      setTranscript("");
      setDumpId(null);
      setElapsedSeconds(0);
      setStatus("connecting");

      try {
        // Start mic capture
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        mediaStreamRef.current = stream;

        const ctx = new AudioContext();
        audioContextRef.current = ctx;
        if (ctx.state === "suspended") await ctx.resume();

        await ctx.audioWorklet.addModule("/pcm-processor.js");
        const source = ctx.createMediaStreamSource(stream);
        const workletNode = new AudioWorkletNode(ctx, "pcm-processor");

        // Connect WebSocket
        const ws = new WebSocket(
          `${WS_URL}/ws/consult-transcribe/${sessionId}`
        );
        ws.binaryType = "arraybuffer";
        wsRef.current = ws;

        const connectTimeout = setTimeout(() => {
          if (statusRef.current === "connecting") {
            setError("Connection timed out.");
            setStatus("error");
            cleanup();
          }
        }, 10000);

        ws.onopen = () => {
          clearTimeout(connectTimeout);
          setStatus("recording");

          // Start timer
          timerRef.current = setInterval(
            () => setElapsedSeconds((e) => e + 1),
            1000
          );

          // Wire up audio sending
          workletNode.port.onmessage = (
            e: MessageEvent<Float32Array>
          ) => {
            if (
              ws.readyState !== WebSocket.OPEN ||
              statusRef.current !== "recording"
            )
              return;
            const downsampled = downsampleBuffer(e.data, ctx.sampleRate, 16000);
            const pcm16 = convertFloat32ToInt16(downsampled);
            ws.send(pcm16);
          };

          source.connect(workletNode);
          const muteGain = ctx.createGain();
          muteGain.gain.value = 0;
          workletNode.connect(muteGain);
          muteGain.connect(ctx.destination);
          workletNodeRef.current = workletNode;
        };

        ws.onmessage = (event) => {
          if (typeof event.data === "string") {
            try {
              const msg = JSON.parse(event.data);
              if (msg.type === "session_info") {
                setDumpId(msg.dump_id);
              } else if (msg.type === "transcript") {
                setTranscript((prev) => prev + msg.text);
              } else if (msg.type === "error") {
                setError(msg.error || "Transcription error");
                setStatus("error");
              }
            } catch {
              // ignore parse errors
            }
          }
        };

        ws.onerror = () => {
          clearTimeout(connectTimeout);
          setError("WebSocket connection failed.");
          setStatus("error");
          cleanup();
        };

        ws.onclose = () => {
          clearTimeout(connectTimeout);
          if (
            statusRef.current === "recording" ||
            statusRef.current === "connecting"
          ) {
            // Unexpected close
            if (statusRef.current === "connecting") {
              setError("Connection closed before session started.");
              setStatus("error");
            } else {
              setStatus("idle");
            }
          }
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        };
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to start transcription"
        );
        setStatus("error");
        cleanup();
      }
    },
    [cleanup]
  );

  const stop = useCallback(() => {
    setStatus("stopping");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Send stop signal
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "stop" }));
    }

    // Clean up audio resources (keep WS open briefly for final events)
    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    // Close WS after a short delay to let final events come through
    setTimeout(() => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setStatus("idle");
    }, 500);
  }, []);

  const appendManualNote = useCallback((text: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "manual_note", text }));
    }
  }, []);

  return {
    status,
    transcript,
    dumpId,
    error,
    elapsedSeconds,
    start,
    stop,
    appendManualNote,
  };
}
