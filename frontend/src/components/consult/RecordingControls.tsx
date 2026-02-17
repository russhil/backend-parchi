"use client";

import type { TranscriptionStatus } from "@/hooks/useConsultTranscription";

interface RecordingControlsProps {
  transcriptionStatus: TranscriptionStatus;
  onToggle: () => void;
  elapsed: number;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export default function RecordingControls({
  transcriptionStatus,
  onToggle,
  elapsed,
}: RecordingControlsProps) {
  const isRecording = transcriptionStatus === "recording";
  const isConnecting = transcriptionStatus === "connecting";
  const isStopping = transcriptionStatus === "stopping";

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={onToggle}
        disabled={isConnecting || isStopping}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition shadow-md disabled:opacity-50 ${
          isRecording
            ? "bg-danger text-white hover:bg-red-600"
            : isConnecting
              ? "bg-amber-500 text-white"
              : "bg-primary text-white hover:bg-primary-dark"
        }`}
      >
        {isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Connecting...
          </>
        ) : isStopping ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Stopping...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[20px]">
              {isRecording ? "stop" : "mic"}
            </span>
            {isRecording ? "Stop Recording" : "Start Recording"}
          </>
        )}
      </button>

      <div className="flex items-center gap-2">
        {isRecording && (
          <span className="w-2.5 h-2.5 bg-danger rounded-full animate-pulse" />
        )}
        <span className="text-lg font-mono font-bold text-text-primary">
          {formatTime(elapsed)}
        </span>
      </div>
    </div>
  );
}
