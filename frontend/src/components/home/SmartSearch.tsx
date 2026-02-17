"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { search } from "@/lib/api";
import type { SearchResult } from "@/types";

export default function SmartSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const data = await search(query);
      setResults(data.results);
      setShowResults(true);
    } catch {
      // Fallback for demo
      setResults([
        {
          patient_id: "p1",
          patient_name: "Sarah Jenkins",
          matched_snippets: [`Showing results for "${query}"`],
        },
      ]);
      setShowResults(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 md:mb-8 px-4 md:px-0">
      <form onSubmit={handleSearch} className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary">
          search
        </span>
        <input
          type="text"
          placeholder="Search patients or conditions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full pl-12 pr-20 md:pr-24 py-3 md:py-3.5 bg-surface rounded-2xl border border-border-light text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition shadow-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 md:px-4 py-2 bg-primary text-white rounded-xl text-xs md:text-sm font-medium hover:bg-primary-dark transition disabled:opacity-50"
        >
          {loading ? "..." : "Search"}
        </button>
      </form>

      {showResults && results.length > 0 && (
        <div className="mt-3 bg-surface rounded-2xl border border-border-light shadow-sm overflow-hidden">
          {results.map((result) => (
            <button
              key={result.patient_id}
              onClick={() => {
                setShowResults(false);
                router.push(`/patient/${result.patient_id}?search=${encodeURIComponent(query)}`);
              }}
              className="w-full text-left px-4 py-3 hover:bg-hover transition border-b border-border-light last:border-0"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-primary text-[18px]">person</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-text-primary">{result.patient_name}</p>
                  {result.matched_snippets.map((snippet, i) => (
                    <p key={i} className="text-xs text-text-secondary mt-0.5 line-clamp-2">
                      {snippet}
                    </p>
                  ))}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
