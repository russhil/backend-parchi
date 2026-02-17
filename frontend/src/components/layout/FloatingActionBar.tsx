"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { startConsult, saveConsultDump } from "@/lib/api";
import { useConsultTranscription } from "@/hooks/useConsultTranscription";
import ManualNoteModal from "@/components/patient/ManualNoteModal";
import DocumentUpload from "@/components/patient/DocumentUpload";

type VoiceState = "idle" | "countdown" | "recording" | "saving";

interface FloatingActionBarProps {
  patientId: string;
  patientName?: string;
  appointmentId?: string;
  onRefresh?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function FloatingActionBar({
  patientId,
  patientName = "Patient",
  appointmentId,
  onRefresh,
}: FloatingActionBarProps) {
  const [showNote, setShowNote] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const transcription = useConsultTranscription();
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [countdown, setCountdown] = useState(3);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recordingCount, setRecordingCount] = useState(0);

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingSaveRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);

  // Keep ref in sync
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // When transcription status goes to "recording", transition from countdown
  useEffect(() => {
    if (transcription.status === "recording" && voiceState === "countdown") {
      setVoiceState("recording");
    }
  }, [transcription.status, voiceState]);

  // When transcription goes idle after we requested save, auto-save the dump
  useEffect(() => {
    if (
      pendingSaveRef.current &&
      transcription.status === "idle" &&
      voiceState === "saving"
    ) {
      pendingSaveRef.current = false;
      const sid = sessionIdRef.current;
      const dumpId = transcription.dumpId;

      if (sid && dumpId) {
        saveConsultDump(sid, dumpId, "", appointmentId, true)
          .then(() => onRefresh?.())
          .catch((err) => console.error("Failed to save transcript:", err))
          .finally(() => setVoiceState("idle"));
      } else {
        // WS close already persisted the transcript; just go idle
        setVoiceState("idle");
        onRefresh?.();
      }
    }
  }, [transcription.status, transcription.dumpId, voiceState, appointmentId, onRefresh]);

  // Handle transcription errors
  useEffect(() => {
    if (transcription.error && voiceState !== "idle") {
      setError(transcription.error);
      setVoiceState("idle");
    }
  }, [transcription.error, voiceState]);

  const handleVoiceClick = useCallback(() => {
    if (voiceState === "idle") {
      // Start 3-second countdown
      setVoiceState("countdown");
      setCountdown(3);
      setError(null);

      let count = 3;
      countdownRef.current = setInterval(() => {
        count--;
        if (count > 0) {
          setCountdown(count);
        } else {
          clearInterval(countdownRef.current!);
          countdownRef.current = null;
          setCountdown(0);
          // Start the recording
          startConsult(patientId)
            .then(({ consult_session_id }) => {
              setSessionId(consult_session_id);
              return transcription.start(consult_session_id);
            })
            .then(() => setRecordingCount((c) => c + 1))
            .catch((err) => {
              setError(
                err instanceof Error ? err.message : "Failed to start recording"
              );
              setVoiceState("idle");
            });
        }
      }, 1000);
    } else if (voiceState === "recording") {
      // Stop recording → auto-save
      setVoiceState("saving");
      pendingSaveRef.current = true;
      transcription.stop();
    }
  }, [voiceState, patientId, transcription]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // Clear error after 4 seconds
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

  const isActive = voiceState !== "idle";

  return (
    <>
      <div className="inline-flex items-center gap-1.5 bg-surface rounded-full shadow-lg border border-border-light px-1.5 py-1.5 pointer-events-auto z-40">
        {/* Manual Note */}
        <button
          onClick={() => setShowNote(true)}
          disabled={isActive}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition whitespace-nowrap ${isActive
              ? "text-text-secondary/40 cursor-not-allowed"
              : "text-text-secondary hover:bg-hover"
            }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            edit_note
          </span>
          Note
        </button>

        {/* ── Voice Session Button ── */}

        {/* Idle: ready to start */}
        {voiceState === "idle" && (
          <button
            onClick={handleVoiceClick}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary-dark transition shadow-md whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[18px]">mic</span>
            {recordingCount > 0 ? "Record Again" : "Voice Session"}
          </button>
        )}

        {/* Countdown: 3 → 2 → 1 */}
        {voiceState === "countdown" && (
          <div className="flex items-center justify-center w-[120px] py-2 rounded-full bg-amber-500 text-white text-xs font-bold whitespace-nowrap">
            <span className="text-xl font-mono font-black leading-none animate-pulse">
              {countdown}
            </span>
          </div>
        )}

        {/* Recording: red with stopwatch */}
        {voiceState === "recording" && (
          <button
            onClick={handleVoiceClick}
            className="group flex items-center gap-2 px-4 py-2 rounded-full bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition shadow-md shadow-red-500/30 whitespace-nowrap relative overflow-hidden"
          >
            <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-10 pointer-events-none" />
            <span className="relative flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              <span className="font-mono text-sm tabular-nums">
                {formatTime(transcription.elapsedSeconds)}
              </span>
              <span className="material-symbols-outlined text-[16px] opacity-80 group-hover:opacity-100">
                stop_circle
              </span>
            </span>
          </button>
        )}

        {/* Saving: uploading transcript */}
        {voiceState === "saving" && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-text-secondary text-white text-xs font-bold whitespace-nowrap">
            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Saving...
          </div>
        )}

        {/* Upload Document */}
        <button
          onClick={() => setShowUpload(true)}
          disabled={isActive}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium transition whitespace-nowrap ${isActive
              ? "text-text-secondary/40 cursor-not-allowed"
              : "text-text-secondary hover:bg-hover"
            }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            upload_file
          </span>
          Upload
        </button>
      </div>

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-red-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {error}
        </div>
      )}

      {/* Modals */}
      <ManualNoteModal
        patientId={patientId}
        patientName={patientName}
        isOpen={showNote}
        onClose={() => setShowNote(false)}
        onSuccess={onRefresh}
      />

      <DocumentUpload
        patientId={patientId}
        patientName={patientName}
        isOpen={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={onRefresh}
      />
    </>
  );
}
