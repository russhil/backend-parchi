"use client";

import { useState, useRef, useEffect } from "react";
import { chat, getChatSuggestions } from "@/lib/api";
import type { ChatMessage } from "@/types";
import ReactMarkdown from "react-markdown";

interface AskAIPanelProps {
  patientId: string;
}

export default function AskAIPanel({ patientId }: AskAIPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let mounted = true;
    const fetchSuggestions = async () => {
      if (!patientId || patientId === "undefined") return;

      try {
        const data = await getChatSuggestions(patientId);
        if (mounted && data.suggestions && data.suggestions.length > 0) {
          setSuggestions(data.suggestions);
        } else if (mounted) {
          // Fallback suggestions
          setSuggestions([
            "What are the current medications?",
            "Summarize recent lab results",
            "Any drug interactions to watch?",
          ]);
        }
      } catch (e) {
        // Only log if it's not a common transient error during dev
        if (mounted && !String(e).includes("Failed to fetch")) {
          console.error("Failed to fetch suggestions", e);
        }

        if (mounted) {
          setSuggestions([
            "What are the current medications?",
            "Summarize recent lab results",
            "Any drug interactions to watch?",
          ]);
        }
      } finally {
        if (mounted) setSuggestionsLoading(false);
      }
    };
    fetchSuggestions();
    return () => { mounted = false; };
  }, [patientId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    if (!expanded) setExpanded(true);

    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const data = await chat(patientId, userMsg.content, [...messages, userMsg]);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I couldn't process that request. Please check if the backend is running." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Expanded chat messages area */}
      {expanded && messages.length > 0 && (
        <div className="bg-surface rounded-2xl shadow-sm border border-primary/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-border-light flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">forum</span>
              <h4 className="text-sm font-bold text-text-primary">Chat History</h4>
            </div>
            <button
              onClick={() => { setExpanded(false); setMessages([]); }}
              className="text-xs text-text-secondary hover:text-primary transition"
            >
              Clear
            </button>
          </div>
          <div className="max-h-[300px] overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3 py-2.5 rounded-2xl text-xs leading-relaxed ${msg.role === "user"
                    ? "bg-primary text-white rounded-br-md"
                    : "bg-bg text-text-primary rounded-bl-md"
                    }`}
                >
                  <div className="prose prose-sm max-w-none prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0.5">
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
                        ul: ({ node, ...props }: any) => <ul className="list-disc pl-4 mb-2 last:mb-0" {...props} />,
                        ol: ({ node, ...props }: any) => <ol className="list-decimal pl-4 mb-2 last:mb-0" {...props} />,
                        li: ({ node, ...props }: any) => <li className="mb-0.5" {...props} />,
                        h1: ({ node, ...props }: any) => <h1 className="text-sm font-bold mb-2 mt-2 first:mt-0" {...props} />,
                        h2: ({ node, ...props }: any) => <h2 className="text-sm font-bold mb-2 mt-2 first:mt-0" {...props} />,
                        h3: ({ node, ...props }: any) => <h3 className="text-sm font-bold mb-1 mt-2 first:mt-0" {...props} />,
                        strong: ({ node, ...props }: any) => <strong className="font-bold" {...props} />,
                        em: ({ node, ...props }: any) => <em className="italic" {...props} />,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-bg rounded-2xl rounded-bl-md px-3 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Suggestion chips (only when no messages) */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestionsLoading ? (
            // Skeleton loader for suggestions
            <div className="flex gap-2 animate-pulse w-full">
              <div className="h-8 bg-bg border border-border-light rounded-full w-32"></div>
              <div className="h-8 bg-bg border border-border-light rounded-full w-40"></div>
              <div className="h-8 bg-bg border border-border-light rounded-full w-24"></div>
            </div>
          ) : (
            suggestions.map((s) => (
              <button
                key={s}
                onClick={() => { setInput(s); inputRef.current?.focus(); }}
                className="px-3 py-1.5 bg-surface rounded-full text-xs text-text-secondary hover:bg-primary-light hover:text-primary transition border border-border-light shadow-sm text-left truncate max-w-full"
                title={s}
              >
                {s}
              </button>
            ))
          )}
        </div>
      )}

      {/* Inline chat bar — matches reference */}
      <div className="bg-surface rounded-2xl shadow-sm border border-primary/10 p-1 flex items-center gap-2 ring-4 ring-medical-blue">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ml-1">
          <span className="material-symbols-outlined text-primary">smart_toy</span>
        </div>
        <form onSubmit={handleSend} className="flex-1 flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask AI about this patient..."
            className="flex-1 border-none bg-transparent focus:ring-0 focus:outline-none text-sm font-medium h-10 px-2 placeholder-text-secondary"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary-dark transition disabled:opacity-40 mr-0.5"
          >
            <span className="material-symbols-outlined text-[20px]">send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
