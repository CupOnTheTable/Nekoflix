"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Star,
  Play,
  Plus,
  Check,
  ChevronRight,
} from "lucide-react";
import { cn, getScoreColor } from "@/lib/utils";
import AnimeLoader from "@/components/ui/AnimeLoader";
import type { Anime } from "@/types";

interface AnimeDetail extends Anime {
  characters?: {
    id: number;
    name: string;
    image: string | null;
    role: string;
    voiceActor?: { name: string; image: string | null };
  }[];
  recommendations?: {
    id: number;
    title: string;
    coverImage: string;
    score: number;
    format: string;
    status: string;
  }[];
}

const STATUS_MAP: Record<string, string> = {
  Airing: "RELEASING",
  Finished: "FINISHED",
  Upcoming: "NOT_YET_RELEASED",
};

export default function AnimeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [anime, setAnime] = useState<AnimeDetail | null>(null);
  const [watchable, setWatchable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [watchlistStatus, setWatchlistStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(false);
    fetch(`/api/anime/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setAnime(data.anime);
        setWatchable(data.watchable);
        setLoading(false);

        fetch("/api/auth/me")
          .then((r) => r.json())
          .then((meData) => {
            if (meData.user) {
              fetch("/api/watchlist")
                .then((r) => r.json())
                .then((wData) => {
                  const item = wData.items?.find(
                    (i: { animeId: number }) => i.animeId === data.anime.id
                  );
                  if (item) setWatchlistStatus(item.status);
                })
                .catch(() => {});
            }
          })
          .catch(() => {});
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [id]);

  const handleAddToWatchlist = async () => {
    if (!anime) return;
    const meRes = await fetch("/api/auth/me");
    const meData = await meRes.json();
    if (!meData.user) {
      router.push("/auth/login");
      return;
    }
    if (watchlistStatus) return;
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ animeId: anime.id, status: "plan_to_watch" }),
    });
    if (res.ok || res.status === 409) setWatchlistStatus("plan_to_watch");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AnimeLoader text="Loading anime..." />
      </div>
    );
  }

  if (error || !anime) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-zinc-400">Anime not found.</p>
        <button onClick={() => router.back()} className="flex items-center gap-2 rounded-lg bg-surface px-4 py-2 text-sm text-muted hover:bg-surface-hover">
          <ArrowLeft className="h-4 w-4" /> Go Back
        </button>
      </div>
    );
  }

  const airedDate = anime.releaseYear
    ? `${anime.releaseYear}-${String(
        { Winter: 1, Spring: 4, Summer: 7, Fall: 10 }[anime.season] || 1
      ).padStart(2, "0")}`
    : "Unknown";

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-[40vh] min-h-[300px] w-full overflow-hidden">
        <Image
          src={anime.backdropImage || anime.coverImage}
          alt=""
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/50 to-transparent" />

        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className="relative mx-auto max-w-6xl px-4 -mt-48 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="relative h-64 w-44 shrink-0 overflow-hidden rounded-xl border-2 border-zinc-800 bg-zinc-800 shadow-2xl sm:h-80 sm:w-56 self-start">
                <Image
                  src={anime.coverImage}
                  alt={anime.title}
                  fill
                  sizes="(max-width: 640px) 176px, 224px"
                  className="object-cover"
                />
              </div>

              <div className="flex-1 min-w-0 pt-2">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="flex items-center gap-1 rounded-lg bg-yellow-500/10 px-2.5 py-1 text-sm font-bold text-yellow-400 border border-yellow-500/20">
                    <Star className="h-3.5 w-3.5 fill-yellow-400" />
                    {anime.score > 0 ? anime.score.toFixed(1) : "N/A"}
                  </span>
                  <span className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 border border-zinc-700">
                    {anime.format}
                  </span>
                  <span className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium border",
                    anime.status === "Airing"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : anime.status === "Upcoming"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : "bg-zinc-800 text-zinc-300 border-zinc-700"
                  )}>
                    {anime.status}
                  </span>
                  <span className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-medium text-zinc-300 border border-zinc-700">
                    {anime.episodes || "?"} EP
                  </span>
                  {anime.broadcastDay && (
                    <span className="rounded-lg bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-400 border border-purple-500/20">
                      EP {anime.episodes || "?"} IN {anime.broadcastDay.toUpperCase().slice(0, 3)}
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                  {anime.title}
                </h1>
                {anime.titleJapanese && (
                  <p className="mt-1 text-sm text-muted">
                    {anime.titleJapanese}
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  {watchable ? (
                    <Link
                      href={`/watch/${anime.id}`}
                      className="inline-flex items-center gap-2 rounded-xl bg-foreground px-5 py-2.5 text-sm font-bold text-background transition-all hover:bg-foreground/90"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Watch episode 1
                    </Link>
                  ) : (
                    <span className="inline-flex items-center gap-2 rounded-xl bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-500 border border-zinc-700 cursor-not-allowed">
                      <Play className="h-4 w-4" />
                      Not available
                    </span>
                  )}
                  <button
                    onClick={handleAddToWatchlist}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-medium transition-all",
                      watchlistStatus
                        ? "border-green-500/30 bg-green-500/10 text-green-400"
                        : "border-zinc-700 bg-surface text-muted hover:bg-surface-hover hover:text-foreground"
                    )}
                  >
                    {watchlistStatus ? (
                      <>
                        <Check className="h-4 w-4" />
                        {watchlistStatus === "plan_to_watch" ? "Plan to Watch"
                          : watchlistStatus === "watching" ? "Watching"
                          : watchlistStatus === "completed" ? "Completed"
                          : "In Watchlist"}
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Watchlist
                      </>
                    )}
                  </button>
                </div>

                <p className="mt-5 text-sm leading-relaxed text-muted max-w-2xl">
                  {anime.synopsis}
                </p>

                {anime.genres.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {anime.genres.map((genre) => (
                      <Link
                        key={genre}
                        href={`/search?genres=${encodeURIComponent(genre)}`}
                        className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-300 border border-zinc-700 transition-colors hover:bg-zinc-700 hover:text-white"
                      >
                        {genre}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {anime.characters && anime.characters.length > 0 && (
              <div className="mt-10">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span className="h-5 w-1 rounded-full bg-purple-500" />
                  Characters & voice cast
                </h2>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-4 scrollbar-hide">
                  {anime.characters.map((ch) => (
                    <div
                      key={ch.id}
                      className="flex items-center gap-3 shrink-0 rounded-xl bg-surface border border-zinc-800 px-3 py-2 min-w-[200px]"
                    >
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-700">
                        {ch.image && (
                          <Image src={ch.image} alt={ch.name} fill sizes="40px" className="object-cover" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{ch.name}</p>
                        <p className="text-xs text-muted truncate">
                          {ch.role} {ch.voiceActor ? `· ${ch.voiceActor.name}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {anime.recommendations && anime.recommendations.length > 0 && (
              <div className="mt-10">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <span className="h-5 w-1 rounded-full bg-purple-500" />
                  You might also like
                </h2>
                <div className="mt-4 flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                  {anime.recommendations.map((rec) => (
                    <Link
                      key={rec.id}
                      href={`/anime/${rec.id}`}
                      className="group relative shrink-0 w-[150px]"
                    >
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-zinc-800">
                        <Image
                          src={rec.coverImage}
                          alt={rec.title}
                          fill
                          sizes="150px"
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <span className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-xs font-bold text-yellow-400 backdrop-blur-sm">
                          <Star className="h-2.5 w-2.5 fill-yellow-400" />
                          {rec.score > 0 ? rec.score.toFixed(1) : "N/A"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-foreground line-clamp-2 group-hover:text-purple-400 transition-colors">
                        {rec.title}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-full lg:w-72 shrink-0">
            <div className="rounded-xl border border-zinc-800 bg-surface p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {anime.score > 0 ? anime.score.toFixed(1) : "N/A"}
                  </p>
                  <p className="text-xs text-muted">/10</p>
                </div>
              </div>

              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden mb-5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-500 to-orange-500"
                  style={{ width: `${(anime.score / 10) * 100}%` }}
                />
              </div>

              <div className="space-y-3 text-sm">
                {[
                  ["TYPE", anime.format],
                  ["STATUS", STATUS_MAP[anime.status] || anime.status],
                  ["AIRED", airedDate],
                  ["EPISODES", anime.episodes ? String(anime.episodes) : "?"],
                  ["DURATION", anime.duration ? `${anime.duration} min` : "Unknown"],
                  ["SOURCE", "MANGA"],
                  ["STUDIOS", anime.studios.length > 0 ? anime.studios.join(", ") : "Unknown"],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-muted font-medium">{label}</span>
                    <span className="text-foreground font-medium">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="h-24" />
    </div>
  );
}
