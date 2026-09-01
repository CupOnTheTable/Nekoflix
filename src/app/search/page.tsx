"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import AnimeCard from "@/components/anime/AnimeCard";
import FilterPanel from "@/components/anime/FilterPanel";
import { EmptyState } from "@/components/anime/EmptyState";
import { cn, debounce } from "@/lib/utils";
import type { Anime, SearchFilters } from "@/types";

interface SearchResponse {
  anime: Anime[];
  total: number;
  page: number;
  totalPages: number;
}

function SkeletonCard() {
  return (
    <div className="flex flex-col gap-2">
      <Skeleton className="aspect-[3/4] w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4 rounded" />
      <Skeleton className="h-3 w-1/2 rounded" />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <nav
      className="flex items-center justify-center gap-1 pt-8"
      aria-label="Pagination"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </Button>
      {pages.map((page, i) =>
        page === "..." ? (
          <span key={`ellipsis-${i}`} className="px-2 text-zinc-600">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
              currentPage === page
                ? "bg-purple-600 text-white"
                : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
            )}
            aria-current={currentPage === page ? "page" : undefined}
          >
            {page}
          </button>
        )
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </Button>
    </nav>
  );
}

function filtersToSearchParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.genres?.length) params.set("genres", filters.genres.join(","));
  if (filters.status?.length) params.set("status", filters.status.join(","));
  if (filters.format?.length) params.set("format", filters.format.join(","));
  if (filters.season?.length) params.set("season", filters.season.join(","));
  if (filters.yearFrom) params.set("yearFrom", String(filters.yearFrom));
  if (filters.yearTo) params.set("yearTo", String(filters.yearTo));
  if (filters.minScore) params.set("minScore", String(filters.minScore));
  if (filters.audio) params.set("audio", filters.audio);
  if (filters.episodeFrom) params.set("episodeFrom", String(filters.episodeFrom));
  if (filters.episodeTo) params.set("episodeTo", String(filters.episodeTo));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params;
}

function searchParamsToFilters(params: URLSearchParams): SearchFilters {
  const filters: SearchFilters = {};
  const q = params.get("q");
  if (q) filters.q = q;
  const genres = params.get("genres");
  if (genres) filters.genres = genres.split(",");
  const status = params.get("status");
  if (status) filters.status = status.split(",");
  const format = params.get("format");
  if (format) filters.format = format.split(",");
  const season = params.get("season");
  if (season) filters.season = season.split(",");
  const yearFrom = params.get("yearFrom");
  if (yearFrom) filters.yearFrom = parseInt(yearFrom, 10);
  const yearTo = params.get("yearTo");
  if (yearTo) filters.yearTo = parseInt(yearTo, 10);
  const minScore = params.get("minScore");
  if (minScore) filters.minScore = parseFloat(minScore);
  const audio = params.get("audio");
  if (audio) filters.audio = audio;
  const episodeFrom = params.get("episodeFrom");
  if (episodeFrom) filters.episodeFrom = parseInt(episodeFrom, 10);
  const episodeTo = params.get("episodeTo");
  if (episodeTo) filters.episodeTo = parseInt(episodeTo, 10);
  const sort = params.get("sort");
  if (sort) filters.sort = sort;
  const page = params.get("page");
  if (page) filters.page = parseInt(page, 10);
  return filters;
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialFilters = useMemo(
    () => searchParamsToFilters(searchParams),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [searchInput, setSearchInput] = useState(initialFilters.q || "");
  const [results, setResults] = useState<Anime[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<{ id: number; title: string; image: string; score: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`/api/anime/suggestions?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    }
  }, []);

  const retryFetch = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const params = filtersToSearchParams(filters);
      const res = await fetch(`/api/anime?${params.toString()}`, {
        signal: controller.signal,
      });

      if (!res.ok) throw new Error("Failed to fetch results");

      const data: SearchResponse = await res.json();
      setResults(data.anime);
      setTotalResults(data.total);
      setTotalPages(data.totalPages);
      setError(null);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const params = filtersToSearchParams(filters);
        const res = await fetch(`/api/anime?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Failed to fetch results");

        const data: SearchResponse = await res.json();
        if (!cancelled) {
          setResults(data.anime);
          setTotalResults(data.total);
          setTotalPages(data.totalPages);
          setError(null);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (!cancelled) {
          setError("Something went wrong. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [filters]);

  useEffect(() => {
    const params = filtersToSearchParams(filters);
    const queryString = params.toString();
    const newPath = queryString ? `/search?${queryString}` : "/search";
    router.replace(newPath, { scroll: false });
  }, [filters, router]);

  const debouncedSearch = useMemo(
    () =>
      debounce((value: string) => {
        setFilters((prev) => ({ ...prev, q: value || undefined, page: 1 }));
      }, 250),
    []
  );

  const handleSearchInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchInput(value);
      debouncedSearch(value);

      if (suggestionTimerRef.current) clearTimeout(suggestionTimerRef.current);
      suggestionTimerRef.current = setTimeout(() => loadSuggestions(value), 150);
      setShowSuggestions(true);
    },
    [debouncedSearch, loadSuggestions]
  );

  const handleSelectSuggestion = useCallback((title: string) => {
    setSearchInput(title);
    setFilters((prev) => ({ ...prev, q: title, page: 1 }));
    setShowSuggestions(false);
    setSuggestions([]);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    setFilters((prev) => ({ ...prev, q: undefined, page: 1 }));
    setSuggestions([]);
    setShowSuggestions(false);
  }, []);

  const handleFilterChange = useCallback((newFilters: SearchFilters) => {
    setFilters(newFilters);
  }, []);

  const handlePageChange = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, page }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-8 lg:px-16 py-8">
        <div className="mb-8 space-y-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Browse Anime</h1>

          <div className="relative">
            <Input
              type="text"
              placeholder="Search anime by title..."
              value={searchInput}
              onChange={handleSearchInputChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              icon={<Search className="h-4 w-4" />}
              className="pr-10"
            />
            {searchInput && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors z-10"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl">
                {suggestions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSuggestion(s.title)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-700 transition-colors"
                  >
                    {s.image && (
                      <img src={s.image} alt="" className="h-8 w-6 rounded object-cover" />
                    )}
                    <span className="flex-1 text-sm text-zinc-200">{s.title}</span>
                    {s.score > 0 && (
                      <span className="text-xs text-yellow-500">{s.score}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <aside className="w-full lg:w-72 shrink-0">
            <FilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              resultCount={totalResults}
            />
          </aside>

          <main className="flex-1 min-w-0">
            {isLoading && results.length === 0 ? (
              <SkeletonGrid />
            ) : error && results.length === 0 ? (
              <EmptyState
                icon={<SlidersHorizontal className="h-10 w-10" />}
                title="Something went wrong"
                description={error}
                actionLabel="Try Again"
                onAction={() => retryFetch()}
              />
            ) : results.length === 0 ? (
              <EmptyState
                icon={<Search className="h-10 w-10" />}
                title="No anime found"
                description="Try adjusting your search or filters to find what you're looking for."
                actionLabel="Clear Filters"
                onAction={() => {
                  setFilters({ sort: "popularity", page: 1 });
                  setSearchInput("");
                }}
              />
            ) : (
              <>
                {isLoading && (
                  <div className="mb-4 h-0.5 w-full overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full w-1/3 animate-pulse rounded-full bg-purple-500" />
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 kuro-stagger">
                  {results.map((anime) => (
                    <AnimeCard key={anime.id} anime={anime} />
                  ))}
                </div>

                <Pagination
                  currentPage={filters.page || 1}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
