"use client";

import { useState, useCallback } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALL_GENRES,
  ALL_STATUSES,
  ALL_FORMATS,
  ALL_SEASONS,
  SORT_OPTIONS,
} from "@/types";
import type { SearchFilters } from "@/types";

interface FilterPanelProps {
  filters: SearchFilters;
  onFilterChange: (filters: SearchFilters) => void;
  resultCount: number;
}

function FilterSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-zinc-800 last:border-b-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-3 text-sm font-medium text-zinc-200 hover:text-white transition-colors"
        aria-expanded={isOpen}
      >
        {title}
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-zinc-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        )}
      </button>
      {isOpen && <div className="pb-4">{children}</div>}
    </div>
  );
}

function ChipGroup({
  options,
  selected,
  onChange,
}: {
  options: readonly string[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => toggle(option)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200",
            "border",
            selected.includes(option)
              ? "bg-purple-600/20 border-purple-500/50 text-purple-300"
              : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
          )}
          aria-pressed={selected.includes(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default function FilterPanel({
  filters,
  onFilterChange,
  resultCount,
}: FilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = useCallback(
    <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
      onFilterChange({ ...filters, [key]: value, page: 1 });
    },
    [filters, onFilterChange]
  );

  const clearAll = useCallback(() => {
    onFilterChange({ sort: filters.sort, page: 1 });
  }, [filters.sort, onFilterChange]);

  const hasActiveFilters =
    (filters.genres && filters.genres.length > 0) ||
    (filters.status && filters.status.length > 0) ||
    (filters.format && filters.format.length > 0) ||
    (filters.season && filters.season.length > 0) ||
    filters.yearFrom ||
    filters.yearTo ||
    filters.minScore ||
    filters.audio ||
    filters.episodeFrom ||
    filters.episodeTo;

  const activeFilterCount = [
    filters.genres?.length || 0,
    filters.status?.length || 0,
    filters.format?.length || 0,
    filters.season?.length || 0,
    filters.yearFrom ? 1 : 0,
    filters.yearTo ? 1 : 0,
    filters.minScore ? 1 : 0,
    filters.audio ? 1 : 0,
    filters.episodeFrom ? 1 : 0,
    filters.episodeTo ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-zinc-200">Filters</h3>
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors lg:hidden"
          >
            {isExpanded ? "Less" : "More"}
          </button>
        </div>
      </div>

      <div
        className={cn(
          "overflow-hidden transition-all duration-300",
          isExpanded ? "max-h-[1000px]" : "max-h-0 lg:max-h-[1000px]"
        )}
      >
        <div className="space-y-0 px-4 pb-4">
          <FilterSection title="Genre" defaultOpen>
            <ChipGroup
              options={ALL_GENRES}
              selected={filters.genres || []}
              onChange={(values) => updateFilter("genres", values.length > 0 ? values : undefined)}
            />
          </FilterSection>

          <FilterSection title="Status">
            <ChipGroup
              options={ALL_STATUSES}
              selected={filters.status || []}
              onChange={(values) => updateFilter("status", values.length > 0 ? values : undefined)}
            />
          </FilterSection>

          <FilterSection title="Format">
            <ChipGroup
              options={ALL_FORMATS}
              selected={filters.format || []}
              onChange={(values) => updateFilter("format", values.length > 0 ? values : undefined)}
            />
          </FilterSection>

          <FilterSection title="Season">
            <ChipGroup
              options={ALL_SEASONS}
              selected={filters.season || []}
              onChange={(values) => updateFilter("season", values.length > 0 ? values : undefined)}
            />
          </FilterSection>

          <FilterSection title="Year Range">
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="From"
                value={filters.yearFrom || ""}
                onChange={(e) =>
                  updateFilter(
                    "yearFrom",
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )
                }
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                min={1960}
                max={2030}
              />
              <span className="text-zinc-600">-</span>
              <input
                type="number"
                placeholder="To"
                value={filters.yearTo || ""}
                onChange={(e) =>
                  updateFilter(
                    "yearTo",
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )
                }
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                min={1960}
                max={2030}
              />
            </div>
          </FilterSection>

          <FilterSection title="Minimum Score">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={filters.minScore || 0}
                onChange={(e) =>
                  updateFilter(
                    "minScore",
                    parseFloat(e.target.value) > 0
                      ? parseFloat(e.target.value)
                      : undefined
                  )
                }
                className="flex-1 accent-purple-500"
              />
              <span className="w-8 text-center text-sm font-medium text-zinc-300">
                {filters.minScore || 0}
              </span>
            </div>
          </FilterSection>

          <FilterSection title="Audio">
            <ChipGroup
              options={["sub", "dub"] as const}
              selected={filters.audio ? [filters.audio] : []}
              onChange={(values) =>
                updateFilter("audio", values[0] as "sub" | "dub" | undefined)
              }
            />
          </FilterSection>

          <FilterSection title="Episode Count">
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.episodeFrom || ""}
                onChange={(e) =>
                  updateFilter(
                    "episodeFrom",
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )
                }
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                min={0}
              />
              <span className="text-zinc-600">-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.episodeTo || ""}
                onChange={(e) =>
                  updateFilter(
                    "episodeTo",
                    e.target.value ? parseInt(e.target.value, 10) : undefined
                  )
                }
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                min={0}
              />
            </div>
          </FilterSection>

          <FilterSection title="Sort By">
            <div className="flex flex-wrap gap-2">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option}
                  onClick={() => updateFilter("sort", option)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 border",
                    (filters.sort || "popularity") === option
                      ? "bg-purple-600/20 border-purple-500/50 text-purple-300"
                      : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-300"
                  )}
                  aria-pressed={(filters.sort || "popularity") === option}
                >
                  {option === "title_az"
                    ? "A-Z"
                    : option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </FilterSection>
        </div>
      </div>

      <div className="border-t border-zinc-800 px-4 py-2">
        <p className="text-xs text-zinc-500">
          {resultCount} {resultCount === 1 ? "result" : "results"} found
        </p>
      </div>
    </div>
  );
}
