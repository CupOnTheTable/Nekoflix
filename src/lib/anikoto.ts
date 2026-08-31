const ANIKOTO_BASE = "https://anikotoapi.site";

export interface AniKotoAnime {
  id: number;
  title: string;
  alternative: string;
  titles: string;
  native: string;
  slug: string;
  rating: string;
  poster: string;
  is_sub: number;
  description: string;
  aired: string;
  season: string;
  year: number;
  duration: string;
  status: string;
  mal_id: string;
  episodes: string;
  ani_id: string;
  source: string;
  s_id: number;
  background_image: string;
  updated_at: string;
  terms_by_type?: { genre?: string[]; theme?: string[]; demographic?: string[] };
}

export interface AniKotoEpisode {
  number: number;
  title: string;
  episode_embed_id: number;
  embed_url: {
    sub: string | null;
    dub: string | null;
    hardsub: string | null;
  };
}

export interface AniKotoSeriesResponse {
  ok: boolean;
  data: {
    id: number;
    title: string;
    slug: string;
    poster: string;
    episodes: AniKotoEpisode[];
  };
}

export interface AniKotoRecentResponse {
  ok: boolean;
  data: AniKotoAnime[];
  pagination?: { page: number; per_page: number; total: number };
}

const memCache = new Map<string, { data: unknown; expiry: number }>();

async function anikotoFetch<T>(path: string, ttl = 5 * 60 * 1000): Promise<T> {
  const url = `${ANIKOTO_BASE}${path}`;
  const cached = memCache.get(url);
  if (cached && cached.expiry > Date.now()) return cached.data as T;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`AniKoto ${res.status}`);

      const data = await res.json();
      memCache.set(url, { data, expiry: Date.now() + ttl });
      return data;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        if (attempt < 2) { await new Promise((r) => setTimeout(r, 1500)); continue; }
      }
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw new Error("AniKoto API failed");
}

export async function getRecentAnime(page = 1, perPage = 20) {
  const res = await anikotoFetch<AniKotoRecentResponse>(
    `/recent-anime?page=${page}&per_page=${perPage}`
  );
  return res.data || [];
}

export async function getSeries(id: number) {
  const res = await anikotoFetch<AniKotoSeriesResponse>(`/series/${id}`, 30 * 60 * 1000);
  return res.data;
}

export async function searchAnimeAniKoto(query: string) {
  const all = await getRecentAnime(1, 50);
  if (!query) return all;
  const q = query.toLowerCase();
  return all.filter(
    (a) =>
      a.title.toLowerCase().includes(q) ||
      a.alternative?.toLowerCase().includes(q) ||
      a.titles?.toLowerCase().includes(q) ||
      a.mal_id === query
  );
}

export async function findSeriesByMalId(malId: number): Promise<AniKotoAnime | null> {
  const all = await getRecentAnime(1, 100);
  return all.find((a) => a.mal_id === String(malId)) || null;
}

export function getMegaPlayUrl(episodeId: number, language: "sub" | "dub" = "sub") {
  return `https://megaplay.buzz/stream/s-2/${episodeId}/${language}`;
}

export function getMegaPlayUrlByMal(malId: number, episode: number, language: "sub" | "dub" = "sub") {
  return `https://megaplay.buzz/stream/mal/${malId}/${episode}/${language}`;
}

export function getMegaPlayUrlByAniList(aniId: number, episode: number, language: "sub" | "dub" = "sub") {
  return `https://megaplay.buzz/stream/ani/${aniId}/${episode}/${language}`;
}
