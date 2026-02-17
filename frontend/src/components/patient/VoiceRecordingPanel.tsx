"use client";

import { useState, useCallback, useEffect } from "react";
import { startConsult, saveConsultDump } from "@/lib/api";
import { useConsultTranscription } from "@/hooks/useConsultTranscription";
import ConsultResults from "@/components/consult/ConsultResults";
import type { ConsultInsights } from "@/types";

type PanelPhase = "ready" | "recording" | "stopped" | "analyzing" | "results";

interface VoiceRecordingPanelProps {
  patientId: string;
  patientName?: string;
  appointmentId?: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceRecordingPanel({
  patientId,
  patientName = "Patient",
  appointmentId,
  isOpen,
  onClose,
  onComplete,
}: VoiceRecordingPanelProps) {
  const transcription = useConsultTranscription();
  const [phase, setPhase] = useState<PanelPhase>("ready");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [manualNotes, setManualNotes] = useState("");
  const [insights, setInsights] = useState<ConsultInsights | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync phase with transcription status
  useEffect(() => {
    if (transcription.status === "recording" && phase !== "recording") {
      setPhase("recording");
    }
    if (
      transcription.status === "idle" &&
      phase === "recording" &&
      transcription.transcript
    ) {
      setPhase("stopped");
    }
  }, [transcription.status, phase, transcription.transcript]);

  const handleStart = useCallback(async () => {
    setError(null);
    try {
      const { consult_session_id } = await startConsult(patientId);
      setSessionId(consult_session_id);
      await transcription.start(consult_session_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    }
  }, [patientId, transcription]);

  const handleStop = useCallback(() => {
    transcription.stop();
  }, [transcription]);

  const handleSaveAndAnalyze = useCallback(async () => {
    if (!sessionId || !transcription.dumpId) return;
    setPhase("analyzing");
    setError(null);
    try {
      const result = await saveConsultDump(
        sessionId,
        transcription.dumpId,
        manualNotes,
        appointmentId,
        true
      );
      if (result.insights) {
        setInsights(result.insights);
        setPhase("results");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setPhase("stopped");
    }
  }, [sessionId, transcription.dumpId, manualNotes, appointmentId]);

  const handleSaveAndClose = useCallback(() => {
    setPhase("ready");
    setSessionId(null);
    setManualNotes("");
    setInsights(null);
    setError(null);
    onComplete?.();
    onClose();
  }, [onComplete, onClose]);

  const handleCancel = useCallback(() => {
    if (transcription.status === "recording") {
      transcription.stop();
    }
    setPhase("ready");
    setSessionId(null);
    setManualNotes("");
    setInsights(null);
    setError(null);
    onClose();
  }, [transcription, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/30 backdrop-blur-sm"
        onClick={
          phase === "results" || phase === "ready" ? handleCancel : undefined
        }
      />

      {/* Panel */}
      <div className="bg-surface border-t border-border-light shadow-2xl rounded-t-3xl max-h-[80vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 w-full md:max-w-2xl md:mx-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface z-10 px-6 py-4 border-b border-border-light flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-[24px]">
              mic
            </span>
            <div>
              <h2 className="text-base font-bold text-text-primary">
                Voice Consult
              </h2>
              <p className="text-xs text-text-secondary">{patientName}</p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            disabled={phase === "analyzing"}
            className="p-2 rounded-full hover:bg-hover transition disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px] text-text-secondary">
              close
            </span>
          </button>
        </div>

        <div className="px-6 py-6">
          {/* Error */}
          {(error || transcription.error) && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              {error || transcription.error}
            </div>
          )}

          {/* Ready State */}
          {phase === "ready" && (
            <div className="flex flex-col items-center gap-6 py-8">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[40px]">
                  mic
                </span>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-text-primary">
                  Ready to Record
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  Live transcription powered by Gemini
                </p>
              </div>
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-8 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transition shadow-lg"
              >
                <span className="material-symbols-outlined text-[20px]">
                  mic
                </span>
                Start Recording
              </button>
            </div>
          )}

          {/* Recording State */}
          {phase === "recording" && (
            <div className="space-y-6 py-4">
              {/* Recording indicator + timer */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
                      <span className="material-symbols-outlined text-white text-[24px]">
                        mic
                      </span>
                    </div>
                    <div className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-20" />
                  </div>
                  <div>
                    <p className="text-2xl font-mono font-bold text-text-primary">
                      {formatTime(transcription.elapsedSeconds)}
                    </p>
                    <p className="text-xs text-red-500 font-medium">
                      Recording...
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleStop}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-red-500 text-white font-semibold hover:bg-red-600 transition shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    stop
                  </span>
                  Stop
                </button>
              </div>

              {/* Live transcript */}
              <div className="bg-bg rounded-2xl border border-border-light overflow-hidden">
                <div className="px-5 py-3 border-b border-border-light flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">
                    subtitles
                  </span>
                  <h3 className="text-sm font-bold text-text-primary">
                    Live Transcript
                  </h3>
                  <span className="w-2 h-2 bg-danger rounded-full animate-pulse ml-auto" />
                </div>
                <div className="px-5 py-4 max-h-48 overflow-y-auto">
                  {transcription.transcript ? (
                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                      {transcription.transcript}
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-text-secondary">
                      <div className="flex gap-1">
                        {[...Array(3)].map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-primary rounded-full animate-pulse"
                            style={{
                              height: `${12 + (i % 3) * 6}px`,
                              animationDelay: `${i * 100}ms`,
                            }}
                          />
                        ))}
                      </div>
                      Listening for speech...
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Stopped State — show transcript + notes + analyze button */}
          {phase === "stopped" && (
            <div className="space-y-6">
              {/* Transcript */}
              {transcription.transcript && (
                <div className="bg-bg rounded-2xl border border-border-light overflow-hidden">
                  <div className="px-5 py-3 border-b border-border-light flex items-center gap-2">
                    <span className="material-symbols-outlined text-text-secondary text-[18px]">
                      description
                    </span>
                    <h3 className="text-sm font-bold text-text-primary">
                      Transcript
                    </h3>
                  </div>
                  <div className="px-5 py-4 max-h-48 overflow-y-auto">
                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                      {transcription.transcript}
                    </p>
                  </div>
                </div>
              )}

              {/* Manual notes */}
              <div className="bg-bg rounded-2xl border border-border-light overflow-hidden">
                <div className="px-5 py-3 border-b border-border-light flex items-center gap-2">
                  <span className="material-symbols-outlined text-text-secondary text-[18px]">
                    edit_note
                  </span>
                  <h3 className="text-sm font-bold text-text-primary">
                    Manual Notes (optional)
                  </h3>
                </div>
                <textarea
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Add any additional notes..."
                  className="w-full min-h-[80px] px-5 py-4 text-sm text-text-primary resize-none focus:outline-none bg-transparent"
                />
              </div>

              {/* Analyze button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSaveAndAnalyze}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transition shadow-lg"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    psychology
                  </span>
                  Save & Analyze
                </button>
              </div>
            </div>
          )}

          {/* Analyzing State */}
          {phase === "analyzing" && (
            <div className="flex flex-col items-center gap-6 py-12">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-primary text-[32px]">
                  psychology
                </span>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-text-primary">
                  Generating SOAP note...
                </p>
                <p className="text-sm text-text-secondary mt-1">
                  Analyzing transcript and extracting clinical insights
                </p>
              </div>
              <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          )}

          {/* Results State */}
          {phase === "results" && insights && (
            <div className="space-y-6">
              {/* Transcript */}
              {transcription.transcript && (
                <div className="bg-bg rounded-2xl border border-border-light overflow-hidden">
                  <div className="px-5 py-3 border-b border-border-light flex items-center gap-2">
                    <span className="material-symbols-outlined text-text-secondary text-[18px]">
                      description
                    </span>
                    <h3 className="text-sm font-bold text-text-primary">
                      Transcript
                    </h3>
                  </div>
                  <div className="px-5 py-4 max-h-48 overflow-y-auto">
                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                      {transcription.transcript}
                    </p>
                  </div>
                </div>
              )}

              <ConsultResults insights={insights} />

              {/* Save button */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveAndClose}
                  className="flex items-center gap-2 px-6 py-3 rounded-full bg-primary text-white font-semibold hover:bg-primary-dark transition shadow-lg"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    check_circle
                  </span>
                  Save & Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
