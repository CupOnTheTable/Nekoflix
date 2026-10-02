import type { Anime } from "@/types";
import {
  fetchAnimeById,
  fetchAnimeSearch,
  fetchRandomAnime,
  fetchSchedule,
  fetchTopAnime,
} from "./jikan";

export type { Anime };

const REVALIDATE_SECONDS = 300;

function withFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return fn().catch(() => fallback);
}

export async function getTrendingAnime(limit = 10): Promise<Anime[]> {
  return withFallback(() => fetchTopAnime("bypopularity", 1, limit), []);
}

export async function getPopularThisSeason(limit = 10): Promise<Anime[]> {
  return withFallback(() => fetchTopAnime("airing", 1, limit), []);
}

export async function getTopRatedAnime(limit = 10): Promise<Anime[]> {
  return withFallback(() => fetchTopAnime(undefined, 1, limit), []);
}

export async function getUpcomingAnime(limit = 10): Promise<Anime[]> {
  return withFallback(
    () => fetchAnimeSearch("", { status: ["Upcoming"], limit }).then((r) => r.data),
    []
  );
}

export async function getScheduleForDay(dayOfWeek: string): Promise<Anime[]> {
  const dayMap: Record<string, string> = {
    Monday: "monday",
    Tuesday: "tuesday",
    Wednesday: "wednesday",
    Thursday: "thursday",
    Friday: "friday",
    Saturday: "saturday",
    Sunday: "sunday",
  };
  return withFallback(() => fetchSchedule(dayMap[dayOfWeek] || "monday"), []);
}

export async function getAnimeDetail(id: number): Promise<Anime | undefined> {
  return withFallback(() => fetchAnimeById(id), undefined);
}

export async function searchAnimeCatalog(
  query: string,
  page = 1,
  limit = 25
): Promise<{ data: Anime[]; hasNextPage: boolean }> {
  return withFallback(
    () => fetchAnimeSearch(query, { page, limit }).then((r) => ({ data: r.data, hasNextPage: r.hasNext })),
    { data: [], hasNextPage: false }
  );
}

export async function getRandomAnimeDetail(): Promise<Anime> {
  return withFallback(() => fetchRandomAnime(), undefined as unknown as Anime);
}

export { REVALIDATE_SECONDS };
