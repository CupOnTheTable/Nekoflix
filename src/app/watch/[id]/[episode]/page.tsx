"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Play, Subtitles, Mic2, Check } from "lucide-react";
import HLSPlayer from "@/components/player/HLSPlayer";
import { cn } from "@/lib/utils";
import { PLAYER, COMMON } from "@/lib/i18n";

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
  mal_id?: string | null;
  ani_id?: string | null;
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

function EpisodeSidebar({
  episodes,
  selectedEp,
  language,
  seriesTitle,
  seriesPoster,
  onSelect,
}: {
  episodes: Episode[];
  selectedEp: number;
  language: "sub" | "dub";
  seriesTitle: string;
  seriesPoster: string;
  onSelect: (ep: number) => void;
}) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-3 border-b border-border p-3">
        <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md">
          <Image src={seriesPoster} alt={seriesTitle} fill className="object-cover" sizes="36px" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{seriesTitle}</p>
          <p className="text-xs text-muted">{episodes.length} {COMMON.episodes.toLowerCase()}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {episodes.map((ep) => {
            const hasSub = !!ep.embed_url?.sub;
            const hasDub = !!ep.embed_url?.dub;
            const isAvailable = language === "sub" ? hasSub : hasDub;
            const isActive = ep.number === selectedEp;

            return (
              <button
                key={ep.number}
                onClick={() => isAvailable && onSelect(ep.number)}
                disabled={!isAvailable}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors",
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "hover:bg-surface-hover text-foreground",
                  !isAvailable && "opacity-40 cursor-not-allowed"
                )}
              >
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                    isActive ? "bg-accent text-white" : "bg-surface-hover text-muted"
                  )}
                >
                  {isActive ? <Play className="h-3.5 w-3.5 fill-current" /> : ep.number}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">
                    {cleanTitle(ep.title) || `Episode ${ep.number}`}
                  </p>
                  <p className="text-[10px] text-muted">
                    {hasSub && `${COMMON.sub.toUpperCase()} `}
                    {hasDub && `${COMMON.dub.toUpperCase()} `}
                    {!isAvailable && "Unavailable"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function WatchEpisodePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const episodeParam = params?.episode as string;
  const selectedEp = Math.max(1, parseInt(episodeParam, 10) || 1);

  const [series, setSeries] = useState<SeriesData | null>(null);
  const [fallback, setFallback] = useState<AniListFallback | null>(null);
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

  const handleEpisodeSelect = useCallback(
    (ep: number) => {
      router.push(`/watch/${id}/${ep}`);
    },
    [id, router]
  );

  const handleNext = useCallback(() => {
    if (series && selectedEp < series.episodes.length) {
      handleEpisodeSelect(selectedEp + 1);
    } else if (fallback) {
      const totalEps = fallback.episodes || 24;
      if (selectedEp < totalEps) handleEpisodeSelect(selectedEp + 1);
    }
  }, [series, fallback, selectedEp, handleEpisodeSelect]);

  const handlePrevious = useCallback(() => {
    if (selectedEp > 1) {
      handleEpisodeSelect(selectedEp - 1);
    }
  }, [selectedEp, handleEpisodeSelect]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-purple-500 border-r-pink-500" style={{ animationDuration: "1.2s" }} />
            <div className="absolute inset-2 animate-spin rounded-full border-4 border-transparent border-b-cyan-400 border-l-blue-400" style={{ animationDuration: "1.8s", animationDirection: "reverse" }} />
          </div>
          <p className="text-sm text-muted">{COMMON.loading}</p>
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
          <ArrowLeft className="h-4 w-4" /> {COMMON.back}
        </button>
      </div>
    );
  }

  if (fallback && !series) {
    const totalEps = fallback.episodes || 24;
    const episodeLabel = `${COMMON.episode} ${selectedEp}`;

    return (
      <div className="min-h-screen bg-background kuro-animate-in">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <Link
            href={`/anime/${id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-surface/80 px-3 py-2 text-sm text-muted hover:bg-surface-hover backdrop-blur-sm"
          >
          <ArrowLeft className="h-4 w-4" /> {COMMON.back}
          </Link>
        </div>

        <div className="mx-auto grid max-w-7xl gap-4 px-4 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0">
          <HLSPlayer
            key={`mal-${id}-${selectedEp}-${language}`}
            malId={id}
            seriesTitle={fallback.title}
            episodeNumber={selectedEp}
            language={language}
            title={episodeLabel}
            onNext={() => selectedEp < totalEps && handleEpisodeSelect(selectedEp + 1)}
            onPrevious={handlePrevious}
            hasNext={selectedEp < totalEps}
            hasPrevious={selectedEp > 1}
          />

            <div className="mt-4 rounded-xl border border-border bg-surface p-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-foreground">{episodeLabel}</h1>
                  <p className="text-sm text-muted">{fallback.title}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLanguage((l) => (l === "sub" ? "dub" : "sub"))}
                    className="flex items-center gap-1.5 rounded-lg bg-surface-hover px-3 py-2 text-sm font-medium text-muted hover:text-foreground border border-border"
                  >
                    <Mic2 className="h-4 w-4" />
                    {language === "sub" ? COMMON.sub.toUpperCase() : COMMON.dub.toUpperCase()}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <EpisodeSidebar
              episodes={Array.from({ length: totalEps }, (_, i) => ({
                number: i + 1,
                title: `Episode ${i + 1}`,
                episode_embed_id: 0,
                embed_url: { sub: "", dub: "", hardsub: "" },
              }))}
              selectedEp={selectedEp}
              language={language}
              seriesTitle={fallback.title}
              seriesPoster={fallback.coverImage}
              onSelect={handleEpisodeSelect}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!series) return null;

  const currentEpisode = series.episodes?.find((ep) => ep.number === selectedEp);
  const episodeLabel = cleanTitle(currentEpisode?.title) || `Episode ${selectedEp}`;
  const totalEps = series.episodes.length;

  return (
    <div className="min-h-screen bg-background kuro-animate-in">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <Link
          href={`/anime/${id}`}
          className="inline-flex items-center gap-2 rounded-lg bg-surface/80 px-3 py-2 text-sm text-muted hover:bg-surface-hover backdrop-blur-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      <div className="mx-auto grid max-w-7xl gap-4 px-4 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <HLSPlayer
            key={`${series.mal_id}-${selectedEp}-${language}`}
            malId={series.mal_id || id}
            aniListId={series.ani_id || undefined}
            seriesTitle={series.title}
            episodeNumber={selectedEp}
            language={language}
            title={episodeLabel}
            onNext={handleNext}
            onPrevious={handlePrevious}
            hasNext={selectedEp < totalEps}
            hasPrevious={selectedEp > 1}
          />

          <div className="mt-4 rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-xl font-bold text-foreground">{episodeLabel}</h1>
                <p className="text-sm text-muted">
                  {COMMON.episode} {selectedEp} {COMMON.of} {totalEps}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setLanguage("sub")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    language === "sub"
                      ? "bg-accent text-white"
                      : "bg-surface-hover text-muted hover:text-foreground border border-border"
                  )}
                >
                  <Subtitles className="h-4 w-4" />
                  {COMMON.sub}
                </button>
                <button
                  onClick={() => setLanguage("dub")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    language === "dub"
                      ? "bg-accent text-white"
                      : "bg-surface-hover text-muted hover:text-foreground border border-border"
                  )}
                >
                  <Mic2 className="h-4 w-4" />
                  {COMMON.dub}
                </button>
              </div>
            </div>

            {series.description && (
              <p className="mt-3 text-sm text-muted line-clamp-3">{series.description}</p>
            )}
          </div>
        </div>

        <div className="hidden lg:block">
          <EpisodeSidebar
            episodes={series.episodes}
            selectedEp={selectedEp}
            language={language}
            seriesTitle={series.title}
            seriesPoster={series.poster}
            onSelect={handleEpisodeSelect}
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-8 lg:hidden">
        <h2 className="mb-3 text-lg font-bold text-foreground">{COMMON.episodes}</h2>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {series.episodes.map((ep) => {
            const hasSub = !!ep.embed_url?.sub;
            const hasDub = !!ep.embed_url?.dub;
            const isAvailable = language === "sub" ? hasSub : hasDub;
            return (
              <button
                key={ep.number}
                onClick={() => isAvailable && handleEpisodeSelect(ep.number)}
                disabled={!isAvailable}
                className={cn(
                  "rounded-lg border p-2 text-sm font-medium transition-colors",
                  selectedEp === ep.number
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border bg-surface text-foreground hover:border-accent",
                  !isAvailable && "opacity-40 cursor-not-allowed"
                )}
              >
                {ep.number}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
