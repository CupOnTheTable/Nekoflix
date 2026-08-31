import { NextResponse } from "next/server";
import { getRecentAnime } from "@/lib/anikoto";
import { fetchAnimeById, fetchTopAnime } from "@/lib/jikan";

export const dynamic = "force-dynamic";

const metaCache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 60 * 60 * 1000;

function cleanText(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#\d+;/g, " ")
    .trim();
}

export async function GET() {
  try {
    const [recent, popularAnilist] = await Promise.all([
      getRecentAnime(1, 30),
      fetchTopAnime(undefined, 1, 12),
    ]);

    // Map popular anime to include both AniList ID and MAL ID
    const popular = popularAnilist.map((a) => ({
      ...a,
      // Use MAL ID if available (more likely to be in AniKoto), otherwise AniList ID
      watchId: a.id,
    }));

    const enriched = await Promise.all(
      recent.map(async (anime) => {
        const cacheKey = `meta:${anime.mal_id}`;
        const cached = metaCache.get(cacheKey);
        if (cached && cached.expiry > Date.now()) return cached.data;

        if (!anime.mal_id) return anime;

        try {
          const meta = await fetchAnimeById(parseInt(anime.mal_id));
          const result = {
            ...anime,
            season: cleanText(anime.season || ""),
            anilist_score: meta.score,
            anilist_genres: meta.genres,
            anilist_synopsis: meta.synopsis,
            anilist_banner: meta.backdropImage?.includes("/banner/") ? meta.backdropImage : null,
            anilist_cover: meta.coverImage?.replace("/medium/", "/large/"),
          };
          metaCache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });
          return result;
        } catch {
          return { ...anime, season: cleanText(anime.season || "") };
        }
      })
    );

    return NextResponse.json({ ok: true, data: enriched, popular });
  } catch {
    return NextResponse.json({ ok: false, data: [], popular: [] });
  }
}
