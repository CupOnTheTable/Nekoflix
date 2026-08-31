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
  ExternalLink,
  Calendar,
  Tv,
  Film,
} from "lucide-react";
import { cn, getScoreColor } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import AnimeLoader from "@/components/ui/AnimeLoader";
import type { Anime } from "@/types";

interface DbLink {
  id: string;
  episode: number;
  platform: string;
  url: string;
  isPrimary: boolean;
}

const PLATFORM_COLORS: Record<string, string> = {
  crunchyroll: "bg-orange-600",
  funimation: "bg-blue-600",
  hidive: "bg-teal-600",
  netflix: "bg-red-600",
  disneyplus: "bg-blue-800",
  prime: "bg-sky-600",
  hulu: "bg-green-600",
  museasia: "bg-yellow-600",
  animelog: "bg-pink-600",
  aniplus: "bg-purple-600",
  wakanim: "bg-emerald-600",
  other: "bg-zinc-600",
};

export default function AnimeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [watchlistStatus, setWatchlistStatus] = useState<string | null>(null);
  const [streamingLinks, setStreamingLinks] = useState<DbLink[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState(1);
  const [allLinks, setAllLinks] = useState<DbLink[]>([]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/anime/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((data) => {
        setAnime(data.anime);
        setLoading(false);
        fetch(`/api/streaming?animeId=${id}`)
          .then((r) => r.json())
          .then((links: DbLink[]) => {
            setAllLinks(links);
            setStreamingLinks(links.filter((l) => l.episode === 1));
          })
          .catch(() => {});
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!anime) return;
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          fetch("/api/watchlist")
            .then((r) => r.json())
            .then((wData) => {
              const item = wData.items?.find(
                (i: { animeId: number }) => i.animeId === anime.id
              );
              if (item) setWatchlistStatus(item.status);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, [anime]);

  const handleAddToWatchlist = async () => {
    if (!anime) return;
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      if (!meData.user) {
        router.push("/auth/login");
        return;
      }
      if (watchlistStatus) {
        return;
      }
      const res = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ animeId: anime.id, status: "plan_to_watch" }),
      });
      if (res.ok) {
        setWatchlistStatus("plan_to_watch");
      } else if (res.status === 409) {
        setWatchlistStatus("plan_to_watch");
      }
    } catch { /* ignore */ }
  };

  const changeEpisode = (ep: number) => {
    setSelectedEpisode(ep);
    setStreamingLinks(allLinks.filter((l) => l.episode === ep));
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
        <Button variant="secondary" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-[40vh] min-h-[300px] w-full overflow-hidden">
        <Image
          src={anime.backdropImage || anime.coverImage}
          alt={anime.title}
          fill
          sizes="100vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 to-transparent" />

        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-lg bg-black/60 px-3 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-black/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div className="relative mx-auto max-w-5xl px-4 -mt-32 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row">
          <div className="relative h-60 w-40 shrink-0 overflow-hidden rounded-xl border-2 border-zinc-800 bg-zinc-800 shadow-2xl sm:h-80 sm:w-56">
            <Image
              src={anime.coverImage}
              alt={`${anime.title} cover`}
              fill
              sizes="(max-width: 640px) 160px, 224px"
              className="object-cover"
            />
          </div>

          <div className="min-w-0 flex-1 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={anime.status === "Airing" ? "success" : anime.status === "Upcoming" ? "info" : "default"}>
                {anime.status}
              </Badge>
              <Badge variant="default">{anime.format}</Badge>
            </div>

            <h1 className="mt-3 text-2xl font-bold text-white sm:text-4xl">
              {anime.title}
            </h1>
            {anime.titleJapanese && (
              <p className="mt-1 text-sm text-zinc-400">{anime.titleJapanese}</p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-300">
              <span className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className={cn("font-bold", getScoreColor(anime.score))}>
                  {anime.score}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <Tv className="h-4 w-4 text-zinc-500" />
                {anime.episodes} episodes
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-zinc-500" />
                {anime.releaseYear} {anime.season}
              </span>
              {anime.studios.length > 0 && (
                <span className="flex items-center gap-1">
                  <Film className="h-4 w-4 text-zinc-500" />
                  {anime.studios.join(", ")}
                </span>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
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

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/watch/${anime.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 text-sm font-bold text-white hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-600/20"
              >
                <Play className="h-4 w-4 fill-white" />
                Watch Now
              </Link>
              <Button variant="primary" size="lg" onClick={handleAddToWatchlist} disabled={!!watchlistStatus}>
                {watchlistStatus ? (
                  <>
                    <Check className="h-4 w-4" />
                    {watchlistStatus === "plan_to_watch" ? "Plan to Watch"
                      : watchlistStatus === "watching" ? "Watching"
                      : watchlistStatus === "completed" ? "Completed"
                      : watchlistStatus === "on_hold" ? "On Hold"
                      : "In Watchlist"}
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add to Watchlist
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <section>
            <h2 className="text-lg font-bold text-white">Synopsis</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              {anime.synopsis}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Where to Watch</h2>

            {allLinks.length > 0 && (
              <div className="mt-3 mb-4">
                <div className="flex items-center gap-2 rounded-lg bg-zinc-800/50 p-2">
                  <Tv className="h-4 w-4 text-zinc-400" />
                  <span className="text-sm text-zinc-300">Episode:</span>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: Math.min(anime.episodes || 25, 50) }, (_, i) => i + 1).map((ep) => (
                      <button
                        key={ep}
                        onClick={() => changeEpisode(ep)}
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded text-xs font-medium transition-colors",
                          selectedEpisode === ep
                            ? "bg-purple-600 text-white"
                            : "bg-zinc-700 text-zinc-400 hover:bg-zinc-600 hover:text-white"
                        )}
                      >
                        {ep}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {streamingLinks.length > 0 ? (
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {streamingLinks.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-white transition-all duration-200",
                      "hover:scale-105 hover:shadow-lg",
                      PLATFORM_COLORS[link.platform] || "bg-zinc-600"
                    )}
                  >
                    <Play className="h-4 w-4" />
                    {link.platform.charAt(0).toUpperCase() + link.platform.slice(1)}
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                ))}
              </div>
            ) : allLinks.length > 0 ? (
              <p className="mt-3 rounded-lg bg-zinc-800/50 p-4 text-center text-sm text-zinc-500">
                No links for Episode {selectedEpisode} found.
              </p>
            ) : (
              <p className="mt-3 rounded-lg bg-zinc-800/50 p-4 text-center text-sm text-zinc-500">
                No streaming links available for this anime.
              </p>
            )}
          </section>

          <section>
            <h2 className="text-lg font-bold text-white">Details</h2>
            <div className="mt-3 grid grid-cols-2 gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm sm:grid-cols-3">
              <div>
                <span className="text-zinc-500">Format</span>
                <p className="mt-0.5 font-medium text-zinc-200">{anime.format}</p>
              </div>
              <div>
                <span className="text-zinc-500">Episodes</span>
                <p className="mt-0.5 font-medium text-zinc-200">{anime.episodes || "Unknown"}</p>
              </div>
              <div>
                <span className="text-zinc-500">Status</span>
                <p className="mt-0.5 font-medium text-zinc-200">{anime.status}</p>
              </div>
              <div>
                <span className="text-zinc-500">Score</span>
                <p className="mt-0.5 font-medium text-zinc-200">{anime.score}/10</p>
              </div>
              <div>
                <span className="text-zinc-500">Season</span>
                <p className="mt-0.5 font-medium text-zinc-200">{anime.season} {anime.releaseYear}</p>
              </div>
              <div>
                <span className="text-zinc-500">Studios</span>
                <p className="mt-0.5 font-medium text-zinc-200">{anime.studios.join(", ") || "Unknown"}</p>
              </div>
              {anime.broadcastDay && (
                <div>
                  <span className="text-zinc-500">Broadcast</span>
                  <p className="mt-0.5 font-medium text-zinc-200">
                    {anime.broadcastDay}{anime.broadcastTime ? ` at ${anime.broadcastTime}` : ""}
                  </p>
                </div>
              )}
              <div>
                <span className="text-zinc-500">Audio</span>
                <p className="mt-0.5 font-medium text-zinc-200">
                  {anime.subbed ? "Subbed" : ""}{anime.subbed && anime.dubbed ? " / " : ""}{anime.dubbed ? "Dubbed" : ""}
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className="h-24" />
    </div>
  );
}
