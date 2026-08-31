"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Star, Clock, Sparkles, TrendingUp } from "lucide-react";
import AnimeLoader from "@/components/ui/AnimeLoader";

interface EnrichedAnime {
  id: number;
  title: string;
  poster: string;
  rating: string;
  status: string;
  episodes: string;
  season: string;
  year: number;
  mal_id: string;
  description?: string;
  terms_by_type?: { genre?: string[] };
  anilist_score?: number;
  anilist_genres?: string[];
  anilist_synopsis?: string;
  anilist_banner?: string;
  anilist_cover?: string;
  coverImage?: string;
  score?: number;
  format?: string;
}

export default function Home() {
  const [recent, setRecent] = useState<EnrichedAnime[]>([]);
  const [loading, setLoading] = useState(true);
  const [featuredIdx, setFeaturedIdx] = useState(0);

  useEffect(() => {
    fetch("/api/home")
      .then((r) => r.json())
      .then((data) => {
        const items = data.data || [];
        setRecent(items);
        if (items.length > 1) {
          setFeaturedIdx(Math.floor(Math.random() * items.length));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <AnimeLoader text="Loading anime..." />;

  const featured = recent[featuredIdx];
  const newEpisodes = recent.filter((a, i) => i !== featuredIdx && a.status === "Currently Airing").slice(0, 12);
  const allAnime = recent.filter((_, i) => i !== featuredIdx).slice(0, 18);

  return (
    <div className="min-h-screen bg-background">
      {featured && (
        <div className="relative h-[70vh] min-h-[480px] w-full overflow-hidden bg-background kuro-animate-in">
          {/* Blurred background from poster */}
          <div className="absolute inset-0">
            <Image
              src={featured.anilist_cover || featured.poster}
              alt=""
              fill
              sizes="100vw"
              className="object-cover blur-xl scale-110 opacity-40"
              priority
            />
          </div>

          {/* Skewed poster card on the right */}
          <div className="absolute inset-0 flex items-center justify-end pr-[4%] pointer-events-none">
            <div
              className="relative w-[200px] h-[290px] sm:w-[240px] sm:h-[340px] lg:w-[280px] lg:h-[400px] rounded-2xl overflow-hidden shadow-2xl shadow-black/70 ring-2 ring-white/10 hidden sm:block"
              style={{ transform: "perspective(800px) rotateY(8deg) rotateX(-2deg)", transformOrigin: "center center" }}
            >
              <Image
                src={featured.anilist_cover || featured.poster}
                alt={featured.title}
                fill
                sizes="280px"
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>
          </div>

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />

          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 lg:p-14">
            <div className="mx-auto max-w-7xl">
              <div className="flex items-center gap-2 mb-3">
                <span className="rounded bg-purple-600 px-2.5 py-1 text-xs font-bold text-white uppercase tracking-wide">
                  {featured.season} {featured.year}
                </span>
                {featured.anilist_score && featured.anilist_score > 0 && (
                  <span className="flex items-center gap-1 rounded bg-yellow-500/20 px-2.5 py-1 text-xs font-bold text-yellow-400 border border-yellow-500/30">
                    <Star className="h-3 w-3 fill-yellow-400" />
                    {(featured.anilist_score).toFixed(1)}
                  </span>
                )}
                <span className="rounded bg-zinc-800/80 px-2 py-1 text-xs text-zinc-300 border border-zinc-700/50">
                  {featured.rating}
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white mb-3 drop-shadow-2xl tracking-tight">
                {featured.title}
              </h1>

              {featured.anilist_synopsis && (
                <p className="mb-5 max-w-2xl text-sm sm:text-base text-zinc-300/90 line-clamp-3 leading-relaxed">
                  {featured.anilist_synopsis}
                </p>
              )}

              <div className="flex items-center gap-4 mb-5 text-sm text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-zinc-500" />
                  {featured.episodes} Episodes
                </span>
                {featured.anilist_genres && featured.anilist_genres.length > 0 && (
                  <span className="text-zinc-500">
                    {featured.anilist_genres.slice(0, 3).join(" · ")}
                  </span>
                )}
              </div>

              <Link
                href={`/watch/${featured.id}`}
                className="inline-flex items-center gap-2.5 rounded-xl bg-purple-600 px-7 py-3.5 text-sm font-bold text-white transition-all hover:bg-purple-500 hover:scale-105 shadow-xl shadow-purple-600/30"
              >
                <Play className="h-5 w-5 fill-white" />
                Watch Now
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* New Episodes */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl font-bold text-foreground">New Episodes</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 kuro-stagger">
            {newEpisodes.map((anime) => (
              <Link
                key={anime.id}
                href={`/watch/${anime.id}`}
                className="group relative overflow-hidden rounded-xl bg-surface border border-border transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src={anime.anilist_cover || anime.poster}
                    alt={anime.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 16vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <div className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white">
                      <Play className="h-3 w-3" />
                      Watch Now
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <span className="rounded bg-green-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      NEW
                    </span>
                  </div>
                  {anime.anilist_score && anime.anilist_score > 0 && (
                    <div className="absolute top-2 left-2 flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-yellow-400">
                      <Star className="h-2.5 w-2.5 fill-yellow-400" />
                      {(anime.anilist_score).toFixed(1)}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-foreground line-clamp-2">{anime.title}</h3>
                  <p className="mt-1 text-xs text-muted">
                    {anime.episodes} Ep. · {anime.season} {anime.year}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* All Anime */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-pink-400" />
            <h2 className="text-xl font-bold text-foreground">All Anime</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 kuro-stagger">
            {allAnime.map((anime) => (
              <Link
                key={anime.id}
                href={`/watch/${anime.id}`}
                className="group relative overflow-hidden rounded-xl bg-surface border border-border transition-all hover:border-border hover:shadow-lg"
              >
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src={anime.anilist_cover || anime.poster}
                    alt={anime.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 16vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <div className="flex items-center gap-1.5 rounded-lg bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs font-medium text-white">
                      <Play className="h-3 w-3" />
                      Watch Now
                    </div>
                  </div>
                  {anime.anilist_score && anime.anilist_score > 0 && (
                    <div className="absolute top-2 left-2 flex items-center gap-0.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-yellow-400">
                      <Star className="h-2.5 w-2.5 fill-yellow-400" />
                      {(anime.anilist_score).toFixed(1)}
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-sm font-medium text-foreground line-clamp-2">{anime.title}</h3>
                  <p className="mt-1 text-xs text-muted">
                    {anime.status === "Currently Airing" ? (
                      <span className="text-green-400">Airing</span>
                    ) : (
                      <span>{anime.episodes} Ep.</span>
                    )}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
