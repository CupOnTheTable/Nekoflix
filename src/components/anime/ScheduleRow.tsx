"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { timeUntil, formatTime } from "@/lib/utils";

export interface ScheduleEntry {
  id: number;
  title: string;
  coverImage: string;
  episodeNumber: number;
  broadcastTime: string;
  broadcastDay: string;
  genres: string[];
}

export interface ScheduleRowProps {
  entry: ScheduleEntry;
  isAired: boolean;
  className?: string;
}

export function ScheduleRow({
  entry,
  isAired,
  className,
}: ScheduleRowProps) {
  const [countdown, setCountdown] = useState(() => timeUntil(entry.broadcastTime));

  useEffect(() => {
    if (isAired) return;
    const interval = setInterval(() => {
      setCountdown(timeUntil(entry.broadcastTime));
    }, 60000);
    return () => clearInterval(interval);
  }, [entry.broadcastTime, isAired]);

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border p-3 transition-colors",
        isAired
          ? "border-zinc-800 bg-zinc-900/50 opacity-60"
          : "border-zinc-800 bg-zinc-900 hover:border-zinc-700",
        className
      )}
    >
      <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
        <Image
          src={entry.coverImage}
          alt={entry.title}
          fill
          sizes="48px"
          className="object-cover"
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        />
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="truncate text-sm font-medium text-zinc-100">
          {entry.title}
        </h4>
        <p className="mt-0.5 text-xs text-zinc-500">
          Episode {entry.episodeNumber}
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {entry.genres.slice(0, 3).map((genre) => (
            <Badge key={genre} variant="default" className="text-[10px]">
              {genre}
            </Badge>
          ))}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-xs text-zinc-500">{entry.broadcastDay}</p>
        <p className="mt-0.5 text-sm font-medium text-zinc-300">
          {formatTime(entry.broadcastTime)}
        </p>
        <Badge
          variant={isAired ? "success" : "info"}
          className="mt-2 text-[10px]"
        >
          {isAired ? "Aired" : countdown}
        </Badge>
      </div>
    </div>
  );
}
