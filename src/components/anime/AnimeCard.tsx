"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import type { Anime } from "@/types";

interface AnimeCardProps {
  anime: Anime;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  const genres = anime.genres.slice(0, 3);

  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group relative flex flex-col rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 aspect-[3/4]"
    >
      <img
        src={anime.coverImage}
        alt={anime.title}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      <div className="absolute top-2 left-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5">
        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
        <span className="text-xs font-semibold text-white">{anime.score}</span>
      </div>

      <div className="absolute top-2 right-2 rounded bg-black/70 px-1.5 py-0.5">
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
                className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-medium text-zinc-300"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
