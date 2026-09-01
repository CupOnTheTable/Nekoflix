"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import AnimeCard from "./AnimeCard";
import type { Anime } from "@/types";

interface CarouselProps {
  animeList: Anime[];
  onAddToWatchlist?: (animeId: number) => void;
}

const CARD_GAP = 16;

export default function Carousel({ animeList, onAddToWatchlist }: CarouselProps) {
  const items = animeList.slice(0, 10);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchDelta, setTouchDelta] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [visibleCards, setVisibleCards] = useState(5);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const updateCards = () => {
      const w = window.innerWidth;
      if (w < 640) setVisibleCards(1);
      else if (w < 1024) setVisibleCards(2);
      else setVisibleCards(5);
    };
    updateCards();
    window.addEventListener("resize", updateCards);
    return () => window.removeEventListener("resize", updateCards);
  }, []);

  const maxIndex = Math.max(0, items.length - visibleCards);

  const advance = useCallback(
    (direction: 1 | -1) => {
      setCurrentIndex((prev) => {
        const next = prev + direction;
        if (next > maxIndex) return 0;
        if (next < 0) return maxIndex;
        return next;
      });
    },
    [maxIndex]
  );

  useEffect(() => {
    if (reducedMotion || isPaused || items.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => advance(1), 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [reducedMotion, isPaused, advance, items.length]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const getCardWidth = useCallback(() => {
    if (!containerRef.current) return 0;
    const containerWidth = containerRef.current.offsetWidth;
    return (containerWidth - CARD_GAP * (visibleCards - 1)) / visibleCards;
  }, [visibleCards]);

  const getTranslateX = useCallback(() => {
    const cardWidth = getCardWidth();
    return -(currentIndex * (cardWidth + CARD_GAP));
  }, [currentIndex, getCardWidth]);

  const handlePrev = () => advance(-1);
  const handleNext = () => advance(1);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") handlePrev();
    if (e.key === "ArrowRight") handleNext();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.touches[0].clientX);
    setIsDragging(true);
    setTouchDelta(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const delta = e.touches[0].clientX - touchStart;
    setTouchDelta(delta);
  };

  const handleTouchEnd = () => {
    if (Math.abs(touchDelta) > 50) {
      if (touchDelta > 0) handlePrev();
      else handleNext();
    }
    setTouchStart(null);
    setTouchDelta(0);
    setIsDragging(false);
  };

  const translateX = reducedMotion ? 0 : getTranslateX();
  const touchOffset = isDragging ? touchDelta : 0;

  return (
    <div
      className="relative w-full"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
    >
      <div
        ref={containerRef}
        className="overflow-hidden"
        role="region"
        aria-roledescription="carousel"
        aria-label="Popular right now"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={cn(
            "flex",
            reducedMotion
              ? ""
              : "transition-transform duration-500 ease-out"
          )}
          style={{
            gap: `${CARD_GAP}px`,
            transform: `translateX(${translateX + touchOffset}px)`,
          }}
        >
          {items.map((anime) => (
            <div
              key={anime.id}
              className="flex-shrink-0"
              style={{
                width: `calc((100% - ${CARD_GAP * (visibleCards - 1)}px) / ${visibleCards})`,
              }}
              role="group"
              aria-roledescription="slide"
              aria-label={`${anime.title}`}
            >
              <AnimeCard
                anime={anime}
              />
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handlePrev}
        className={cn(
          "absolute left-0 top-1/2 z-10 -translate-y-1/2 -translate-x-1/2",
          "flex h-10 w-10 items-center justify-center rounded-full",
          "bg-black/70 text-white backdrop-blur-sm transition-all duration-200",
          "hover:bg-black/90 hover:scale-110",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
          "md:h-12 md:w-12"
        )}
        aria-label="Previous slide"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <button
        onClick={handleNext}
        className={cn(
          "absolute right-0 top-1/2 z-10 -translate-y-1/2 translate-x-1/2",
          "flex h-10 w-10 items-center justify-center rounded-full",
          "bg-black/70 text-white backdrop-blur-sm transition-all duration-200",
          "hover:bg-black/90 hover:scale-110",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500",
          "md:h-12 md:w-12"
        )}
        aria-label="Next slide"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div className="mt-4 flex items-center justify-center gap-2">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(Math.min(i, maxIndex))}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i >= currentIndex && i < currentIndex + visibleCards
                ? "w-6 bg-purple-500"
                : "w-2 bg-zinc-600 hover:bg-zinc-500"
            )}
            aria-label={`Go to slide group starting at position ${i + 1}`}
            aria-current={i >= currentIndex && i < currentIndex + visibleCards ? "true" : undefined}
          />
        ))}
      </div>
    </div>
  );
}
