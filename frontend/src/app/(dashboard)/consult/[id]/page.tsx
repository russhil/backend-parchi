"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { startConsult, saveConsultDump } from "@/lib/api";
import { useConsultTranscription } from "@/hooks/useConsultTranscription";
import type { ConsultInsights } from "@/types";
import RecordingControls from "@/components/consult/RecordingControls";
import TranscriptInput from "@/components/consult/TranscriptInput";
import ConsultResults from "@/components/consult/ConsultResults";

export default function ConsultPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = params.id as string;
  const appointmentId = searchParams.get("appointment") || undefined;

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [manualNotes, setManualNotes] = useState("");
  const [insights, setInsights] = useState<ConsultInsights | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transcription = useConsultTranscription();

  // Start consult session on mount
  useEffect(() => {
    async function init() {
      try {
        const data = await startConsult(patientId);
        setSessionId(data.consult_session_id);
      } catch {
        setSessionId("demo-session");
      }
    }
    init();
  }, [patientId]);

  const handleToggleRecording = useCallback(async () => {
    if (transcription.status === "idle" || transcription.status === "error") {
      if (!sessionId) return;
      setError(null);
      await transcription.start(sessionId);
    } else if (transcription.status === "recording") {
      transcription.stop();
    }
  }, [transcription, sessionId]);

  const handleSaveAndAnalyze = useCallback(async () => {
    if (!sessionId || !transcription.dumpId) return;
    const hasContent = transcription.transcript.trim() || manualNotes.trim();
    if (!hasContent) return;

    setSaving(true);
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
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save and analyze"
      );
    } finally {
      setSaving(false);
    }
  }, [sessionId, transcription.dumpId, transcription.transcript, manualNotes, appointmentId]);

  const isRecording = transcription.status === "recording";
  const canSave =
    transcription.status === "idle" &&
    transcription.dumpId &&
    (transcription.transcript.trim() || manualNotes.trim()) &&
    !insights;

  return (
    <div className="p-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/patient/${patientId}`)}
            className="flex items-center gap-1 text-text-secondary hover:text-text-primary transition text-sm"
          >
            <span className="material-symbols-outlined text-[20px]">
              arrow_back
            </span>
            Back
          </button>
          <div>
            <h1 className="text-lg font-bold text-text-primary">
              Consult Session
            </h1>
            <p className="text-xs text-text-secondary">
              Patient: {patientId} &bull; Session: {sessionId || "..."}
            </p>
          </div>
        </div>

        <RecordingControls
          transcriptionStatus={transcription.status}
          onToggle={handleToggleRecording}
          elapsed={transcription.elapsedSeconds}
        />
      </div>

      {/* Error display */}
      {(error || transcription.error) && (
        <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error || transcription.error}
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-2 gap-5">
        {/* Left: Transcript + Notes */}
        <TranscriptInput
          transcript={transcription.transcript}
          manualNotes={manualNotes}
          onManualNotesChange={setManualNotes}
          isRecording={isRecording}
        />

        {/* Right: Results */}
        <div>
          {saving ? (
            <div className="bg-surface rounded-2xl border border-border-light shadow-sm p-8 text-center">
              <div className="animate-spin w-8 h-8 border-3 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-sm font-semibold text-text-primary">
                Analyzing consultation...
              </p>
              <p className="text-xs text-text-secondary mt-1">
                Generating SOAP note and insights
              </p>
            </div>
          ) : insights ? (
            <ConsultResults insights={insights} />
          ) : (
            <div className="bg-surface rounded-2xl border border-border-light shadow-sm p-8 text-center h-full flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-text-secondary text-[48px] mb-3">
                {isRecording ? "graphic_eq" : "mic"}
              </span>
              <p className="text-sm font-semibold text-text-primary">
                {isRecording
                  ? "Recording in progress..."
                  : transcription.transcript
                    ? "Recording complete"
                    : "Ready to start"}
              </p>
              <p className="text-xs text-text-secondary mt-1 max-w-xs">
                {isRecording
                  ? "Live transcript appears on the left. Stop recording when done."
                  : transcription.transcript
                    ? "Add manual notes if needed, then click Save & Analyze."
                    : "Click 'Start Recording' to begin live transcription via Gemini."}
              </p>

              {/* Save & Analyze button */}
              {canSave && (
                <button
                  onClick={handleSaveAndAnalyze}
                  className="mt-6 flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-dark transition shadow-lg"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    psychology
                  </span>
                  Save & Analyze
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save & Return */}
      {insights && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => router.push(`/patient/${patientId}`)}
            className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full text-sm font-semibold hover:bg-primary-dark transition shadow-lg"
          >
            <span className="material-symbols-outlined text-[20px]">save</span>
            Save & Return to Patient
          </button>
        </div>
      )}
    </div>
  );
}
