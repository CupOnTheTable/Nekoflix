import type { Anime } from "@/types";
import { prisma } from "@/lib/prisma";

const ANILIST_URL = "https://graphql.anilist.co";
const JIKAN_BASE = "https://api.jikan.moe/v4";

const scheduleCache = new Map<string, { data: Anime[]; ts: number }>();
const SCHEDULE_TTL = 24 * 60 * 60 * 1000;

interface AniListMedia {
  id: number;
  idMal: number | null;
  title: { romaji: string; english: string | null; native: string | null };
  coverImage: { large: string; medium: string };
  bannerImage: string | null;
  description: string | null;
  averageScore: number | null;
  episodes: number | null;
  status: string;
  format: string;
  genres: string[];
  studios: { nodes: { name: string }[] };
  startDate: { year: number | null; month: number | null; day: number | null };
  season: string | null;
  seasonYear: number | null;
  nextAiringEpisode: { episode: number; airingAt: number } | null;
  duration: number | null;
  characters?: {
    edges: {
      node: { id: number; name: { full: string }; image: { large: string | null } | null };
      role: string;
      voiceActors: { name: { full: string }; image: { large: string | null } | null; language: string }[];
    }[];
  };
  recommendations?: {
    edges: {
      node: { mediaRecommendation: AniListMedia };
    }[];
  };
  relations?: {
    edges: {
      node: { id: number; title: { romaji: string; english: string | null }; coverImage: { large: string } | null; format: string | null; status: string | null };
      relationType: string;
    }[];
  };
}

interface AniListResponse {
  data: {
    Page: {
      media: AniListMedia[];
      pageInfo: { total: number; lastPage: number; hasNextPage: boolean };
    };
  };
}

interface AniListSingleResponse {
  data: { Media: AniListMedia };
}

const memCache = new Map<string, { data: unknown; expiry: number }>();
const MEM_TTL = 5 * 60 * 1000;
const DB_TTL = 60 * 60 * 1000;

async function getCached<T>(key: string): Promise<T | null> {
  const mem = memCache.get(key);
  if (mem && mem.expiry > Date.now()) return mem.data as T;
  try {
    const row = await prisma.apiCache.findUnique({ where: { key } });
    if (row && row.expiresAt > new Date()) {
      const data = JSON.parse(row.data) as T;
      memCache.set(key, { data, expiry: Date.now() + MEM_TTL });
      return data;
    }
    if (row) await prisma.apiCache.delete({ where: { key } });
  } catch {}
  return null;
}

async function setCached(key: string, data: unknown): Promise<void> {
  memCache.set(key, { data, expiry: Date.now() + MEM_TTL });
  try {
    await prisma.apiCache.upsert({
      where: { key },
      update: { data: JSON.stringify(data), expiresAt: new Date(Date.now() + DB_TTL) },
      create: { key, data: JSON.stringify(data), expiresAt: new Date(Date.now() + DB_TTL) },
    });
  } catch {}
}

async function anilistQuery<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const cleanVars = Object.fromEntries(
    Object.entries(variables).filter(([, v]) => v !== undefined && v !== null)
  );
  const cacheKey = `anilist:${JSON.stringify({ query: query.slice(0, 100), vars: cleanVars })}`;
  const cached = await getCached<T>(cacheKey);
  if (cached) return cached;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables: cleanVars }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`AniList ${res.status}: ${errBody}`);
      }

      const json = await res.json();
      await setCached(cacheKey, json);
      return json;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        if (attempt < 2) { await new Promise((r) => setTimeout(r, 1000)); continue; }
      }
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("AniList API failed");
}

function mapAnilistToAnime(m: AniListMedia): Anime {
  let status: "Airing" | "Finished" | "Upcoming" = "Finished";
  if (m.status === "RELEASING") status = "Airing";
  else if (m.status === "NOT_YET_RELEASED") status = "Upcoming";

  let format: "TV" | "Movie" | "OVA" | "ONA" | "Special" = "TV";
  const f = m.format?.toUpperCase();
  if (f === "MOVIE") format = "Movie";
  else if (f === "OVA") format = "OVA";
  else if (f === "ONA") format = "ONA";
  else if (f === "SPECIAL" || f === "SPECIALS") format = "Special";

  const season: "Winter" | "Spring" | "Summer" | "Fall" =
    m.season === "SPRING" ? "Spring"
    : m.season === "SUMMER" ? "Summer"
    : m.season === "FALL" ? "Fall"
    : "Winter";

  const broadcastDay = m.nextAiringEpisode?.airingAt
    ? new Date(m.nextAiringEpisode.airingAt * 1000).toLocaleDateString("en-US", { weekday: "long" })
    : undefined;

  const broadcastTime = m.nextAiringEpisode?.airingAt
    ? new Date(m.nextAiringEpisode.airingAt * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tokyo" })
    : undefined;

  return {
    id: m.idMal || m.id,
    title: m.title.english || m.title.romaji,
    titleJapanese: m.title.native || undefined,
    coverImage: m.coverImage.large || m.coverImage.medium,
    backdropImage: m.bannerImage || (m.coverImage.large || m.coverImage.medium)?.replace("/medium/", "/large/").replace("/small/", "/large/"),
    synopsis: m.description?.replace(/<[^>]*>/g, "").slice(0, 500) || "No synopsis available.",
    score: m.averageScore ? m.averageScore / 10 : 0,
    episodes: m.episodes ?? 0,
    status,
    format,
    genres: m.genres || [],
    studios: m.studios?.nodes?.map((s) => s.name) || [],
    releaseYear: m.startDate?.year || m.seasonYear || new Date().getFullYear(),
    season,
    subbed: true,
    dubbed: status === "Finished",
    episodeCount: m.episodes ?? 0,
    broadcastDay,
    broadcastTime,
    duration: m.duration || undefined,
    characters: m.characters?.edges?.map((e) => ({
      id: e.node.id,
      name: e.node.name.full,
      image: e.node.image?.large || null,
      role: e.role,
      voiceActor: e.voiceActors?.[0] ? {
        name: e.voiceActors[0].name.full,
        image: e.voiceActors[0].image?.large || null,
      } : undefined,
    })),
    recommendations: m.recommendations?.edges?.map((e) => ({
      id: e.node.mediaRecommendation.idMal || e.node.mediaRecommendation.id,
      title: e.node.mediaRecommendation.title.english || e.node.mediaRecommendation.title.romaji,
      coverImage: e.node.mediaRecommendation.coverImage.large,
      score: e.node.mediaRecommendation.averageScore ? e.node.mediaRecommendation.averageScore / 10 : 0,
      format: e.node.mediaRecommendation.format || "TV",
      status: e.node.mediaRecommendation.status || "FINISHED",
    })),
  };
}

export async function fetchAnimeSearch(query: string, filters?: {
  genres?: string[];
  status?: string[];
  format?: string[];
  yearFrom?: number;
  yearTo?: number;
  order_by?: string;
  sort?: string;
  page?: number;
  limit?: number;
}) {
  try {
    return await fetchAnimeSearchAniList(query, filters);
  } catch {
    try {
      return await fetchAnimeSearchJikan(query, filters);
    } catch {
      try {
        return await fetchAnimeSearchAniKoto(query, filters);
      } catch {
        return { data: [], total: 0, hasNext: false };
      }
    }
  }
}

async function fetchAnimeSearchAniKoto(query: string, filters?: {
  genres?: string[];
  status?: string[];
  format?: string[];
  yearFrom?: number;
  yearTo?: number;
  sort?: string;
  page?: number;
  limit?: number;
}) {
  const { getRecentAnime } = await import("./anikoto");
  const all = await getRecentAnime(filters?.page || 1, filters?.limit || 50);
  let results = all.map((a): Anime => ({
    id: parseInt(a.mal_id) || a.id,
    title: a.title,
    coverImage: a.poster,
    backdropImage: a.background_image || a.poster,
    synopsis: a.description || "No synopsis available.",
    score: parseFloat(a.score) || 0,
    episodes: parseInt(a.episodes) || 0,
    status: a.status === "Currently Airing" ? "Airing" : "Finished",
    format: "TV",
    genres: a.terms_by_type?.genre || [],
    studios: a.terms_by_type?.studios || [],
    releaseYear: a.year || new Date().getFullYear(),
    season: "Winter" as "Winter",
    subbed: true,
    dubbed: false,
    episodeCount: parseInt(a.episodes) || 0,
  }));
  if (query) {
    const q = query.toLowerCase();
    results = results.filter((a) => a.title.toLowerCase().includes(q));
  }
  return { data: results, total: results.length, hasNext: false };
}

async function fetchAnimeSearchJikan(query: string, filters?: {
  genres?: string[];
  status?: string[];
  format?: string[];
  yearFrom?: number;
  yearTo?: number;
  sort?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters?.page || 1;
  const limit = filters?.limit || 25;

  const jikanSortMap: Record<string, string> = {
    score: "score", popularity: "members", newest: "start_date", title_az: "title",
  };
  const orderBy = jikanSortMap[filters?.sort || ""] || "members";

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    order_by: orderBy,
    sort: "desc",
  });
  if (query) params.set("q", query);
  if (filters?.status?.length) {
    const s = filters.status[0];
    if (s === "Airing") params.set("status", "airing");
    else if (s === "Finished") params.set("status", "complete");
    else if (s === "Upcoming") params.set("status", "upcoming");
  }
  if (filters?.format?.length) params.set("type", filters.format[0].toLowerCase());
  if (filters?.genres?.length) params.set("genres", filters.genres.join(","));

  const res = await fetch(`${JIKAN_BASE}/anime?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Jikan ${res.status}`);
  const data = await res.json();

  const mapJikanToAnime = (m: Record<string, unknown>): Anime => {
    const images = m.images as Record<string, Record<string, string>> | undefined;
    const jpg = images?.jpg;
    const img = jpg?.large_image_url || jpg?.image_url || "";
    const genres = (m.genres as { name: string }[] || []).map((g) => g.name);
    const title = (m.title_english as string) || (m.title as string) || "";
    return {
      id: m.mal_id as number,
      title,
      titleJapanese: (m.title_japanese as string) || undefined,
      coverImage: img,
      backdropImage: img,
      synopsis: (m.synopsis as string)?.slice(0, 500) || "No synopsis available.",
      score: (m.score as number) || 0,
      episodes: (m.episodes as number) || 0,
      status: m.status === "Currently Airing" ? "Airing" : m.status === "Not yet aired" ? "Upcoming" : "Finished",
      format: (m.type as string) === "Movie" ? "Movie" : (m.type as string) === "OVA" ? "OVA" : (m.type as string) === "ONA" ? "ONA" : "TV",
      genres,
      studios: (m.studios as { name: string }[] || []).map((s) => s.name),
      releaseYear: (m.year as number) || (m.aired as { from?: string })?.from ? new Date((m.aired as { from: string }).from).getFullYear() : new Date().getFullYear(),
      season: "Winter" as "Winter" | "Spring" | "Summer" | "Fall",
      subbed: true,
      dubbed: false,
      episodeCount: (m.episodes as number) || 0,
    };
  };

  return {
    data: (data.data || []).map(mapJikanToAnime),
    total: data.pagination?.items?.total || 0,
    hasNext: data.pagination?.has_next_page || false,
  };
}

async function fetchAnimeSearchAniList(query: string, filters?: {
  genres?: string[];
  status?: string[];
  format?: string[];
  yearFrom?: number;
  yearTo?: number;
  order_by?: string;
  sort?: string;
  page?: number;
  limit?: number;
}) {
  const genreMap: Record<string, string> = {
    Action: "Action", Adventure: "Adventure", Comedy: "Comedy", Drama: "Drama",
    Fantasy: "Fantasy", Horror: "Horror", Mystery: "Mystery", Romance: "Romance",
    "Sci-Fi": "Sci-Fi", "Slice of Life": "Slice of Life", Sports: "Sports",
    Supernatural: "Supernatural", Thriller: "Thriller", Psychological: "Psychological",
    Seinen: "Seinen", Shounen: "Shounen", Shojo: "Shoujo",
  };

  const sortMap: Record<string, string> = {
    score: "SCORE_DESC", popularity: "POPULARITY_DESC", newest: "START_DATE_DESC",
    title_az: "TITLE_ROMAJI_ASC",
  };
  const sort = sortMap[filters?.sort || ""] || "POPULARITY_DESC";

  const variables: Record<string, unknown> = {
    search: query || undefined,
    page: filters?.page || 1,
    limit: filters?.limit || 25,
    sort: [sort],
  };

  if (filters?.status?.length) {
    const s = filters.status[0];
    if (s === "Airing") variables.status = "RELEASING";
    else if (s === "Finished") variables.status = "FINISHED";
    else if (s === "Upcoming") variables.status = "NOT_YET_RELEASED";
  }

  const SIMPLE_QUERY = `
  query ($search: String, $page: Int, $limit: Int, $status: MediaStatus, $sort: [MediaSort]) {
    Page(page: $page, perPage: $limit) {
      media(search: $search, type: ANIME, status: $status, sort: $sort) {
        id idMal
        title { romaji english native }
        coverImage { large medium }
        bannerImage
        description(asHtml: false)
        averageScore episodes status format genres
        studios(isMain: true) { nodes { name } }
        startDate { year month day }
        season seasonYear
        nextAiringEpisode { episode airingAt }
      }
      pageInfo { total lastPage hasNextPage }
    }
  }`;

    const res = await anilistQuery<AniListResponse>(SIMPLE_QUERY, variables);
    const media = res.data.Page.media;
    return {
      data: media.map(mapAnilistToAnime),
      total: res.data.Page.pageInfo.total,
      hasNext: res.data.Page.pageInfo.hasNextPage,
    };
}

export async function fetchTopAnime(filter?: string, page = 1, limit = 10) {
  try {
    return await fetchTopAnimeAniList(filter, page, limit);
  } catch {
    try {
      return await fetchTopAnimeJikan(filter, page, limit);
    } catch {
      try {
        return await fetchTopAnimeAniKoto(limit);
      } catch {
        return [];
      }
    }
  }
}

async function fetchTopAnimeAniKoto(limit: number): Promise<Anime[]> {
  const { getRecentAnime } = await import("./anikoto");
  const all = await getRecentAnime(1, limit);
  return all.map((a): Anime => ({
    id: parseInt(a.mal_id) || a.id,
    title: a.title,
    coverImage: a.poster,
    backdropImage: a.background_image || a.poster,
    synopsis: a.description || "No synopsis available.",
    score: parseFloat(a.score) || 0,
    episodes: parseInt(a.episodes) || 0,
    status: a.status === "Currently Airing" ? "Airing" : "Finished",
    format: "TV",
    genres: a.terms_by_type?.genre || [],
    studios: a.terms_by_type?.studios || [],
    releaseYear: a.year || new Date().getFullYear(),
    season: "Winter" as "Winter",
    subbed: true,
    dubbed: false,
    episodeCount: parseInt(a.episodes) || 0,
  }));
}

async function fetchTopAnimeJikan(filter?: string, page = 1, limit = 10) {
  let endpoint = "top/anime";
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (filter === "airing") { endpoint = "anime"; params.set("status", "airing"); params.set("order_by", "score"); params.set("sort", "desc"); }
  else if (filter === "upcoming") { endpoint = "anime"; params.set("status", "upcoming"); }
  else if (filter === "bypopularity") { endpoint = "anime"; params.set("order_by", "members"); params.set("sort", "desc"); }

  const res = await fetch(`${JIKAN_BASE}/${endpoint}?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Jikan ${res.status}`);
  const data = await res.json();

  return (data.data || []).map((m: Record<string, unknown>): Anime => {
    const images = m.images as Record<string, Record<string, string>> | undefined;
    const jpg = images?.jpg;
    const img = jpg?.large_image_url || jpg?.image_url || "";
    const genres = (m.genres as { name: string }[] || []).map((g) => g.name);
    return {
      id: m.mal_id as number,
      title: (m.title_english as string) || (m.title as string) || "",
      titleJapanese: (m.title_japanese as string) || undefined,
      coverImage: img,
      backdropImage: img,
      synopsis: (m.synopsis as string)?.slice(0, 500) || "No synopsis available.",
      score: (m.score as number) || 0,
      episodes: (m.episodes as number) || 0,
      status: m.status === "Currently Airing" ? "Airing" : m.status === "Not yet aired" ? "Upcoming" : "Finished",
      format: (m.type as string) === "Movie" ? "Movie" : (m.type as string) === "OVA" ? "OVA" : (m.type as string) === "ONA" ? "ONA" : "TV",
      genres,
      studios: (m.studios as { name: string }[] || []).map((s) => s.name),
      releaseYear: (m.year as number) || new Date().getFullYear(),
      season: "Winter" as "Winter" | "Spring" | "Summer" | "Fall",
      subbed: true,
      dubbed: false,
      episodeCount: (m.episodes as number) || 0,
    };
  });
}

async function fetchTopAnimeAniList(filter?: string, page = 1, limit = 10) {
  let sort = "POPULARITY_DESC";
  let status: string | undefined;
  if (filter === "airing") { status = "RELEASING"; sort = "SCORE_DESC"; }
  else if (filter === "upcoming") { status = "NOT_YET_RELEASED"; }
  else if (filter === "bypopularity") { sort = "POPULARITY_DESC"; }

  const variables: Record<string, unknown> = {
    page, limit, sort: [sort], status,
  };

  const TOP_QUERY = `
  query ($page: Int, $limit: Int, $sort: [MediaSort], $status: MediaStatus) {
    Page(page: $page, perPage: $limit) {
      media(type: ANIME, status: $status, sort: $sort) {
        id idMal
        title { romaji english native }
        coverImage { large medium }
        bannerImage
        description(asHtml: false)
        averageScore episodes status format genres
        studios(isMain: true) { nodes { name } }
        startDate { year month day }
        season seasonYear
        nextAiringEpisode { episode airingAt }
      }
      pageInfo { total lastPage hasNextPage }
    }
  }`;

    const res = await anilistQuery<AniListResponse>(TOP_QUERY, variables);
    return res.data.Page.media.map(mapAnilistToAnime);
}

export async function fetchAnimeById(id: number) {
  const BY_ID_QUERY = `
  query ($idMal: Int) {
    Media(idMal: $idMal, type: ANIME) {
      id idMal
      title { romaji english native }
      coverImage { large medium }
      bannerImage
      description(asHtml: false)
      averageScore episodes status format genres duration
      studios(isMain: true) { nodes { name } }
      startDate { year month day }
      season seasonYear
      nextAiringEpisode { episode airingAt }
      characters(sort: ROLE, perPage: 12) {
        edges {
          node { id name { full } image { large } }
          role
          voiceActors(language: JAPANESE) { name { full } image { large } language }
        }
      }
      recommendations(perPage: 8, sort: RATING_DESC) {
        edges {
          node {
            mediaRecommendation {
              id idMal
              title { romaji english }
              coverImage { large }
              averageScore format status
            }
          }
        }
      }
    }
  }`;

  try {
    const res = await anilistQuery<AniListSingleResponse>(BY_ID_QUERY, { idMal: id });
    return mapAnilistToAnime(res.data.Media);
  } catch {
    try {
      return await fetchAnimeByIdJikan(id);
    } catch {
      try {
        return await fetchAnimeByIdAniKoto(id);
      } catch {
        throw new Error("Anime not found");
      }
    }
  }
}

async function fetchAnimeByIdJikan(id: number): Promise<Anime> {
  const res = await fetch(`${JIKAN_BASE}/anime/${id}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Jikan ${res.status}`);
  const m = await res.json();
  const data = m.data;
  const images = data.images as Record<string, Record<string, string>> | undefined;
  const jpg = images?.jpg;
  const img = jpg?.large_image_url || jpg?.image_url || "";
  return {
    id: data.mal_id,
    title: data.title_english || data.title,
    titleJapanese: data.title_japanese || undefined,
    coverImage: img,
    backdropImage: img,
    synopsis: data.synopsis?.slice(0, 500) || "No synopsis available.",
    score: data.score || 0,
    episodes: data.episodes || 0,
    status: data.status === "Currently Airing" ? "Airing" : data.status === "Not yet aired" ? "Upcoming" : "Finished",
    format: data.type === "Movie" ? "Movie" : data.type === "OVA" ? "OVA" : data.type === "ONA" ? "ONA" : "TV",
    genres: (data.genres || []).map((g: { name: string }) => g.name),
    studios: (data.studios || []).map((s: { name: string }) => s.name),
    releaseYear: data.year || new Date().getFullYear(),
    season: (data.season || "Winter") as "Winter" | "Spring" | "Summer" | "Fall",
    subbed: true,
    dubbed: false,
    episodeCount: data.episodes || 0,
    duration: parseInt(data.duration) || undefined,
    broadcastDay: data.broadcast?.day?.replace(/s$/, "") || undefined,
    broadcastTime: data.broadcast?.time || undefined,
  };
}

async function fetchAnimeByIdAniKoto(id: number): Promise<Anime> {
  const { getRecentAnime } = await import("./anikoto");
  const all = await getRecentAnime(1, 100);
  const match = all.find((a) => parseInt(a.mal_id) === id);
  if (!match) throw new Error("Not found on AniKoto");
  return {
    id: parseInt(match.mal_id) || match.id,
    title: match.title,
    coverImage: match.poster,
    backdropImage: match.background_image || match.poster,
    synopsis: match.description || "No synopsis available.",
    score: parseFloat(match.score) || 0,
    episodes: parseInt(match.episodes) || 0,
    status: match.status === "Currently Airing" ? "Airing" : "Finished",
    format: "TV",
    genres: match.terms_by_type?.genre || [],
    studios: match.terms_by_type?.studios || [],
    releaseYear: match.year || new Date().getFullYear(),
    season: "Winter" as "Winter",
    subbed: true,
    dubbed: false,
    episodeCount: parseInt(match.episodes) || 0,
  };
}

async function directAniListFetch<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const cleanVars = Object.fromEntries(
    Object.entries(variables).filter(([, v]) => v !== undefined && v !== null)
  );
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(ANILIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ query, variables: cleanVars }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.status === 429) {
        await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`AniList ${res.status}`);
      return await res.json();
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        if (attempt < 2) { await new Promise((r) => setTimeout(r, 1000)); continue; }
      }
      if (attempt === 2) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw new Error("AniList API failed");
}

export async function fetchSchedule(day?: string) {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const targetDay = day ? dayNames.findIndex(d => d.toLowerCase() === day.toLowerCase()) : -1;

  const cacheKey = "schedule_all_v2";
  const cached = scheduleCache.get(cacheKey);
  let media: Anime[];

  if (cached && Date.now() - cached.ts < SCHEDULE_TTL) {
    media = cached.data;
  } else {
    const SCHEDULE_QUERY = `
    query ($page: Int, $limit: Int) {
      Page(page: $page, perPage: $limit) {
        media(status: RELEASING, type: ANIME, sort: POPULARITY_DESC) {
          id idMal
          title { romaji english native }
          coverImage { large medium }
          averageScore episodes status format genres
          studios(isMain: true) { nodes { name } }
          startDate { year month day }
          season seasonYear
          nextAiringEpisode { episode airingAt }
          duration
        }
        pageInfo { total lastPage hasNextPage }
      }
    }`;

    try {
      const res = await directAniListFetch<AniListResponse>(SCHEDULE_QUERY, { page: 1, limit: 50 });
      media = res.data.Page.media.map(mapAnilistToAnime);
      scheduleCache.set(cacheKey, { data: media, ts: Date.now() });
    } catch {
      try {
        media = await fetchScheduleJikan();
        scheduleCache.set(cacheKey, { data: media, ts: Date.now() });
      } catch {
        try {
          media = await fetchScheduleAniKoto();
          scheduleCache.set(cacheKey, { data: media, ts: Date.now() });
        } catch {
          return [];
        }
      }
    }
  }

  if (targetDay !== -1) {
    return media.filter((a) => {
      if (!a.broadcastDay) return false;
      return a.broadcastDay.toLowerCase() === dayNames[targetDay].toLowerCase();
    });
  }

  return media;
}

async function fetchScheduleJikan(): Promise<Anime[]> {
  const res = await fetch(`${JIKAN_BASE}/seasons/now?page=1&limit=25`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Jikan ${res.status}`);
  const data = await res.json();

  return (data.data || []).map((m: Record<string, unknown>): Anime => {
    const images = m.images as Record<string, Record<string, string>> | undefined;
    const jpg = images?.jpg;
    const img = jpg?.large_image_url || jpg?.image_url || "";
    const genres = (m.genres as { name: string }[] || []).map((g) => g.name);
    const broadcast = m.broadcast as { day?: string; time?: string; timezone?: string } | undefined;
    const title = (m.title_english as string) || (m.title as string) || "";
    const dayName = broadcast?.day?.replace(/s$/, "") || "";
    const time = broadcast?.time || "";

    return {
      id: m.mal_id as number,
      title,
      titleJapanese: (m.title_japanese as string) || undefined,
      coverImage: img,
      backdropImage: img,
      synopsis: (m.synopsis as string)?.slice(0, 500) || "No synopsis available.",
      score: (m.score as number) || 0,
      episodes: (m.episodes as number) || 0,
      status: m.airing ? "Airing" : "Finished",
      format: (m.type as string) === "Movie" ? "Movie" : (m.type as string) === "OVA" ? "OVA" : (m.type as string) === "ONA" ? "ONA" : "TV",
      genres,
      studios: (m.studios as { name: string }[] || []).map((s) => s.name),
      releaseYear: (m.year as number) || new Date().getFullYear(),
      season: ((m.season as string) || "Winter") as "Winter" | "Spring" | "Summer" | "Fall",
      subbed: true,
      dubbed: false,
      episodeCount: (m.episodes as number) || 0,
      broadcastDay: dayName.charAt(0).toUpperCase() + dayName.slice(1),
      broadcastTime: time,
    };
  });
}

async function fetchScheduleAniKoto(): Promise<Anime[]> {
  const { getRecentAnime } = await import("./anikoto");
  const all = await getRecentAnime(1, 50);
  return all.map((a): Anime => ({
    id: parseInt(a.mal_id) || a.id,
    title: a.title,
    coverImage: a.poster,
    backdropImage: a.background_image || a.poster,
    synopsis: a.description || "No synopsis available.",
    score: parseFloat(a.score) || 0,
    episodes: parseInt(a.episodes) || 0,
    status: a.status === "Currently Airing" ? "Airing" : "Finished",
    format: "TV",
    genres: a.terms_by_type?.genre || [],
    studios: a.terms_by_type?.studios || [],
    releaseYear: a.year || new Date().getFullYear(),
    season: "Winter" as "Winter",
    subbed: true,
    dubbed: false,
    episodeCount: parseInt(a.episodes) || 0,
    broadcastDay: a.next_air_schedule_time
      ? new Date(a.next_air_schedule_time * 1000).toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Tokyo" })
      : undefined,
    broadcastTime: a.next_air_schedule_time
      ? new Date(a.next_air_schedule_time * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Tokyo" })
      : undefined,
  }));
}

export async function fetchRandomAnime() {
  const RANDOM_QUERY = `
  query ($page: Int, $limit: Int) {
    Page(page: $page, perPage: $limit) {
      media(type: ANIME, sort: RANDOM) {
        id idMal
        title { romaji english native }
        coverImage { large medium }
        bannerImage
        description(asHtml: false)
        averageScore episodes status format genres
        studios(isMain: true) { nodes { name } }
        startDate { year month day }
        season seasonYear
        nextAiringEpisode { episode airingAt }
      }
      pageInfo { total lastPage hasNextPage }
    }
  }`;

  try {
    const page = Math.floor(Math.random() * 5) + 1;
    const res = await anilistQuery<AniListResponse>(RANDOM_QUERY, { page, limit: 25 });
    const media = res.data.Page.media;
    if (media.length === 0) throw new Error("No random anime");
    return mapAnilistToAnime(media[Math.floor(Math.random() * media.length)]);
  } catch {
    const top = await fetchTopAnime(undefined, 1, 25);
    return top[Math.floor(Math.random() * top.length)];
  }
}

export async function searchSuggestions(query: string) {
  if (!query || query.length < 2) return [];
  const SUGGESTIONS_QUERY = `
  query ($search: String) {
    Page(page: 1, perPage: 8) {
      media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
        id idMal
        title { romaji english }
        coverImage { medium }
        averageScore
      }
    }
  }`;

  try {
    const res = await anilistQuery<AniListResponse>(SUGGESTIONS_QUERY, { search: query });
    return res.data.Page.media.map((m) => ({
      id: m.idMal || m.id,
      title: m.title.english || m.title.romaji,
      image: m.coverImage.medium,
      score: m.averageScore ? m.averageScore / 10 : 0,
    }));
  } catch {
    return [];
  }
}
