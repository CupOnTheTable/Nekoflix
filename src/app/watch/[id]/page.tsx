"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft, Play, Subtitles, Mic2 } from "lucide-react";
import HLSPlayer from "@/components/player/HLSPlayer";
import { cn } from "@/lib/utils";

interface Episode {
  number: number;
  title: string;
  episode_embed_id: number;
  embed_url: { sub: string | null; dub: string | null; hardsub: string | null };
}

interface SeriesData {
  id: number;
  title: string;
  slug: string;
  poster: string;
  description?: string;
  episodes: Episode[];
}

interface AniListFallback {
  id: number;
  title: string;
  coverImage: string;
  synopsis: string;
  score: number;
  genres: string[];
  episodes: number;
  status: string;
}

function cleanTitle(t?: string | null): string {
  if (!t) return "";
  const trimmed = t.trim();
  if (!trimmed || trimmed === "Untitled" || trimmed === "undefined" || trimmed.toLowerCase() === "unknown") return "";
  return trimmed;
}

export default function WatchPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [series, setSeries] = useState<SeriesData | null>(null);
  const [fallback, setFallback] = useState<AniListFallback | null>(null);
  const [selectedEp, setSelectedEp] = useState(1);
  const [language, setLanguage] = useState<"sub" | "dub">("sub");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    setSeries(null);
    setFallback(null);

    fetch(`/api/anikoto/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        if (data.ok && data.data) {
          setSeries(data.data);
          setLoading(false);
        } else {
          throw new Error("Not found");
        }
      })
      .catch(() => {
        // AniKoto failed — try AniList fallback for info
        fetch(`/api/anime/${id}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.anime) {
              setFallback(data.anime);
            } else {
              setError(true);
            }
            setLoading(false);
          })
          .catch(() => {
            setError(true);
            setLoading(false);
          });
      });
  }, [id]);

  const currentEpisode = series?.episodes?.find((ep) => ep.number === selectedEp);
  const embedId = currentEpisode?.episode_embed_id?.toString();

  const handleNext = useCallback(() => {
    if (series && selectedEp < series.episodes.length) {
      setSelectedEp((p) => p + 1);
    }
  }, [series, selectedEp]);

  const handlePrevious = useCallback(() => {
    if (selectedEp > 1) {
      setSelectedEp((p) => p - 1);
    }
  }, [selectedEp]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-purple-500 border-r-pink-500" style={{ animationDuration: "1.2s" }} />
            <div className="absolute inset-2 animate-spin rounded-full border-4 border-transparent border-b-cyan-400 border-l-blue-400" style={{ animationDuration: "1.8s", animationDirection: "reverse" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-2 w-2 animate-pulse rounded-full bg-purple-400" />
            </div>
          </div>
          <p className="text-sm text-muted">Loading anime...</p>
        </div>
      </div>
    );
  }

  if (error || (!series && !fallback)) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-background">
        <p className="text-muted">Anime not found.</p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 rounded-lg bg-surface px-4 py-2 text-sm text-muted hover:bg-surface-hover"
        >
            <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </div>
    );
  }

  // AniList fallback — show info but no player
  if (fallback && !series) {
    return (
      <div className="min-h-screen bg-background kuro-animate-in">
        <div className="mx-auto max-w-4xl px-4 py-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-lg bg-surface/80 px-3 py-2 text-sm text-muted hover:bg-surface-hover backdrop-blur-sm mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className="flex gap-6">
            <div className="relative h-64 w-44 flex-shrink-0 overflow-hidden rounded-xl border border-border">
              <Image src={fallback.coverImage} alt={fallback.title} fill sizes="176px" className="object-cover" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{fallback.title}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted">
                {fallback.score > 0 && <span>Score: {fallback.score.toFixed(1)}</span>}
                {fallback.episodes > 0 && <span>{fallback.episodes} Episodes</span>}
                <span>{fallback.status}</span>
              </div>
              {fallback.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {fallback.genres.map((g) => (
                    <span key={g} className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">{g}</span>
                  ))}
                </div>
              )}
              <p className="mt-4 text-sm text-muted leading-relaxed">{fallback.synopsis}</p>
              <div className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4">
                <p className="text-sm text-yellow-400">Streaming not available for this anime yet.</p>
                <p className="text-xs text-muted mt-1">This anime is from AniList but not yet available on our streaming sources.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Series found — show player
  if (!series) return null;

  const episodeLabel = cleanTitle(currentEpisode?.title) || `Episode ${selectedEp}`;

  return (
    <div className="min-h-screen bg-background kuro-animate-in">
      <div className="mx-auto max-w-7xl">
        <div className="p-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 rounded-lg bg-surface/80 px-3 py-2 text-sm text-muted hover:bg-surface-hover backdrop-blur-sm"
          >
            <ArrowLeft className="h-4 w-4" />
              Back
          </button>
        </div>

        {embedId && (
          <div className="px-4">
            <HLSPlayer
              key={`${embedId}-${language}`}
              embedId={embedId}
              language={language}
              title={episodeLabel}
              onNext={handleNext}
              onPrevious={handlePrevious}
              hasNext={selectedEp < series.episodes.length}
              hasPrevious={selectedEp > 1}
              className="mx-auto max-w-5xl"
            />
          </div>
        )}

        <div className="p-4">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-foreground">{episodeLabel}</h1>
                <p className="text-sm text-muted">
                  Episode {selectedEp} of {series.episodes.length}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLanguage("sub")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    language === "sub"
                      ? "bg-purple-600 text-white"
                      : "bg-surface text-muted hover:bg-surface-hover"
                  )}
                >
                  <Subtitles className="h-4 w-4" />
                  Sub
                </button>
                <button
                  onClick={() => setLanguage("dub")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    language === "dub"
                      ? "bg-purple-600 text-white"
                      : "bg-surface text-muted hover:bg-surface-hover"
                  )}
                >
                  <Mic2 className="h-4 w-4" />
                  Dub
                </button>
              </div>
            </div>

            {series.description && (
              <p className="mt-3 text-sm text-muted line-clamp-3">{series.description}</p>
            )}
          </div>
        </div>

        <div className="px-4 pb-8">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-3 text-lg font-bold text-foreground">Episodes</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 kuro-stagger">
              {series.episodes.map((ep) => {
                const hasSub = !!ep.embed_url?.sub;
                const hasDub = !!ep.embed_url?.dub;
                const isAvailable = language === "sub" ? hasSub : hasDub;

                return (
                  <button
                    key={ep.number}
                    onClick={() => setSelectedEp(ep.number)}
                    disabled={!isAvailable}
                    className={cn(
                      "group relative flex flex-col items-center gap-2 rounded-xl border p-3 transition-all",
                      selectedEp === ep.number
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-border bg-surface hover:border-accent",
                      !isAvailable && "opacity-40 cursor-not-allowed"
                    )}
                  >
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface-hover group-hover:bg-accent/20 transition-colors">
                      {selectedEp === ep.number ? (
                        <Play className="h-5 w-5 text-purple-400" />
                      ) : (
                        <span className="text-sm font-medium text-foreground">{ep.number}</span>
                      )}
                    </div>
                    <div className="w-full text-center">
                      <p className="text-xs font-medium text-foreground truncate">
                        {cleanTitle(ep.title) || `Episode ${ep.number}`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
