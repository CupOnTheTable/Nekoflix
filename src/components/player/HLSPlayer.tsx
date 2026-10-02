"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, ChevronLeft, ChevronRight, Volume2, VolumeX,
  Maximize, Minimize, Settings, AlertCircle, SkipForward, RotateCw, Server,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PLAYER } from "@/lib/i18n";

interface Subtitle {
  url: string;
  label: string;
  default?: boolean;
}

interface StreamSource {
  provider: string;
  label: string;
  url: string;
  intro: { start: number; end: number } | null;
  outro: { start: number; end: number } | null;
  subtitles: Subtitle[];
}

interface HLSPlayerProps {
  malId?: string | null;
  aniListId?: string | null;
  language?: "sub" | "dub";
  title?: string;
  episodeNumber?: number;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  className?: string;
}

export default function HLSPlayer({
  malId,
  aniListId,
  language = "sub",
  title,
  episodeNumber,
  onNext,
  onPrevious,
  hasNext,
  hasPrevious,
  className,
}: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<unknown>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [activeTrack, setActiveTrack] = useState<number>(-1);
  const [showSettings, setShowSettings] = useState(false);
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introEndRef = useRef(0);
  const outroStartRef = useRef(0);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const clearTracks = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    while (video.querySelector("track")) {
      const t = video.querySelector("track");
      if (t) t.remove();
    }
  }, []);

  const loadSource = useCallback(async (sourceIndex: number, autoPlay = true) => {
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    setError(null);
    setShowSkipIntro(false);
    setShowSkipOutro(false);
    introEndRef.current = 0;
    outroStartRef.current = 0;
    clearTracks();

    const source = sources[sourceIndex];
    if (!source) {
      setError(PLAYER.sourceError);
      setLoading(false);
      return;
    }

    setActiveSourceIndex(sourceIndex);
    setSubtitles(source.subtitles || []);

    const iS = source.intro?.start ?? 0;
    const iE = source.intro?.end ?? 0;
    const oS = source.outro?.start ?? 0;
    const oE = source.outro?.end ?? 0;

    if (iS >= 0 && iE > iS) introEndRef.current = iE;
    if (oS >= 0 && oE > oS) outroStartRef.current = oS;

    if (malId && episodeNumber) {
      try {
        const skipRes = await fetch(
          `/api/skip-times?malId=${malId}&ep=${episodeNumber}&duration=1400`
        );
        const skipData = await skipRes.json();
        if (skipData.ok) {
          if (skipData.intro && skipData.intro.end > 0) {
            introEndRef.current = skipData.intro.end;
          }
          if (skipData.outro && skipData.outro.start > 0) {
            outroStartRef.current = skipData.outro.start;
          }
        }
      } catch {
        // skip times unavailable
      }
    }

    if (hlsRef.current) {
      (hlsRef.current as { destroy: () => void }).destroy();
      hlsRef.current = null;
    }

    try {
      const Hls = (await import("hls.js")).default;
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
        });
        hlsRef.current = hls;

        hls.loadSource(source.url);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setLoading(false);
          if (autoPlay) video.play().catch(() => {});
          setupSubtitles(source.subtitles);
        });

        hls.on(Hls.Events.ERROR, (_: unknown, d: { fatal: boolean; type?: string }) => {
          if (d.fatal) {
            setError(PLAYER.sourceError);
            setLoading(false);
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = source.url;
        video.addEventListener("loadedmetadata", () => {
          setLoading(false);
          if (autoPlay) video.play().catch(() => {});
          setupSubtitles(source.subtitles);
        }, { once: true });
      } else {
        setError(PLAYER.sourceError);
        setLoading(false);
      }
    } catch {
      setError(PLAYER.sourceError);
      setLoading(false);
    }
  }, [sources, malId, episodeNumber, clearTracks]);

  const setupSubtitles = useCallback((subs: Subtitle[]) => {
    const video = videoRef.current;
    if (!video || subs.length === 0) return;

    (async () => {
      for (const sub of subs) {
        try {
          const subRes = await fetch(sub.url);
          const vtt = await subRes.text();
          const blob = new Blob([vtt], { type: "text/vtt" });
          const blobUrl = URL.createObjectURL(blob);
          const trackEl = document.createElement("track");
          trackEl.kind = "subtitles";
          trackEl.label = sub.label;
          trackEl.srclang = sub.label.split(" ")[0].toLowerCase().slice(0, 2);
          trackEl.src = blobUrl;
          if (sub.default) trackEl.default = true;
          video.appendChild(trackEl);
        } catch {
          // skip broken subtitle
        }
      }
      if (video.textTracks.length > 0) {
        const defaultIdx = subs.findIndex((s) => s.default);
        for (let t = 0; t < video.textTracks.length; t++) {
          video.textTracks[t].mode = (defaultIdx >= 0 && t === defaultIdx) ? "showing" : "hidden";
          if (defaultIdx >= 0 && t === defaultIdx) setActiveTrack(t);
        }
      }
    })();
  }, []);

  const resolveSources = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!malId && !aniListId) {
      setError("No stream source available");
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (malId) params.set("malId", malId);
      if (aniListId) params.set("aniListId", aniListId);
      params.set("episode", String(episodeNumber || 1));
      params.set("lang", language);

      const res = await fetch(`/api/stream?${params.toString()}`);
      const data = await res.json();

      if (!data.ok || !data.sources?.length) {
        setError(data.error || PLAYER.sourceError);
        setLoading(false);
        return;
      }

      setSources(data.sources);
      setActiveSourceIndex(0);
      // loadSource will be triggered by useEffect when sources change
    } catch {
      setError(PLAYER.sourceError);
      setLoading(false);
    }
  }, [malId, aniListId, episodeNumber, language]);

  useEffect(() => {
    resolveSources();
  }, [resolveSources]);

  useEffect(() => {
    if (sources.length > 0) {
      loadSource(0, true);
    }
    return () => {
      if (hlsRef.current) {
        (hlsRef.current as { destroy: () => void }).destroy();
      }
    };
  }, [sources, loadSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTimeUpdate = () => {
      if (!video.duration) return;
      setProgress((video.currentTime / video.duration) * 100);
      setCurrentTime(formatTime(video.currentTime));
      setDuration(formatTime(video.duration));

      const ct = video.currentTime;
      if (introEndRef.current > 0 && ct < introEndRef.current) {
        setShowSkipIntro(true);
      } else {
        setShowSkipIntro(false);
      }
      if (outroStartRef.current > 0 && ct >= outroStartRef.current) {
        setShowSkipOutro(true);
      } else {
        setShowSkipOutro(false);
      }
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case "ArrowLeft":
        case "j":
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          setShowControls(true);
          break;
        case "ArrowRight":
        case "l":
          e.preventDefault();
          video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
          setShowControls(true);
          break;
        case " ":
        case "k":
          e.preventDefault();
          video.paused ? video.play() : video.pause();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          video.muted = !video.muted;
          setIsMuted(video.muted);
          break;
        case "n":
          e.preventDefault();
          if (hasNext) onNext?.();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [hasNext, onNext]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const toggleFullscreen = () => {
    const c = containerRef.current;
    if (!c) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      c.requestFullscreen();
      setIsFullscreen(true);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
  };

  const skipIntro = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = introEndRef.current > 3 ? introEndRef.current - 3 : introEndRef.current || 90;
    setShowSkipIntro(false);
  };

  const skipOutro = () => {
    if (hasNext) {
      onNext?.();
    } else {
      setShowSkipOutro(false);
    }
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimer.current) clearTimeout(controlsTimer.current);
    controlsTimer.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
  };

  const setTrack = (idx: number) => {
    const v = videoRef.current;
    if (!v) return;
    if (idx === -1) {
      for (let i = 0; i < v.textTracks.length; i++) v.textTracks[i].mode = "hidden";
      setActiveTrack(-1);
    } else {
      const targetLabel = subtitles[idx]?.label;
      for (let i = 0; i < v.textTracks.length; i++) {
        v.textTracks[i].mode = v.textTracks[i].label === targetLabel ? "showing" : "hidden";
      }
      setActiveTrack(idx);
    }
    setShowSettings(false);
  };

  const tryNextSource = () => {
    if (activeSourceIndex < sources.length - 1) {
      loadSource(activeSourceIndex + 1, true);
    } else {
      setError(PLAYER.sourceError);
    }
  };

  if (error) {
    return (
      <div className={cn("relative flex flex-col items-center justify-center rounded-xl bg-zinc-900 aspect-video", className)}>
        <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
        <p className="text-sm text-zinc-400 mb-2">{error}</p>
        <p className="text-xs text-zinc-500 mb-4">{PLAYER.sourceErrorDescription}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => resolveSources()}
            className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600"
          >
            <RotateCw className="h-4 w-4" />
            {PLAYER.retry}
          </button>
          {sources.length > 1 && activeSourceIndex < sources.length - 1 && (
            <button
              onClick={tryNextSource}
              className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-500"
            >
              <Server className="h-4 w-4" />
              {PLAYER.tryAnotherServer}
            </button>
          )}
        </div>
        {hasNext && (
          <button onClick={onNext} className="flex items-center gap-2 rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600 mt-3">
            {PLAYER.nextEpisode} <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden rounded-xl bg-black group", className)}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {loading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-zinc-900">
          <div className="flex flex-col items-center gap-3">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-purple-500 border-r-pink-500" style={{ animationDuration: "1.2s" }} />
              <div className="absolute inset-2 animate-spin rounded-full border-4 border-transparent border-b-cyan-400" style={{ animationDuration: "1.8s", animationDirection: "reverse" }} />
            </div>
            <p className="text-xs text-zinc-500">{PLAYER.sourceErrorDescription.includes("load") ? "Loading stream..." : "Loading stream..."}</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="aspect-video w-full cursor-pointer"
        onClick={togglePlay}
        playsInline
      />

      {showSkipIntro && (
        <button
          onClick={skipIntro}
          className="absolute bottom-24 right-4 z-30 flex items-center gap-2 rounded-lg border border-white/20 bg-black/60 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
        >
          <SkipForward className="h-4 w-4" />
          {PLAYER.skipIntro}
        </button>
      )}

      {showSkipOutro && (
        <button
          onClick={skipOutro}
          className="absolute bottom-24 right-4 z-30 flex items-center gap-2 rounded-lg border border-white/20 bg-black/60 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
        >
          <SkipForward className="h-4 w-4" />
          {hasNext ? PLAYER.nextEpisode : PLAYER.skipOutro}
        </button>
      )}

      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16 transition-opacity pointer-events-none">
          <div className="mb-2 flex items-center gap-2 pointer-events-auto">
            <div className="h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-zinc-700 group/progress" onClick={seek}>
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all group-hover/progress:h-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-zinc-400 whitespace-nowrap tabular-nums">
              {currentTime} / {duration}
            </span>
          </div>

          <div className="flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-1">
              {hasPrevious && (
                <button onClick={onPrevious} className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors">
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <button onClick={togglePlay} className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors">
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              {hasNext && (
                <button onClick={onNext} className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors">
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
              <button onClick={toggleMute} className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors">
                {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
            </div>

            <div className="flex items-center gap-1 relative">
              {(subtitles.length > 0 || sources.length > 1) && (
                <div className="relative">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-2 rounded-lg border border-zinc-700 bg-zinc-800 p-2 shadow-xl min-w-[180px]">
                      {sources.length > 1 && (
                        <>
                          <p className="text-[10px] text-zinc-500 mb-1 px-2">{PLAYER.quality}</p>
                          {sources.map((src, i) => (
                            <button
                              key={i}
                              onClick={() => { loadSource(i, true); setShowSettings(false); }}
                              className={cn(
                                "w-full rounded px-2 py-1 text-left text-xs transition-colors",
                                activeSourceIndex === i ? "bg-purple-600 text-white" : "text-zinc-300 hover:bg-zinc-700"
                              )}
                            >
                              {src.label}
                            </button>
                          ))}
                        </>
                      )}
                      {subtitles.length > 0 && (
                        <>
                          <p className="text-[10px] text-zinc-500 mb-1 px-2 mt-2">{PLAYER.subtitles}</p>
                          <button
                            onClick={() => setTrack(-1)}
                            className={cn(
                              "w-full rounded px-2 py-1 text-left text-xs transition-colors",
                              activeTrack === -1 ? "bg-purple-600 text-white" : "text-zinc-300 hover:bg-zinc-700"
                            )}
                          >
                            {PLAYER.off}
                          </button>
                          {subtitles.map((sub, i) => (
                            <button
                              key={i}
                              onClick={() => setTrack(i)}
                              className={cn(
                                "w-full rounded px-2 py-1 text-left text-xs transition-colors",
                                activeTrack === i ? "bg-purple-600 text-white" : "text-zinc-300 hover:bg-zinc-700"
                              )}
                            >
                              {sub.label}
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
              <button onClick={toggleFullscreen} className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors">
                {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {title && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 transition-opacity" style={{ opacity: showControls ? 1 : 0 }}>
          <h3 className="text-sm font-medium text-white">{title}</h3>
        </div>
      )}
    </div>
  );
}
