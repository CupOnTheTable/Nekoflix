import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function debounce<T extends (...args: never[]) => unknown>(
  fn: T,
  ms: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function getScoreColor(score: number): string {
  if (score >= 8) return "text-green-400";
  if (score >= 6) return "text-yellow-400";
  if (score >= 4) return "text-orange-400";
  return "text-red-400";
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "Airing":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    case "Upcoming":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "Finished":
      return "bg-zinc-500/20 text-zinc-400 border-zinc-500/30";
    default:
      return "bg-zinc-500/20 text-zinc-400";
  }
}

export function timeUntil(dateStr: string): string {
  if (!dateStr) return "TBA";
  const now = new Date();
  let target: Date;

  if (/^\d{1,2}:\d{2}$/.test(dateStr)) {
    const [h, m] = dateStr.split(":").map(Number);
    target = new Date();
    target.setHours(h, m, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
  } else {
    target = new Date(dateStr);
    if (isNaN(target.getTime())) return "TBA";
  }

  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return "Aired";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  return `${hours}h ${minutes}m`;
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return "TBA";
  if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
    const [h, m] = timeStr.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  const d = new Date(timeStr);
  if (isNaN(d.getTime())) return "TBA";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
