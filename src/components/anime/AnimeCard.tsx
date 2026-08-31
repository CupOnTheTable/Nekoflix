"use client";

import { useState } from "react";
import Link from "next/link";
import { Star, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Anime } from "@/types";

interface AnimeCardProps {
  anime: Anime;
  onAddToWatchlist?: (animeId: number) => void;
  isInWatchlist?: boolean;
}

export default function AnimeCard({
  anime,
  onAddToWatchlist,
  isInWatchlist = false,
}: AnimeCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleWatchlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onAddToWatchlist?.(anime.id);
  };

  const genres = anime.genres.slice(0, 3);

  return (
    <Link
      href={`/anime/${anime.id}`}
      className={cn(
        "group relative flex flex-col rounded-xl border border-zinc-800 bg-zinc-900",
        "overflow-hidden transition-all duration-300",
        "hover:scale-[1.03] hover:shadow-xl hover:shadow-black/40 hover:border-zinc-700",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950",
        "aspect-[3/4]"
      )}
      aria-label={`${anime.title} — ${anime.score} stars, ${anime.episodes} episodes`}
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-500 group-hover:scale-105"
        style={{ backgroundImage: `url(${anime.coverImage})` }}
        aria-hidden="true"
      >
        {!imageLoaded && (
          <div className="absolute inset-0 animate-pulse bg-zinc-800" />
        )}
        <img
          src={anime.coverImage}
          alt={`Cover art for ${anime.title}`}
          className="hidden"
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      <div className="absolute top-2 left-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        <span className="text-xs font-semibold text-white">{anime.score}</span>
      </div>

      <div className="absolute top-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 backdrop-blur-sm">
        <span className="text-xs font-medium text-zinc-300">
          {anime.episodes} eps
        </span>
      </div>

      <div className="relative mt-auto flex flex-col gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-white">
          {anime.title}
        </h3>

        {genres.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {genres.map((genre) => (
              <span
                key={genre}
                className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300 backdrop-blur-sm"
              >
                {genre}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={handleWatchlistClick}
          className={cn(
            "mt-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200",
            "sm:opacity-0 sm:translate-y-1 sm:group-hover:opacity-100 sm:group-hover:translate-y-0",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
            isInWatchlist
              ? "bg-purple-600 text-white hover:bg-purple-500"
              : "bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm"
          )}
          aria-label={
            isInWatchlist
              ? `Remove ${anime.title} from watchlist`
              : `Add ${anime.title} to watchlist`
          }
        >
          {isInWatchlist ? (
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
    </Link>
  );
}
