"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  Play,
  Plus,
  Check,
  LogIn,
  Star,
  Clock,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn, getScoreColor } from "@/lib/utils";
import type { Anime } from "@/types";

interface HomeClientProps {
  featuredAnime: Anime | null;
  trendingAnime: Anime[];
  newThisSeason: Anime[];
  topRated: Anime[];
}

function Toast({
  message,
  type,
  onClose,
}: {
  message: string;
  type: "success" | "error" | "info";
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-lg px-4 py-3 shadow-2xl backdrop-blur-sm",
        "animate-in slide-in-from-bottom-5 fade-in duration-300",
        type === "success" && "bg-green-900/90 border border-green-700/50 text-green-100",
        type === "error" && "bg-red-900/90 border border-red-700/50 text-red-100",
        type === "info" && "bg-zinc-800/90 border border-zinc-700/50 text-zinc-100"
      )}
      role="alert"
    >
      {type === "success" && <Check className="h-4 w-4 shrink-0 text-green-400" />}
      {type === "error" && <span className="h-4 w-4 shrink-0 text-red-400">!</span>}
      {type === "info" && <LogIn className="h-4 w-4 shrink-0 text-zinc-400" />}
      <span className="text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="ml-2 text-sm opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}

function HeroSection({
  anime,
  onAddToWatchlist,
}: {
  anime: Anime;
  onAddToWatchlist: (id: number) => void;
}) {
  return (
    <section className="relative w-full h-[70vh] min-h-[500px] max-h-[800px] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${anime.backdropImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />

      <div className="relative z-10 flex h-full items-end pb-16 px-4 sm:px-8 lg:px-16">
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center gap-3">
            <Badge variant="success">{anime.status}</Badge>
            <Badge variant="default">{anime.format}</Badge>
            {anime.subbed && <Badge variant="outline">Sub</Badge>}
            {anime.dubbed && <Badge variant="info">Dub</Badge>}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight tracking-tight">
            {anime.title}
          </h1>

          {anime.titleJapanese && (
            <p className="text-sm text-zinc-400">{anime.titleJapanese}</p>
          )}

          <div className="flex items-center gap-4 text-sm text-zinc-300">
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className={cn("font-semibold", getScoreColor(anime.score))}>
                {anime.score}
              </span>
            </span>
            <span>{anime.episodes} episodes</span>
            <span>{anime.releaseYear}</span>
          </div>

          <p className="text-sm text-zinc-300 leading-relaxed line-clamp-3 max-w-xl">
            {anime.synopsis}
          </p>

          <div className="flex flex-wrap gap-2">
            {anime.genres.map((genre) => (
              <span
                key={genre}
                className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-zinc-200 backdrop-blur-sm"
              >
                {genre}
              </span>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link href={`/anime/${anime.id}`}>
                <Play className="h-5 w-5" />
                Watch Now
              </Link>
            </Button>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => onAddToWatchlist(anime.id)}
            >
              <Plus className="h-5 w-5" />
              Add to Watchlist
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function AnimeRow({
  title,
  animeList,
  viewAllHref,
}: {
  title: string;
  animeList: Anime[];
  viewAllHref?: string;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-white">{title}</h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            View All
            <ChevronRight className="h-4 w-4" />
          </Link>
        )}
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
        {animeList.map((anime) => (
          <Link
            key={anime.id}
            href={`/anime/${anime.id}`}
            className="group flex-shrink-0 w-[180px] sm:w-[200px]"
          >
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 group-hover:scale-[1.03] group-hover:shadow-xl group-hover:shadow-black/40 group-hover:border-zinc-700">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${anime.coverImage})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-semibold text-white">{anime.score}</span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <h3 className="line-clamp-2 text-sm font-semibold text-white leading-tight">
                  {anime.title}
                </h3>
                <p className="mt-1 text-xs text-zinc-400">
                  {anime.episodes} eps
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ContinueWatchingPlaceholder() {
  return (
    <section className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-bold text-white">
        Continue Watching
      </h2>
      <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/50 px-6 py-12 text-center">
        <Clock className="h-10 w-10 text-zinc-600 mb-3" />
        <p className="text-zinc-400 text-sm max-w-sm">
          Sign in to track your watch history and pick up right where you left off.
        </p>
        <Button asChild size="sm" className="mt-4">
          <Link href="/auth/login">
            <LogIn className="h-4 w-4" />
            Sign In
          </Link>
        </Button>
      </div>
    </section>
  );
}

export default function HomeClient({
  featuredAnime,
  trendingAnime,
  newThisSeason,
  topRated,
}: HomeClientProps) {
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const [watchlistIds, setWatchlistIds] = useState<Set<number>>(new Set());

  const [data, setData] = useState({
    featured: featuredAnime,
    trending: trendingAnime,
    newSeason: newThisSeason,
    top: topRated,
  });

  useEffect(() => {
    if (data.featured) return;
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/anime?sort=score&page=1");
        if (!res.ok) return;
        const d = await res.json();
        if (cancelled || !d.anime?.length) return;
        setData({
          featured: d.anime[0],
          trending: d.anime.slice(0, 10),
          newSeason: d.anime.slice(0, 8),
          top: [...d.anime].sort((a: Anime, b: Anime) => b.score - a.score).slice(0, 8),
        });
      } catch { /* ignore */ }
    }
    load();
    return () => { cancelled = true; };
  }, [data.featured]);

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      setToast({ message, type });
      setTimeout(() => setToast(null), 4000);
    },
    []
  );

  const handleAddToWatchlist = useCallback(
    async (animeId: number) => {
      try {
        const meRes = await fetch("/api/auth/me");
        const meData = await meRes.json();
        if (!meData.user) {
          showToast("Please sign in to add anime to your watchlist", "info");
          return;
        }

        const res = await fetch("/api/watchlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ animeId, status: "plan_to_watch" }),
        });

        if (res.ok) {
          setWatchlistIds((prev) => new Set(prev).add(animeId));
          showToast("Added to watchlist!", "success");
        } else if (res.status === 409) {
          showToast("Already in your watchlist", "info");
        } else {
          showToast("Failed to add to watchlist", "error");
        }
      } catch {
        showToast("Something went wrong", "error");
      }
    },
    [showToast]
  );

  const newThisSeasonSlice = data.newSeason.slice(0, 8);
  const topRatedSlice = data.top.slice(0, 8);

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {data.featured && (
        <HeroSection
          anime={data.featured}
          onAddToWatchlist={handleAddToWatchlist}
        />
      )}

      {!data.featured && (
        <div className="flex h-[50vh] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500 mx-auto" />
            <p className="text-zinc-400">Loading anime...</p>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl space-y-12 px-4 sm:px-8 lg:px-16 py-12">
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Popular Right Now
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {data.trending.slice(0, 10).map((anime) => (
              <Link
                key={anime.id}
                href={`/anime/${anime.id}`}
                className="group flex-shrink-0 w-[180px] sm:w-[200px]"
              >
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 group-hover:scale-[1.03] group-hover:shadow-xl group-hover:shadow-black/40 group-hover:border-zinc-700">
                  <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${anime.coverImage})` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-semibold text-white">
                      {anime.score}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="line-clamp-2 text-sm font-semibold text-white leading-tight">
                      {anime.title}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-400">
                      {anime.episodes} eps
                    </p>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleAddToWatchlist(anime.id);
                      }}
                      className={cn(
                        "mt-2 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium",
                        "w-full",
                        watchlistIds.has(anime.id)
                          ? "bg-purple-600 text-white"
                          : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm",
                        "sm:opacity-0 sm:translate-y-1 sm:group-hover:opacity-100 sm:group-hover:translate-y-0"
                      )}
                      aria-label={`Add ${anime.title} to watchlist`}
                    >
                      {watchlistIds.has(anime.id) ? (
                        <>
                          <Check className="h-3 w-3" />
                          In Watchlist
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" />
                          Add to Watchlist
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {newThisSeasonSlice.length > 0 && (
          <AnimeRow
            title="New This Season"
            animeList={newThisSeasonSlice}
          />
        )}

        {topRatedSlice.length > 0 && (
          <AnimeRow
            title="Top Rated"
            animeList={topRatedSlice}
          />
        )}

        <ContinueWatchingPlaceholder />
      </div>
    </>
  );
}
