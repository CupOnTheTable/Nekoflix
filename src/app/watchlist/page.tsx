"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ListChecks,
  Grid3X3,
  List,
  Minus,
  Plus,
  Trash2,
  Star,
  ArrowUpDown,
  CheckSquare,
  Square,
  Search,
  Dices,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/anime/EmptyState";
import type { WatchlistEntry, WatchlistStatus, User } from "@/types";

const TABS: { key: WatchlistStatus; label: string }[] = [
  { key: "plan_to_watch", label: "Plan to Watch" },
  { key: "watching", label: "Watching" },
  { key: "completed", label: "Completed" },
  { key: "on_hold", label: "On Hold" },
  { key: "dropped", label: "Dropped" },
];

const SORT_OPTIONS = [
  { key: "addedAt", label: "Date Added" },
  { key: "title", label: "Title" },
  { key: "score", label: "Score" },
  { key: "progress", label: "Progress" },
] as const;

const STATUS_LABELS: Record<WatchlistStatus, string> = {
  plan_to_watch: "Plan to Watch",
  watching: "Watching",
  completed: "Completed",
  on_hold: "On Hold",
  dropped: "Dropped",
};

export default function WatchlistPage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<WatchlistEntry[]>([]);
  const [activeTab, setActiveTab] = useState<WatchlistStatus>("plan_to_watch");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<string>("addedAt");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set());
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        setUser(data.user);
        if (data.user) {
          fetchWatchlist();
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchWatchlist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/watchlist");
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const tabCounts = useMemo(() => {
    const counts: Record<WatchlistStatus, number> = {
      plan_to_watch: 0,
      watching: 0,
      completed: 0,
      on_hold: 0,
      dropped: 0,
    };
    for (const item of items) {
      counts[item.status]++;
    }
    return counts;
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => item.status === activeTab);
  }, [items, activeTab]);

  const sortedItems = useMemo(() => {
    const copy = [...filteredItems];
    switch (sortBy) {
      case "title":
        return copy.sort((a, b) =>
          (a.anime?.title || "").localeCompare(b.anime?.title || "")
        );
      case "score":
        return copy.sort(
          (a, b) => (b.score || 0) - (a.score || 0)
        );
      case "progress":
        return copy.sort(
          (a, b) => b.progress - a.progress
        );
      case "addedAt":
      default:
        return copy.sort(
          (a, b) =>
            new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        );
    }
  }, [filteredItems, sortBy]);

  const updateItem = useCallback(
    async (id: string, updates: Partial<Pick<WatchlistEntry, "status" | "progress" | "score">>) => {
      setActionLoading((prev) => new Set(prev).add(id));
      try {
        const res = await fetch("/api/watchlist", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, ...updates }),
        });
        if (res.ok) {
          const data = await res.json();
          setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...data.item } : item))
          );
        }
      } catch {
        // silent
      } finally {
        setActionLoading((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    []
  );

  const removeItem = useCallback(async (id: string) => {
    setActionLoading((prev) => new Set(prev).add(id));
    try {
      const res = await fetch("/api/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch {
      // silent
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, []);

  const bulkUpdateStatus = useCallback(
    async (newStatus: WatchlistStatus) => {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        await updateItem(id, { status: newStatus });
      }
      setSelectedIds(new Set());
    },
    [selectedIds, updateItem]
  );

  const bulkRemove = useCallback(async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await removeItem(id);
    }
    setSelectedIds(new Set());
  }, [selectedIds, removeItem]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === sortedItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedItems.map((i) => i.id)));
    }
  }, [selectedIds, sortedItems]);

  const renderStars = useCallback(
    (entry: WatchlistEntry) => {
      const score = entry.score || 0;
      return (
        <div className="flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => {
            const filled = score >= (i + 1) * 2;
            const halfFilled = !filled && score >= i * 2 + 1;
            return (
              <button
                key={i}
                type="button"
                onClick={() =>
                  updateItem(entry.id, {
                    score: filled && !halfFilled ? i * 2 : (i + 1) * 2,
                  })
                }
                className="relative h-4 w-4 cursor-pointer"
                aria-label={`Rate ${i * 2 + 1}`}
              >
                <Star
                  className={cn(
                    "absolute inset-0 h-4 w-4",
                    filled
                      ? "fill-yellow-400 text-yellow-400"
                      : halfFilled
                        ? "text-yellow-400"
                        : "text-zinc-600"
                  )}
                />
                {halfFilled && (
                  <span className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      );
    },
    [updateItem]
  );

  if (!user && !loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-3 inline-flex items-center justify-center rounded-2xl bg-purple-500/10 p-3">
            <ListChecks className="h-8 w-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">My Watchlist</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Track and manage the anime you want to watch.
          </p>
        </div>

        <EmptyState
          icon={<ListChecks className="h-12 w-12" />}
          title="Sign in to access your watchlist"
          description="Create an account or sign in to start tracking your anime journey."
          actionLabel="Sign In"
          onAction={() => (window.location.href = "/login")}
        />

        <div className="mt-12 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-center text-sm font-medium text-zinc-500">
            Preview — what your watchlist will look like
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900"
              >
                <div className="aspect-[3/4] bg-zinc-800 rounded-t-xl" />
                <div className="p-3 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-zinc-800" />
                  <div className="h-2 w-1/2 rounded bg-zinc-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center justify-center rounded-2xl bg-purple-500/10 p-3">
          <ListChecks className="h-8 w-8 text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">My Watchlist</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Track and manage the anime you want to watch.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setActiveTab(tab.key);
                setSelectedIds(new Set());
              }}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300 border border-zinc-800"
              )}
              aria-pressed={activeTab === tab.key}
            >
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                  activeTab === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-zinc-800 text-zinc-500"
                )}
              >
                {tabCounts[tab.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-1 rounded-lg border border-zinc-700 bg-zinc-900 p-1">
              <select
                value=""
                onChange={(e) => {
                  const val = e.target.value as WatchlistStatus;
                  if (val) bulkUpdateStatus(val);
                }}
                className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300 border-0 focus:ring-0"
                defaultValue=""
              >
                <option value="" disabled>
                  Move to...
                </option>
                {TABS.filter((t) => t.key !== activeTab).map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={bulkRemove}
                className="rounded-md p-1 text-red-400 hover:bg-red-500/20 transition-colors"
                aria-label="Remove selected"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <span className="px-1 text-[10px] text-zinc-500">
                {selectedIds.size} selected
              </span>
            </div>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowSortMenu((p) => !p)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-300 transition-colors"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
              {SORT_OPTIONS.find((o) => o.key === sortBy)?.label}
            </button>
            {showSortMenu && (
              <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => {
                      setSortBy(opt.key);
                      setShowSortMenu(false);
                    }}
                    className={cn(
                      "w-full px-3 py-2 text-left text-xs font-medium transition-colors",
                      sortBy === opt.key
                        ? "bg-purple-500/20 text-purple-300"
                        : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-300"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex rounded-lg border border-zinc-700 bg-zinc-900 p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                viewMode === "grid"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
              aria-label="Grid view"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={cn(
                "rounded-md p-1.5 transition-colors",
                viewMode === "list"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showSortMenu && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setShowSortMenu(false)}
          aria-hidden="true"
        />
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-xl border border-zinc-800 bg-zinc-900">
              <div className="aspect-[3/4] bg-zinc-800 rounded-t-xl" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-3/4 rounded bg-zinc-800" />
                <div className="h-2 w-1/2 rounded bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>
      ) : sortedItems.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-12 w-12" />}
          title={`Nothing in ${STATUS_LABELS[activeTab]}`}
          description="Start building your watchlist by searching or picking random anime."
          actionLabel="Explore Anime"
          onAction={() => (window.location.href = "/search")}
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedItems.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "group relative overflow-hidden rounded-xl border bg-zinc-900 transition-all",
                selectedIds.has(entry.id)
                  ? "border-purple-500 ring-1 ring-purple-500/30"
                  : "border-zinc-800 hover:border-zinc-700"
              )}
            >
              <button
                type="button"
                onClick={() => toggleSelect(entry.id)}
                className="absolute left-2 top-2 z-10 rounded-md bg-black/60 p-1 text-zinc-400 backdrop-blur-sm transition-colors hover:text-white"
                aria-label={selectedIds.has(entry.id) ? "Deselect" : "Select"}
              >
                {selectedIds.has(entry.id) ? (
                  <CheckSquare className="h-4 w-4 text-purple-400" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>

              {entry.anime && (
                <Link
                  href={`/anime/${entry.anime.id}`}
                  className="block"
                >
                  <div className="relative aspect-[3/4] overflow-hidden bg-zinc-800">
                    <Image
                      src={entry.anime.coverImage}
                      alt={entry.anime.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-sm font-semibold text-white line-clamp-1">
                        {entry.anime.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              )}

              <div className="p-3 space-y-3">
                <div className="flex flex-wrap gap-1">
                  {entry.anime?.genres.slice(0, 3).map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-700"
                    >
                      {genre}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Progress</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        updateItem(entry.id, {
                          progress: Math.max(0, entry.progress - 1),
                        })
                      }
                      disabled={entry.progress <= 0 || actionLoading.has(entry.id)}
                      className="rounded-md bg-zinc-800 p-0.5 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                      aria-label="Decrease progress"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[50px] text-center text-xs font-medium text-zinc-300">
                      {entry.progress} / {entry.anime?.episodes || "?"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateItem(entry.id, {
                          progress: entry.progress + 1,
                        })
                      }
                      disabled={
                        (entry.anime?.episodes
                          ? entry.progress >= entry.anime.episodes
                          : false) || actionLoading.has(entry.id)
                      }
                      className="rounded-md bg-zinc-800 p-0.5 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                      aria-label="Increase progress"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Score</span>
                  {renderStars(entry)}
                </div>

                <div className="flex items-center justify-between">
                  <select
                    value={entry.status}
                    onChange={(e) =>
                      updateItem(entry.id, {
                        status: e.target.value as WatchlistStatus,
                      })
                    }
                    className="rounded-md bg-zinc-800 px-2 py-1 text-[11px] text-zinc-300 border border-zinc-700 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                    disabled={actionLoading.has(entry.id)}
                  >
                    {TABS.map((tab) => (
                      <option key={tab.key} value={tab.key}>
                        {tab.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => removeItem(entry.id)}
                    disabled={actionLoading.has(entry.id)}
                    className="rounded-md p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-colors"
                    aria-label={`Remove ${entry.anime?.title || "anime"} from watchlist`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {sortedItems.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "group flex items-center gap-4 rounded-xl border bg-zinc-900 p-3 transition-all",
                selectedIds.has(entry.id)
                  ? "border-purple-500 ring-1 ring-purple-500/30"
                  : "border-zinc-800 hover:border-zinc-700"
              )}
            >
              <button
                type="button"
                onClick={() => toggleSelect(entry.id)}
                className="shrink-0 rounded-md p-1 text-zinc-400 hover:text-white transition-colors"
                aria-label={selectedIds.has(entry.id) ? "Deselect" : "Select"}
              >
                {selectedIds.has(entry.id) ? (
                  <CheckSquare className="h-4 w-4 text-purple-400" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
              </button>

              {entry.anime && (
                <Link
                  href={`/anime/${entry.anime.id}`}
                  className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-zinc-800"
                >
                  <Image
                    src={entry.anime.coverImage}
                    alt={entry.anime.title}
                    fill
                    sizes="48px"
                    className="object-cover"
                  />
                </Link>
              )}

              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-medium text-zinc-100">
                  {entry.anime?.title || "Unknown"}
                </h3>
                <div className="mt-1 flex flex-wrap gap-1">
                  {entry.anime?.genres.slice(0, 3).map((genre) => (
                    <span
                      key={genre}
                      className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              </div>

              <div className="hidden shrink-0 items-center gap-3 sm:flex">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateItem(entry.id, {
                        progress: Math.max(0, entry.progress - 1),
                      })
                    }
                    disabled={entry.progress <= 0 || actionLoading.has(entry.id)}
                    className="rounded-md bg-zinc-800 p-0.5 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                    aria-label="Decrease progress"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-[50px] text-center text-xs text-zinc-400">
                    {entry.progress}/{entry.anime?.episodes || "?"}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateItem(entry.id, {
                        progress: entry.progress + 1,
                      })
                    }
                    disabled={
                      (entry.anime?.episodes
                        ? entry.progress >= entry.anime.episodes
                        : false) || actionLoading.has(entry.id)
                    }
                    className="rounded-md bg-zinc-800 p-0.5 text-zinc-400 hover:text-white disabled:opacity-30 transition-colors"
                    aria-label="Increase progress"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>

                {renderStars(entry)}

                <select
                  value={entry.status}
                  onChange={(e) =>
                    updateItem(entry.id, {
                      status: e.target.value as WatchlistStatus,
                    })
                  }
                  className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300 border border-zinc-700 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                  disabled={actionLoading.has(entry.id)}
                >
                  {TABS.map((tab) => (
                    <option key={tab.key} value={tab.key}>
                      {tab.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => removeItem(entry.id)}
                disabled={actionLoading.has(entry.id)}
                className="shrink-0 rounded-md p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 disabled:opacity-30 transition-colors"
                aria-label={`Remove ${entry.anime?.title || "anime"}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
