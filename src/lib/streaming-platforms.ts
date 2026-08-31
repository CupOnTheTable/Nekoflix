export const STREAMING_PLATFORMS = [
  { id: "crunchyroll", name: "Crunchyroll", color: "text-orange-500", bg: "bg-orange-500/10" },
  { id: "funimation", name: "Funimation", color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "hidive", name: "HIDIVE", color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { id: "netflix", name: "Netflix", color: "text-red-500", bg: "bg-red-500/10" },
  { id: "disneyplus", name: "Disney+", color: "text-blue-400", bg: "bg-blue-400/10" },
  { id: "prime", name: "Amazon Prime", color: "text-sky-400", bg: "bg-sky-400/10" },
  { id: "hulu", name: "Hulu", color: "text-green-500", bg: "bg-green-500/10" },
  { id: "museasia", name: "Muse Asia", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  { id: "animelog", name: "AnimeLog", color: "text-pink-400", bg: "bg-pink-400/10" },
  { id: "aniplus", name: "Aniplus", color: "text-purple-400", bg: "bg-purple-400/10" },
  { id: "wakanim", name: "Wakanim", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { id: "other", name: "Other", color: "text-zinc-400", bg: "bg-zinc-400/10" },
] as const;

export function getPlatform(id: string) {
  return STREAMING_PLATFORMS.find((p) => p.id === id) || STREAMING_PLATFORMS[STREAMING_PLATFORMS.length - 1];
}
