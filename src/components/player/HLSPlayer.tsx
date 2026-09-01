"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, ChevronLeft, ChevronRight, Volume2, VolumeX,
  Maximize, Minimize, Settings, AlertCircle, SkipForward,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Subtitle {
  url: string;
  label: string;
  default?: boolean;
}

interface HLSPlayerProps {
  embedId: string;
  language?: "sub" | "dub";
  title?: string;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  className?: string;
}

export default function HLSPlayer({
  embedId,
  language = "sub",
  title,
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

  const loadStream = useCallback(async () => {
    setLoading(true);
    setError(null);
    setShowSkipIntro(false);
    setShowSkipOutro(false);
    introEndRef.current = 0;
    outroStartRef.current = 0;

    try {
      const res = await fetch(`/api/stream?embedId=${embedId}&lang=${language}`);
      const data = await res.json();

      if (!data.ok || !data.stream?.url) {
        setError(data.error || "Stream not available");
        setLoading(false);
        return;
      }

      setSubtitles(data.subtitles || []);

      const iS = data.stream.intro?.start ?? 0;
      const iE = data.stream.intro?.end ?? 0;
      const oS = data.stream.outro?.start ?? 0;
      const oE = data.stream.outro?.end ?? 0;

      if (iS > 0 && iE > iS) introEndRef.current = iE;
      if (oS > 0 && oE > oS) outroStartRef.current = oS;

      const video = videoRef.current;
      if (!video) {
        setLoading(false);
        return;
      }

      if (hlsRef.current) {
        (hlsRef.current as { destroy: () => void }).destroy();
        hlsRef.current = null;
      }

      const Hls = (await import("hls.js")).default;
      const hls = new Hls({
        enableWorker: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });
      hlsRef.current = hls;

      hls.loadSource(data.stream.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => {});

        if (introEndRef.current > 0) {
          setShowSkipIntro(true);
        }

        if (data.subtitles.length > 0) {
          (async () => {
            for (const sub of data.subtitles) {
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
                // skip
              }
            }
            if (video.textTracks.length > 0) {
              const defaultIdx = data.subtitles.findIndex((s: Subtitle) => s.default);
              for (let t = 0; t < video.textTracks.length; t++) {
                video.textTracks[t].mode = (defaultIdx >= 0 && t === defaultIdx) ? "showing" : "hidden";
                if (defaultIdx >= 0 && t === defaultIdx) setActiveTrack(t);
              }
            }
          })();
        }
      });

      hls.on(Hls.Events.ERROR, (_: unknown, d: { fatal: boolean }) => {
        if (d.fatal) {
          setError("Stream could not be loaded");
          setLoading(false);
        }
      });
    } catch {
      setError("Stream could not be loaded");
      setLoading(false);
    }
  }, [embedId, language]);

  useEffect(() => {
    loadStream();
    return () => {
      if (hlsRef.current) {
        (hlsRef.current as { destroy: () => void }).destroy();
      }
    };
  }, [loadStream]);

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
      if (introEndRef.current > 0 && ct > introEndRef.current) {
        setShowSkipIntro(false);
      }
      if (outroStartRef.current > 0 && ct >= outroStartRef.current) {
        setShowSkipOutro(true);
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
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 10);
          setShowControls(true);
          break;
        case "ArrowRight":
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
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    v.currentTime = introEndRef.current || 90;
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

  if (error) {
    return (
      <div className={cn("relative flex flex-col items-center justify-center rounded-xl bg-zinc-900 aspect-video", className)}>
        <AlertCircle className="h-12 w-12 text-red-500 mb-3" />
        <p className="text-sm text-zinc-400 mb-2">{error}</p>
        {hasNext && (
          <button onClick={onNext} className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-500 mt-3">
            Next Episode <ChevronRight className="h-4 w-4" />
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
            <p className="text-xs text-zinc-500">Loading stream...</p>
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
          Skip Intro
        </button>
      )}

      {showSkipOutro && (
        <button
          onClick={skipOutro}
          className="absolute bottom-24 right-4 z-30 flex items-center gap-2 rounded-lg border border-white/20 bg-black/60 px-5 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:bg-white/20"
        >
          <SkipForward className="h-4 w-4" />
          {hasNext ? "Next Episode" : "Skip Outro"}
        </button>
      )}

      {showControls && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 pt-16 transition-opacity">
          <div className="mb-2 flex items-center gap-2">
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

          <div className="flex items-center justify-between">
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
              {subtitles.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                  {showSettings && (
                    <div className="absolute bottom-full right-0 mb-2 rounded-lg border border-zinc-700 bg-zinc-800 p-2 shadow-xl min-w-[150px]">
                      <p className="text-[10px] text-zinc-500 mb-1 px-2">Subtitles</p>
                      <button
                        onClick={() => setTrack(-1)}
                        className={cn(
                          "w-full rounded px-2 py-1 text-left text-xs transition-colors",
                          activeTrack === -1 ? "bg-purple-600 text-white" : "text-zinc-300 hover:bg-zinc-700"
                        )}
                      >
                        Off
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
