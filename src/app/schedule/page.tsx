"use client";

import { useState, useEffect, useMemo } from "react";
import { Calendar, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/anime/EmptyState";
import { ScheduleRow } from "@/components/anime/ScheduleRow";
import type { ScheduleEntry } from "@/components/anime/ScheduleRow";
import type { Anime } from "@/types";

const WEEKDAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

function getTimezoneOffsetMs(timezone: string, date: Date): number {
  const utcString = date.toLocaleString("en-US", { timeZone: "UTC" });
  const tzString = date.toLocaleString("en-US", { timeZone: timezone });
  const utcDate = new Date(utcString);
  const tzDate = new Date(tzString);
  return utcDate.getTime() - tzDate.getTime();
}

function getBroadcastTimestamp(dayName: string, time: string, timezone?: string): number | null {
  const tz = timezone || "Asia/Tokyo";
  const now = new Date();
  const targetDayIndex = WEEKDAY_FULL.indexOf(dayName);
  if (targetDayIndex === -1) return null;

  const currentDayIndex = now.getDay();
  let daysUntil = targetDayIndex - currentDayIndex;
  if (daysUntil < 0) daysUntil += 7;

  const targetLocal = new Date(now);
  targetLocal.setDate(now.getDate() + daysUntil);
  targetLocal.setHours(0, 0, 0, 0);

  const [hours, minutes] = time.split(":").map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(targetLocal);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value;
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  if (!year || !month || !day) return null;

  const naiveUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), hours, minutes);
  const offsetMs = getTimezoneOffsetMs(tz, new Date(naiveUtc));
  return Math.round((naiveUtc + offsetMs) / 1000);
}

function buildScheduleEntry(anime: Anime, selectedDayName: string): ScheduleEntry | null {
  const day = anime.broadcastDay || null;
  if (!day) return null;

  const time = anime.broadcastTime || "00:00";

  // Compute the timestamp for the current week's occurrence of the broadcast
  let airingAt = anime.airingAt || null;
  const computedAiringAt = getBroadcastTimestamp(day, time, anime.broadcastTimezone);

  if (computedAiringAt) {
    // Prefer computed broadcast time unless airingAt is within the next 24h
    // (helps with special/delayed episodes that AniList knows about)
    const now = Date.now() / 1000;
    if (!airingAt || airingAt < now - 24 * 3600 || airingAt > now + 7 * 24 * 3600) {
      airingAt = computedAiringAt;
    }
  }

  if (!airingAt) return null;

  return {
    id: anime.id,
    title: anime.title,
    coverImage: anime.coverImage,
    episodeNumber: anime.episodeCount,
    broadcastTime: time,
    broadcastDay: day,
    airingAt,
  };
}

interface HourGroup {
  hour: number | null;
  label: string;
  entries: ScheduleEntry[];
}

function groupByHour(entries: ScheduleEntry[]): HourGroup[] {
  const timed: Map<number, ScheduleEntry[]> = new Map();
  const untimed: ScheduleEntry[] = [];

  for (const entry of entries) {
    const h = parseInt(entry.broadcastTime.split(":")[0], 10);
    if (!Number.isFinite(h)) {
      untimed.push(entry);
      continue;
    }
    if (!timed.has(h)) timed.set(h, []);
    timed.get(h)!.push(entry);
  }

  const groups: HourGroup[] = Array.from(timed.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, entries]) => ({
      hour,
      label: `${String(hour).padStart(2, "0")} Uhr`,
      entries,
    }));

  if (untimed.length > 0) {
    groups.push({ hour: null, label: "TBA", entries: untimed });
  }

  return groups;
}

function parseBroadcastMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
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

  const selectedDayName = WEEKDAY_FULL[selectedDay];

  const sortedByTime = useMemo(() => {
    return allAnime
      .map((a) => buildScheduleEntry(a, selectedDayName))
      .filter((e): e is ScheduleEntry => e !== null && e.broadcastDay === selectedDayName)
      .sort((a, b) => parseBroadcastMinutes(a.broadcastTime) - parseBroadcastMinutes(b.broadcastTime));
  }, [allAnime, selectedDayName]);

  const hourGroups = useMemo(() => groupByHour(sortedByTime), [sortedByTime]);

  const quickNav = useMemo(() => {
    const yesterday = (todayIndex - 1 + 7) % 7;
    const tomorrow = (todayIndex + 1) % 7;
    return [
      { label: "Yesterday", dayIndex: yesterday },
      { label: "Today", dayIndex: todayIndex },
      { label: "Tomorrow", dayIndex: tomorrow },
    ];
  }, [todayIndex]);

  return (
    <div>
      <div className="mb-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted">
          Estimated airing times
        </div>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Schedule</h1>
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {quickNav.map(({ label, dayIndex }) => (
          <button
            key={label}
            type="button"
            onClick={() => setSelectedDay(dayIndex)}
            className={cn(
              "rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors",
              selectedDay === dayIndex
                ? "bg-accent/20 text-accent"
                : "bg-surface text-muted hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mb-6 flex items-end gap-1 overflow-x-auto pb-1">
        {WEEKDAY_FULL.map((day, index) => {
          const isSelected = index === selectedDay;
          const isToday = index === todayIndex;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(index)}
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
                {isToday ? `Today · ${formatDayLabel(index)}` : formatDayLabel(index)}
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
          title={`No anime airing on ${WEEKDAY_FULL[selectedDay]}s`}
          description="Check back later or browse other days."
        />
      ) : (
        <div className="space-y-3">
          {hourGroups.map((group) => (
            <details key={group.hour ?? "tba"} open className="group/h">
              <summary className="flex cursor-pointer list-none items-center gap-2 py-1 text-[13px] font-bold text-muted marker:hidden [&::-webkit-details-marker]:hidden">
                <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-open/h:rotate-90" />
                {group.label}
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
