"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play } from "lucide-react";
import { timeUntil } from "@/lib/utils";

export interface ScheduleEntry {
  id: number;
  title: string;
  coverImage: string;
  episodeNumber: number;
  broadcastTime: string;
  broadcastDay: string;
}

export interface ScheduleRowProps {
  entry: ScheduleEntry;
  className?: string;
}

export function ScheduleRow({ entry, className }: ScheduleRowProps) {
  const [countdown, setCountdown] = useState(() => timeUntil(entry.broadcastTime));

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(timeUntil(entry.broadcastTime));
    }, 60000);
    return () => clearInterval(interval);
  }, [entry.broadcastTime]);

  return (
    <Link
      href={`/anime/${entry.id}`}
      className={`flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-surface-hover ${className ?? ""}`}
    >
      <span className="relative hidden h-12 w-9 shrink-0 overflow-hidden rounded-md bg-surface shadow-sm sm:block">
        <Image
          src={entry.coverImage}
          alt=""
          fill
          sizes="36px"
          className="object-cover"
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        />
      </span>

      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
        {entry.title}
      </span>

      <span className="hidden flex-shrink-0 text-xs font-semibold text-muted sm:block">
        {countdown}
      </span>

      <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
        <Play className="h-2.5 w-2.5 fill-current" />
        EP {entry.episodeNumber}
      </span>

      <span className="shrink-0 rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold tabular-nums text-muted">
        {entry.broadcastTime}
      </span>
    </Link>
  );
}
