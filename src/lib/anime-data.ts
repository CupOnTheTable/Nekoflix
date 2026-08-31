import type { Anime } from "@/types";
import {
  fetchTopAnime,
  fetchAnimeSearch,
  fetchAnimeById,
  fetchSchedule,
  fetchRandomAnime,
} from "./jikan";

export type { Anime };

export async function getAnimeById(id: number): Promise<Anime | undefined> {
  try {
    return await fetchAnimeById(id);
  } catch {
    return undefined;
  }
}

export async function getTrendingAnime(): Promise<Anime[]> {
  try {
    return await fetchTopAnime("bypopularity", 1, 10);
  } catch {
    return [];
  }
}

export async function getNewThisSeason(): Promise<Anime[]> {
  try {
    const airing = await fetchTopAnime("airing", 1, 8);
    if (airing.length >= 8) return airing;
    const upcoming = await fetchAnimeSearch("", { status: ["Upcoming"], limit: 8 - airing.length });
    return [...airing, ...upcoming.data];
  } catch {
    return [];
  }
}

export async function getTopRated(): Promise<Anime[]> {
  try {
    return await fetchTopAnime(undefined, 1, 10);
  } catch {
    return [];
  }
}

export async function getAiringToday(dayOfWeek: string): Promise<Anime[]> {
  try {
    const dayMap: Record<string, string> = {
      Monday: "monday",
      Tuesday: "tuesday",
      Wednesday: "wednesday",
      Thursday: "thursday",
      Friday: "friday",
      Saturday: "saturday",
      Sunday: "sunday",
    };
    return await fetchSchedule(dayMap[dayOfWeek] || "monday");
  } catch {
    return [];
  }
}

export async function searchAnime(
  query: string,
  filters?: {
    genres?: string[];
    status?: string[];
    format?: string[];
    yearFrom?: number;
    yearTo?: number;
    season?: string[];
    studios?: string[];
    minScore?: number;
    audio?: string;
    episodeFrom?: number;
    episodeTo?: number;
    sort?: string;
    page?: number;
  }
): Promise<Anime[]> {
  const genreMap: Record<string, number> = {
    Action: 1, Adventure: 2, Comedy: 4, Drama: 8, Ecchi: 9,
    Fantasy: 10, Horror: 14, Isekai: 62, Mecha: 18, Music: 19,
    Mystery: 7, Psychological: 40, Romance: 22, SciFi: 24,
    Seinen: 42, Shonen: 27, Shojo: 25, SliceofLife: 36,
    Sports: 30, Supernatural: 37, Thriller: 41,
  };

  const genreIds = filters?.genres
    ?.map((g) => genreMap[g.replace(/\s/g, "")])
    .filter((id): id is number => id !== undefined);

  let order_by: string | undefined;
  let sort: string | undefined;
  if (filters?.sort === "score") { order_by = "score"; sort = "desc"; }
  else if (filters?.sort === "newest") { order_by = "start_date"; sort = "desc"; }
  else if (filters?.sort === "oldest") { order_by = "start_date"; sort = "asc"; }
  else if (filters?.sort === "title_az") { order_by = "title"; sort = "asc"; }
  else { order_by = "members"; sort = "desc"; }

  try {
    const result = await fetchAnimeSearch(query, {
      genres: genreIds?.length ? genreIds.map(String) : undefined,
      status: filters?.status,
      format: filters?.format,
      yearFrom: filters?.yearFrom,
      yearTo: filters?.yearTo,
      order_by,
      sort,
      page: filters?.page || 1,
      limit: 25,
    });

    let results = result.data;

    if (filters?.episodeFrom !== undefined) {
      results = results.filter((a) => a.episodes >= filters.episodeFrom!);
    }
    if (filters?.episodeTo !== undefined) {
      results = results.filter((a) => a.episodes <= filters.episodeTo!);
    }
    if (filters?.audio === "sub") {
      results = results.filter((a) => a.subbed);
    } else if (filters?.audio === "dub") {
      results = results.filter((a) => a.dubbed);
    }
    if (filters?.season?.length) {
      results = results.filter((a) => filters.season!.includes(a.season));
    }

    return results;
  } catch {
    return [];
  }
}

export async function getRandomAnime(constraints?: {
  genres?: string[];
  minScore?: number;
  format?: string[];
  status?: string[];
}): Promise<Anime> {
  try {
    const genreMap: Record<string, number> = {
      Action: 1, Adventure: 2, Comedy: 4, Drama: 8, Ecchi: 9,
      Fantasy: 10, Horror: 14, Isekai: 62, Mecha: 18, Music: 19,
      Mystery: 7, Psychological: 40, Romance: 22, SciFi: 24,
      Seinen: 42, Shonen: 27, Shojo: 25, SliceofLife: 36,
      Sports: 30, Supernatural: 37, Thriller: 41,
    };

    const genreIds = constraints?.genres
      ?.map((g) => genreMap[g.replace(/\s/g, "")])
      .filter((id): id is number => id !== undefined);

    const params = new URLSearchParams();
    if (genreIds?.length) params.set("genres", genreIds.join(","));
    if (constraints?.minScore) params.set("min_score", String(constraints.minScore));
    if (constraints?.format?.length) params.set("type", constraints.format[0].toLowerCase());
    if (constraints?.status?.length) {
      const s = constraints.status[0];
      if (s === "Airing") params.set("status", "airing");
      else if (s === "Finished") params.set("status", "complete");
      else if (s === "Upcoming") params.set("status", "upcoming");
    }
    params.set("order_by", "score");
    params.set("sort", "desc");
    params.set("limit", "25");
    params.set("sfw", "true");

    const page = Math.floor(Math.random() * 3) + 1;
    params.set("page", String(page));

    const result = await fetchAnimeSearch("", {
      genres: genreIds?.length ? genreIds.map(String) : undefined,
      status: constraints?.status,
      format: constraints?.format,
      order_by: "score",
      sort: "desc",
      page,
      limit: 25,
    });

    if (result.data.length === 0) {
      return await fetchRandomAnime();
    }

    const idx = Math.floor(Math.random() * result.data.length);
    return result.data[idx];
  } catch {
    return await fetchRandomAnime();
  }
}
