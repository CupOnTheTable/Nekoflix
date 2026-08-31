"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, ChevronLeft, ChevronRight, Volume2, VolumeX, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerEvent {
  channel?: string;
  type?: string;
  event?: string;
  time?: number;
  duration?: number;
  percent?: number;
  currentTime?: number;
}

interface MegaPlayerProps {
  src: string;
  title?: string;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  className?: string;
}

export default function MegaPlayer({
  src,
  title,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  className,
}: MegaPlayerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    setProgress(0);
    setCurrentTime("0:00");
    setDuration("0:00");
  }, [src]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      let data: PlayerEvent;
      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (data.event === "time" && data.duration) {
        setProgress(data.percent || 0);
        setCurrentTime(formatTime(data.time || 0));
        setDuration(formatTime(data.duration));
      }

      if (data.event === "error") {
        setError(true);
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleLoad = useCallback(() => setLoading(false), []);

  const handleError = useCallback(() => {
    setLoading(false);
    setError(true);
  }, []);

  if (error) {
    return (
      <div className={cn("relative flex flex-col items-center justify-center rounded-xl bg-zinc-900 aspect-video", className)}>
        <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
        <p className="text-sm text-zinc-400 mb-2">Video could not be loaded</p>
        <p className="text-xs text-zinc-600 mb-4">Episode may not be available</p>
        {hasNext && (
          <button
            onClick={onNext}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-500"
          >
            Next Episode <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-black", className)}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-900">
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-purple-500 border-r-pink-500" style={{ animationDuration: "1.2s" }} />
              <div className="absolute inset-2 animate-spin rounded-full border-4 border-transparent border-b-cyan-400" style={{ animationDuration: "1.8s", animationDirection: "reverse" }} />
            </div>
            <p className="text-xs text-zinc-500">Loading player...</p>
          </div>
        </div>
      )}

      <iframe
        ref={iframeRef}
        src={src}
        className="aspect-video h-full w-full"
        frameBorder="0"
        scrolling="no"
        allowFullScreen
        onLoad={handleLoad}
        onError={handleError}
        allow="autoplay; fullscreen; picture-in-picture"
        referrerPolicy="no-referrer"
      />

      {!loading && !error && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-12">
          <div className="mb-2 flex items-center gap-2">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-zinc-700">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-zinc-400 whitespace-nowrap">
              {currentTime} / {duration}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {hasPrevious && (
                <button
                  onClick={onPrevious}
                  className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {hasNext && (
                <button
                  onClick={onNext}
                  className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {title && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4">
          <h3 className="text-sm font-medium text-white">{title}</h3>
        </div>
      )}
    </div>
  );
}
