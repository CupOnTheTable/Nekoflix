"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Star, ListPlus, RotateCcw, Play } from "lucide-react";
import type { Anime } from "@/types";

export default function RandomPage() {
  const [result, setResult] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [watchlistMessage, setWatchlistMessage] = useState<string | null>(null);
  const [diceRoll, setDiceRoll] = useState(false);

  const fetchRandom = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setWatchlistMessage(null);
    setDiceRoll(true);
    try {
      const res = await fetch("/api/anime/random");
      const data = await res.json();
      if (data.anime) setResult(data.anime);
    } catch { /* ignore */ }
    setTimeout(() => setDiceRoll(false), 600);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRandom();
  }, [fetchRandom]);

  const handleAddToWatchlist = useCallback(async () => {
    if (!result) return;
    setWatchlistMessage(null);
    try {
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animeId: result.id, status: "plan_to_watch" }),
      });
      if (res.ok) setWatchlistMessage("Added to watchlist!");
      else if (res.status === 409) setWatchlistMessage("Already in watchlist");
      else setWatchlistMessage("Failed to add");
    } catch {
      setWatchlistMessage("Failed to add");
    }
  }, [result]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center mb-10">
          <button
            onClick={fetchRandom}
            disabled={loading}
            className="group relative mb-6"
          >
            <div
              className={`flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-pink-600 shadow-2xl shadow-purple-500/30 transition-all hover:scale-105 hover:shadow-purple-500/50 ${diceRoll ? "animate-spin" : ""}`}
              style={{ animationDuration: "0.6s" }}
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12 text-white">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth={1.5} />
                <circle cx="8" cy="8" r="1.5" fill="currentColor" />
                <circle cx="16" cy="8" r="1.5" fill="currentColor" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                <circle cx="8" cy="16" r="1.5" fill="currentColor" />
                <circle cx="16" cy="16" r="1.5" fill="currentColor" />
              </svg>
            </div>
          </button>
          <h1 className="text-3xl font-bold text-foreground mb-2">Random Anime</h1>
          <p className="text-muted text-sm">Click the dice to discover something new</p>
        </div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="relative h-16 w-16">
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 border-r-pink-500" style={{ animation: "kuro-spin 1s linear infinite" }} />
              <div className="absolute inset-2 rounded-full border-4 border-transparent border-b-cyan-400" style={{ animation: "kuro-spin 1.5s linear infinite reverse" }} />
            </div>
          </div>
        )}

        {result && !loading && (
          <div
            className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
            style={{ animation: "kuro-fadeInUp 0.5s ease-out" }}
          >
            <div className="relative h-64 sm:h-80">
              <Image
                src={result.backdropImage || result.coverImage}
                alt={result.title}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/50 to-transparent" />
            </div>

            <div className="relative -mt-20 px-6 pb-6">
              <div className="flex gap-5">
                <div className="relative h-40 w-28 flex-shrink-0 overflow-hidden rounded-xl border-2 border-border shadow-xl">
                  <Image
                    src={result.coverImage}
                    alt={result.title}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 pt-16">
                  <h2 className="text-2xl font-bold text-foreground">{result.title}</h2>
                  {result.titleJapanese && (
                    <p className="text-sm text-muted mt-0.5">{result.titleJapanese}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-sm text-muted">
                    {result.score > 0 && (
                      <span className="flex items-center gap-1 text-yellow-500">
                        <Star className="h-4 w-4 fill-yellow-400" />
                        {result.score.toFixed(1)}
                      </span>
                    )}
                    <span>{result.episodes} Episodes</span>
                    <span>{result.format}</span>
                  </div>
                </div>
              </div>

              {result.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {result.genres.map((g) => (
                    <span key={g} className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                      {g}
                    </span>
                  ))}
                </div>
              )}

              {result.synopsis && (
                <p className="mt-4 text-sm text-muted leading-relaxed line-clamp-4">
                  {result.synopsis}
                </p>
              )}

              <div className="flex items-center gap-3 mt-6">
                <Link
                  href={`/watch/${result.id}`}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-semibold text-white hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-600/20"
                >
                  <Play className="h-4 w-4 fill-white" />
                  Watch Now
                </Link>
                <button
                  onClick={handleAddToWatchlist}
                  className="flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-medium text-foreground hover:bg-surface-hover transition-all"
                >
                  <ListPlus className="h-4 w-4" />
                  Watchlist
                </button>
                <button
                  onClick={fetchRandom}
                  className="flex items-center gap-2 rounded-xl border border-border bg-surface px-5 py-3 text-sm font-medium text-foreground hover:bg-surface-hover transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  Roll Again
                </button>
              </div>

              {watchlistMessage && (
                <p className="mt-3 text-sm text-accent">{watchlistMessage}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
