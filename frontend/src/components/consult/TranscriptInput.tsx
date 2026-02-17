"use client";

import { useEffect, useRef } from "react";

interface TranscriptInputProps {
  transcript: string;
  manualNotes: string;
  onManualNotesChange: (val: string) => void;
  isRecording: boolean;
}

export default function TranscriptInput({
  transcript,
  manualNotes,
  onManualNotesChange,
  isRecording,
}: TranscriptInputProps) {
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript during recording
  useEffect(() => {
    if (isRecording && transcriptEndRef.current) {
      transcriptEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [transcript, isRecording]);

  return (
    <div className="bg-surface rounded-2xl border border-border-light shadow-sm overflow-hidden flex flex-col h-full">
      {/* Live Transcript Section */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">subtitles</span>
            <h3 className="text-sm font-bold text-text-primary">Live Transcript</h3>
          </div>
          {isRecording && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-danger rounded-full animate-pulse" />
              <span className="text-xs text-danger font-medium">Recording</span>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 min-h-[200px] max-h-[300px]">
          {transcript ? (
            <div className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
              {transcript}
              <div ref={transcriptEndRef} />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              {isRecording ? (
                <div className="text-center">
                  <div className="flex justify-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-primary rounded-full animate-pulse"
                        style={{
                          height: `${16 + Math.random() * 24}px`,
                          animationDelay: `${i * 100}ms`,
                        }}
                      />
                    ))}
                  </div>
                  <p className="text-sm text-text-secondary">Listening for speech...</p>
                  <p className="text-xs text-text-secondary mt-1">
                    Speak naturally, transcript will appear here
                  </p>
                </div>
              ) : (
                <p className="text-sm text-text-secondary italic">
                  Transcript will appear here during recording
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Manual Notes Section */}
      <div className="border-t border-border-light">
        <div className="px-5 py-3 border-b border-border-light flex items-center gap-2">
          <span className="material-symbols-outlined text-text-secondary text-[18px]">edit_note</span>
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">
            Manual Notes
          </h3>
        </div>
        <textarea
          value={manualNotes}
          onChange={(e) => onManualNotesChange(e.target.value)}
          placeholder="Add any additional notes here..."
          className="w-full min-h-[120px] p-5 text-sm text-text-primary leading-relaxed resize-none focus:outline-none"
        />
      </div>
    </div>
  );
}
