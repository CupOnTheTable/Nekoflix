"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Calendar, Clock, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/anime/EmptyState";
import { ScheduleRow } from "@/components/anime/ScheduleRow";
import type { ScheduleEntry } from "@/components/anime/ScheduleRow";
import type { Anime } from "@/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const WEEKDAY_MAP: Record<string, string> = {
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
  Sun: "Sunday",
};

function getTodayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

function formatBroadcastTime(time: string | undefined): string {
  if (!time) return "TBA";
  const [h, m] = time.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function parseBroadcastMinutes(time: string | undefined): number {
  if (!time) return -1;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function buildScheduleEntry(anime: Anime): ScheduleEntry {
  return {
    id: anime.id,
    title: anime.title,
    coverImage: anime.coverImage,
    episodeNumber: anime.episodeCount,
    broadcastTime: anime.broadcastTime || "",
    broadcastDay: anime.broadcastDay || "",
    genres: anime.genres,
  };
}

export default function SchedulePage() {
  const todayIndex = useMemo(() => getTodayIndex(), []);
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [userWatchlistIds, setUserWatchlistIds] = useState<Set<number>>(new Set());
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  const [dayAnime, setDayAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const dayName = WEEKDAY_MAP[WEEKDAYS[selectedDay]];
    let cancelled = false;
    setLoading(true);
    fetch(`/api/schedule?day=${encodeURIComponent(dayName)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const all = data.anime || [];
        if (watchlistOnly && user) {
          setDayAnime(all.filter((a: Anime) => userWatchlistIds.has(a.id)));
        } else {
          setDayAnime(all);
        }
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setDayAnime([]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedDay, watchlistOnly]);

  useEffect(() => {
    if (!watchlistOnly || !user) return;
    fetch(`/api/schedule?day=${encodeURIComponent(WEEKDAY_MAP[WEEKDAYS[selectedDay]])}`)
      .then((r) => r.json())
      .then((data) => {
        const all = data.anime || [];
        setDayAnime(all.filter((a: Anime) => userWatchlistIds.has(a.id)));
      })
      .catch(() => {});
  }, [userWatchlistIds]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          fetch("/api/watchlist")
            .then((r) => r.json())
            .then((wData) => {
              if (wData.items) {
                setUserWatchlistIds(
                  new Set(wData.items.map((item: { animeId: number }) => item.animeId))
                );
              }
            })
            .catch(() => {});
        }
      })
      .catch(() => {});
  }, []);

  const sortedAnime = useMemo(() => {
    return [...dayAnime].sort((a, b) => {
      const minsA = parseBroadcastMinutes(a.broadcastTime);
      const minsB = parseBroadcastMinutes(b.broadcastTime);
      if (minsA === -1) return 1;
      if (minsB === -1) return -1;
      return minsA - minsB;
    });
  }, [dayAnime]);

  const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

  const { aired, upcoming } = useMemo(() => {
    const a: Anime[] = [];
    const u: Anime[] = [];
    for (const anime of sortedAnime) {
      const mins = parseBroadcastMinutes(anime.broadcastTime);
      if (selectedDay < todayIndex) {
        a.push(anime);
      } else if (selectedDay > todayIndex) {
        u.push(anime);
      } else if (mins === -1 || mins <= currentMinutes) {
        a.push(anime);
      } else {
        u.push(anime);
      }
    }
    return { aired: a, upcoming: u };
  }, [sortedAnime, currentMinutes, selectedDay, todayIndex, mounted]);

  const getTimePosition = useCallback(
    (time: string | undefined): number | null => {
      if (!time || !mounted) return null;
      const mins = parseBroadcastMinutes(time);
      if (mins === -1) return null;
      const startMinutes = aired.length > 0 ? 0 : parseBroadcastMinutes(upcoming[0]?.broadcastTime) || 0;
      const endMinutes =
        upcoming.length > 0
          ? parseBroadcastMinutes(upcoming[upcoming.length - 1]?.broadcastTime) || 1440
          : parseBroadcastMinutes(aired[aired.length - 1]?.broadcastTime) || 1440;
      const range = endMinutes - startMinutes || 1;
      return ((mins - startMinutes) / range) * 100;
    },
    [aired, upcoming, mounted]
  );

  const nowPosition = useMemo(() => {
    if (!mounted || sortedAnime.length === 0 || selectedDay !== todayIndex) return null;
    const allTimes = sortedAnime
      .map((a) => parseBroadcastMinutes(a.broadcastTime))
      .filter((m) => m !== -1);
    if (allTimes.length === 0) return null;
    const minTime = Math.min(...allTimes);
    const maxTime = Math.max(...allTimes);
    const range = maxTime - minTime || 1;
    return ((currentMinutes - minTime) / range) * 100;
  }, [sortedAnime, currentMinutes, mounted]);

  const timeLabel = mounted
    ? currentTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8 kuro-animate-in">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center justify-center rounded-2xl bg-blue-500/10 p-3">
          <Calendar className="h-8 w-8 text-blue-400" />
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Airing Schedule</h1>
            <p className="mt-2 text-sm text-zinc-400">
              Track when your favorite anime air each week.
            </p>
          </div>
          {user && (
            <button
              type="button"
              onClick={() => setWatchlistOnly((p) => !p)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all",
                watchlistOnly
                  ? "border-purple-500 bg-purple-500/20 text-purple-300"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
              )}
            >
              {watchlistOnly ? (
                <Eye className="h-4 w-4" />
              ) : (
                <EyeOff className="h-4 w-4" />
              )}
              {watchlistOnly ? "Watchlist Only" : "Show All"}
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 flex gap-1 overflow-x-auto pb-2 scrollbar-none">
        {WEEKDAYS.map((day, index) => {
          const isToday = index === todayIndex;
          const isSelected = index === selectedDay;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(index)}
              className={cn(
                "relative flex min-w-[60px] flex-col items-center gap-0.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                isSelected
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/25"
                  : "bg-surface text-muted hover:bg-surface-hover hover:text-foreground border border-border"
              )}
              aria-pressed={isSelected}
            >
              {isToday && (
                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-400" />
              )}
              <span className={cn(isToday && !isSelected ? "text-purple-400" : "")}>
                {day}
              </span>
            </button>
          );
        })}
      </div>

      {sortedAnime.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title={`No anime airing on ${WEEKDAYS[selectedDay]}s`}
          description={
            watchlistOnly
              ? "No watchlist titles air on this day. Try showing all titles."
              : "Check back later or browse other days."
          }
          actionLabel={watchlistOnly ? "Show All" : undefined}
          onAction={watchlistOnly ? () => setWatchlistOnly(false) : undefined}
        />
      ) : (
        <div className="space-y-6">
          {aired.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Already Aired
                </h2>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                  {aired.length}
                </span>
              </div>
              <div className="space-y-2">
                {aired.map((anime) => (
                  <ScheduleRow
                    key={anime.id}
                    entry={buildScheduleEntry(anime)}
                    isAired={true}
                  />
                ))}
              </div>
            </div>
          )}

          {aired.length > 0 && upcoming.length > 0 && (
            <div className="relative py-2">
              <div className="absolute inset-x-0 top-1/2 h-px bg-zinc-800" />
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-xs text-muted">
                  <Clock className="inline h-3 w-3 mr-1" />
                  {timeLabel}
                </span>
              </div>
            </div>
          )}

          {upcoming.length > 0 && (
            <div>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Upcoming
                </h2>
                <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                  {upcoming.length}
                </span>
              </div>
              <div className="relative space-y-2">
                {nowPosition !== null &&
                  nowPosition >= 0 &&
                  nowPosition <= 100 && (
                    <div
                      className="absolute left-0 right-0 z-10 h-0.5 bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]"
                      style={{ top: `${nowPosition}%` }}
                    >
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white whitespace-nowrap">
                        Now {timeLabel}
                      </span>
                    </div>
                  )}
                {upcoming.map((anime) => (
                  <ScheduleRow
                    key={anime.id}
                    entry={buildScheduleEntry(anime)}
                    isAired={false}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
