"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/anime/EmptyState";
import { ScheduleRow } from "@/components/anime/ScheduleRow";
import type { ScheduleEntry } from "@/components/anime/ScheduleRow";
import type { Anime } from "@/types";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const WEEKDAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function getTodayIndex(): number {
  const day = new Date().getDay();
  return day === 0 ? 6 : day - 1;
}

function getDayDate(dayIndex: number): Date {
  const today = new Date();
  const todayIdx = getTodayIndex();
  const diff = dayIndex - todayIdx;
  const d = new Date(today);
  d.setDate(d.getDate() + diff);
  return d;
}

function formatDayLabel(dayIndex: number): string {
  const date = getDayDate(dayIndex);
  const month = date.toLocaleString("en-US", { month: "long" });
  return `${month} ${date.getDate()}`;
}

function airingToLocalDay(airingAt: number): string {
  return WEEKDAY_FULL[new Date(airingAt * 1000).getDay()];
}

function airingToLocalTime(airingAt: number): string {
  const d = new Date(airingAt * 1000);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildScheduleEntry(anime: Anime): ScheduleEntry | null {
  if (!anime.airingAt) return null;
  return {
    id: anime.id,
    title: anime.title,
    coverImage: anime.coverImage,
    episodeNumber: anime.episodeCount,
    broadcastTime: airingToLocalTime(anime.airingAt),
    broadcastDay: airingToLocalDay(anime.airingAt),
  };
}

interface HourGroup {
  hour: number;
  entries: ScheduleEntry[];
}

function groupByHour(entries: ScheduleEntry[]): HourGroup[] {
  const map = new Map<number, ScheduleEntry[]>();
  for (const entry of entries) {
    const h = parseInt(entry.broadcastTime.split(":")[0], 10);
    if (!map.has(h)) map.set(h, []);
    map.get(h)!.push(entry);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, entries]) => ({ hour, entries }));
}

export default function SchedulePage() {
  const todayIndex = useMemo(() => getTodayIndex(), []);
  const [selectedDay, setSelectedDay] = useState(todayIndex);
  const [allAnime, setAllAnime] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch("/api/schedule")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setAllAnime(data.anime || []);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setAllAnime([]);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const selectedDayName = WEEKDAY_FULL[(selectedDay + 1) % 7];

  const sortedEntries = useMemo(() => {
    return allAnime
      .map(buildScheduleEntry)
      .filter((e): e is ScheduleEntry => e !== null && e.broadcastDay === selectedDayName);
  }, [allAnime, selectedDayName]);

  const sortedByTime = useMemo(() => {
    return [...sortedEntries].sort(
      (a, b) => parseBroadcastMinutes(a.broadcastTime) - parseBroadcastMinutes(b.broadcastTime)
    );
  }, [sortedEntries]);

  const hourGroups = useMemo(() => groupByHour(sortedByTime), [sortedByTime]);

  return (
    <div>
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">
          Estimated airing times
        </div>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Schedule</h1>
      </div>

      <div className="mb-6 flex items-end gap-1 overflow-x-auto pb-1">
        {WEEKDAYS.map((day, index) => {
          const isSelected = index === selectedDay;
          const isToday = index === todayIndex;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(index)}
              data-on={isSelected}
              className="group flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-colors hover:bg-surface-hover"
            >
              <span
                className={cn(
                  "whitespace-nowrap font-extrabold tracking-tight transition-all sm:text-base",
                  isSelected
                    ? "text-xl text-accent sm:text-2xl"
                    : "text-sm text-muted group-hover:text-foreground sm:text-base"
                )}
              >
                {day}
              </span>
              <span
                className={cn(
                  "text-[11px] tabular-nums",
                  isSelected
                    ? "text-muted"
                    : "text-transparent group-hover:text-muted"
                )}
              >
                {isToday ? `Today \u00B7 ${formatDayLabel(index)}` : formatDayLabel(index)}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-16 w-2/3 animate-pulse rounded-xl bg-surface" />
          <div className="h-14 animate-pulse rounded-lg bg-surface" />
          <div className="h-14 animate-pulse rounded-lg bg-surface" />
          <div className="h-14 animate-pulse rounded-lg bg-surface" />
          <div className="h-14 animate-pulse rounded-lg bg-surface" />
          <div className="h-14 animate-pulse rounded-lg bg-surface" />
        </div>
      ) : hourGroups.length === 0 ? (
        <EmptyState
          icon={<Calendar className="h-12 w-12" />}
          title={`No anime airing on ${WEEKDAYS[selectedDay]}s`}
          description="Check back later or browse other days."
        />
      ) : (
        <div className="space-y-3">
          {hourGroups.map((group) => (
            <details key={group.hour} open className="group/h">
              <summary className="flex cursor-pointer list-none items-center gap-2 py-1 text-[13px] font-bold text-muted marker:hidden [&::-webkit-details-marker]:hidden">
                <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-open/h:rotate-90" />
                {String(group.hour).padStart(2, "0")}:00
                <span className="text-[11px] font-semibold text-muted/60">
                  {group.entries.length}
                </span>
              </summary>
              <div className="mt-1 grid gap-1">
                {group.entries.map((entry) => (
                  <ScheduleRow key={entry.id} entry={entry} />
                ))}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

function parseBroadcastMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
