"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Play, Pause, ChevronLeft, ChevronRight, Volume2, VolumeX,
  Maximize, Minimize, Settings, AlertCircle, SkipForward, RotateCw, Server,
  PictureInPicture2, Gauge,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PLAYER } from "@/lib/i18n";

interface Subtitle {
  url: string;
  label: string;
  default?: boolean;
}

interface QualityLevel {
  index: number;
  height?: number;
  bitrate?: number;
  label: string;
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
  seriesTitle?: string;
  language?: "sub" | "dub";
  title?: string;
  episodeNumber?: number;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  className?: string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function HLSPlayer({
  malId,
  aniListId,
  seriesTitle,
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
  const triedSourcesRef = useRef<Set<number>>(new Set());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<StreamSource[]>([]);
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [duration, setDuration] = useState("0:00");
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPiP, setIsPiP] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [activeTrack, setActiveTrack] = useState<number>(-1);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [activeQuality, setActiveQuality] = useState<number>(-1);
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<"main" | "speed" | "quality" | "subtitles">("main");
  const [showSkipIntro, setShowSkipIntro] = useState(false);
  const [showSkipOutro, setShowSkipOutro] = useState(false);
  const [showNextCountdown, setShowNextCountdown] = useState(false);
  const [nextCountdown, setNextCountdown] = useState(5);
  const [resumePrompt, setResumePrompt] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);
  const controlsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const introEndRef = useRef(0);
  const outroStartRef = useRef(0);
  const progressSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const nextCountdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const formatTime = (secs: number) => {
    if (!isFinite(secs) || secs < 0) return "0:00";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  };

  const clearTracks = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    while (video.querySelector("track")) {
      const t = video.querySelector("track");
      if (t) t.remove();
    }
  }, []);

  const saveProgress = useCallback((completed = false) => {
    const video = videoRef.current;
    if (!video || !malId || !episodeNumber) return;
    if (!isFinite(video.duration)) return;

    fetch("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        animeId: Number(malId),
        episode: episodeNumber,
        currentTime: video.currentTime,
        duration: video.duration,
        completed: completed || video.currentTime / video.duration > 0.9,
      }),
    }).catch(() => {});
  }, [malId, episodeNumber]);

  const loadSavedProgress = useCallback(async () => {
    if (!malId || !episodeNumber) return;
    try {
      const res = await fetch(`/api/progress?animeId=${malId}&episode=${episodeNumber}`);
      const data = await res.json();
      if (data.ok && data.progress?.currentTime > 30) {
        setResumeTime(data.progress.currentTime);
        setResumePrompt(true);
      }
    } catch {
      // ignore
    }
  }, [malId, episodeNumber]);

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

  const loadSource = useCallback(async (sourceIndex: number, autoPlay = true) => {
    const video = videoRef.current;
    if (!video) return;

    setLoading(true);
    setError(null);
    setShowSkipIntro(false);
    setShowSkipOutro(false);
    setShowNextCountdown(false);
    setResumePrompt(false);
    introEndRef.current = 0;
    outroStartRef.current = 0;
    clearTracks();

    const source = sources[sourceIndex];
    if (!source) {
      setError(PLAYER.sourceError);
      setLoading(false);
      return;
    }

    triedSourcesRef.current.add(sourceIndex);
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
      const isHls = source.url.includes(".m3u8") || source.url.includes("/api/stream/proxy");

      if (!isHls) {
        // Direct MP4 or other native video URL
        video.src = source.url;
        video.addEventListener("loadedmetadata", () => {
          setLoading(false);
          if (autoPlay) video.play().catch(() => {});
          setupSubtitles(source.subtitles);
        }, { once: true });
        video.addEventListener("error", () => {
          setTimeout(() => {
            const nextIndex = sources.findIndex((_, i) => !triedSourcesRef.current.has(i));
            if (nextIndex >= 0) {
              triedSourcesRef.current.add(nextIndex);
              loadSource(nextIndex, true);
            } else {
              setError(PLAYER.sourceError);
              setLoading(false);
            }
          }, 0);
        }, { once: true });
        return;
      }

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

        hls.on(Hls.Events.MANIFEST_PARSED, (_: unknown, data: { levels: Array<{ height?: number; bitrate?: number; name?: string }> }) => {
          setLoading(false);
          if (autoPlay) video.play().catch(() => {});
          setupSubtitles(source.subtitles);

          const levels = data.levels.map((lvl, idx) => ({
            index: idx,
            height: lvl.height,
            bitrate: lvl.bitrate,
            label: lvl.height ? `${lvl.height}p` : lvl.name || `Quality ${idx + 1}`,
          }));
          setQualityLevels(levels);
          setActiveQuality(hls.currentLevel);
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (_: unknown, data: { level: number }) => {
          setActiveQuality(data.level);
        });

        hls.on(Hls.Events.ERROR, (_: unknown, d: { fatal: boolean; type?: string }) => {
          if (d.fatal) {
            const nextIndex = sources.findIndex((_, i) => !triedSourcesRef.current.has(i));
            if (nextIndex >= 0) {
              triedSourcesRef.current.add(nextIndex);
              loadSource(nextIndex, true);
            } else {
              setError(PLAYER.sourceError);
              setLoading(false);
            }
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
  }, [sources, malId, episodeNumber, clearTracks, setupSubtitles]);

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
      if (seriesTitle) params.set("title", seriesTitle);
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
      triedSourcesRef.current.clear();
    } catch {
      setError(PLAYER.sourceError);
      setLoading(false);
    }
  }, [malId, aniListId, episodeNumber, language]);

  useEffect(() => {
    resolveSources();
    loadSavedProgress();
  }, [resolveSources, loadSavedProgress]);

  useEffect(() => {
    if (sources.length > 0) {
      loadSource(0, true);
    }
    return () => {
      if (hlsRef.current) {
        (hlsRef.current as { destroy: () => void }).destroy();
      }
      if (progressSaveTimer.current) clearInterval(progressSaveTimer.current);
      if (nextCountdownTimer.current) clearInterval(nextCountdownTimer.current);
    };
  }, [sources, loadSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => {
      setIsMuted(video.muted);
      setVolume(video.volume);
    };
    const onProgress = () => {
      if (!video.duration) return;
      let maxBuffered = 0;
      for (let i = 0; i < video.buffered.length; i++) {
        maxBuffered = Math.max(maxBuffered, video.buffered.end(i));
      }
      setBuffered((maxBuffered / video.duration) * 100);
    };
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
    const onEnded = () => {
      saveProgress(true);
      if (hasNext) {
        setShowNextCountdown(true);
        setNextCountdown(5);
        nextCountdownTimer.current = setInterval(() => {
          setNextCountdown((prev) => {
            if (prev <= 1) {
              if (nextCountdownTimer.current) clearInterval(nextCountdownTimer.current);
              onNext?.();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    };
    const onEnterPiP = () => setIsPiP(true);
    const onLeavePiP = () => setIsPiP(false);
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);

    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    video.addEventListener("volumechange", onVolumeChange);
    video.addEventListener("progress", onProgress);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    video.addEventListener("enterpictureinpicture", onEnterPiP);
    video.addEventListener("leavepictureinpicture", onLeavePiP);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("volumechange", onVolumeChange);
      video.removeEventListener("progress", onProgress);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("enterpictureinpicture", onEnterPiP);
      video.removeEventListener("leavepictureinpicture", onLeavePiP);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, [hasNext, onNext, saveProgress]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isPlaying) return;

    progressSaveTimer.current = setInterval(() => {
      saveProgress(false);
    }, 10000);

    return () => {
      if (progressSaveTimer.current) clearInterval(progressSaveTimer.current);
    };
  }, [isPlaying, saveProgress]);

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

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const vol = parseFloat(e.target.value);
    v.volume = vol;
    v.muted = vol === 0;
    setVolume(vol);
  };

  const toggleFullscreen = () => {
    const c = containerRef.current;
    if (!c) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      c.requestFullscreen();
    }
  };

  const togglePiP = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await v.requestPictureInPicture();
      }
    } catch {
      // ignore
    }
  };

  const setSpeed = (speed: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = speed;
    setPlaybackSpeed(speed);
    setActiveSettingsTab("main");
  };

  const setQuality = (level: number) => {
    const hls = hlsRef.current as { currentLevel: number; levels: unknown[]; nextLevel: number } | null;
    if (hls && hls.levels.length > 0) {
      hls.nextLevel = level;
      setActiveQuality(level);
    }
    setActiveSettingsTab("main");
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration;
  };

  const seekHover = (e: React.MouseEvent<HTMLDivElement>) => {
    // placeholder for future hover preview time tooltip
    e.preventDefault();
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
    setActiveSettingsTab("main");
  };

  const tryNextSource = () => {
    if (activeSourceIndex < sources.length - 1) {
      loadSource(activeSourceIndex + 1, true);
    } else {
      setError(PLAYER.sourceError);
    }
  };

  const resumePlayback = () => {
    const v = videoRef.current;
    if (!v || !resumeTime) return;
    v.currentTime = resumeTime;
    setResumePrompt(false);
    v.play().catch(() => {});
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

  const settingsContent = () => {
    if (activeSettingsTab === "speed") {
      return (
        <>
          <button onClick={() => setActiveSettingsTab("main")} className="mb-2 text-[10px] text-zinc-500 hover:text-zinc-300">← Back</button>
          <p className="text-[10px] text-zinc-500 mb-1 px-2">{PLAYER.speed}</p>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                "w-full rounded px-2 py-1 text-left text-xs transition-colors",
                playbackSpeed === s ? "bg-purple-600 text-white" : "text-zinc-300 hover:bg-zinc-700"
              )}
            >
              {s}x
            </button>
          ))}
        </>
      );
    }

    if (activeSettingsTab === "quality") {
      return (
        <>
          <button onClick={() => setActiveSettingsTab("main")} className="mb-2 text-[10px] text-zinc-500 hover:text-zinc-300">← Back</button>
          <p className="text-[10px] text-zinc-500 mb-1 px-2">{PLAYER.quality}</p>
          <button
            onClick={() => setQuality(-1)}
            className={cn(
              "w-full rounded px-2 py-1 text-left text-xs transition-colors",
              activeQuality === -1 ? "bg-purple-600 text-white" : "text-zinc-300 hover:bg-zinc-700"
            )}
          >
            {PLAYER.auto}
          </button>
          {qualityLevels.map((q) => (
            <button
              key={q.index}
              onClick={() => setQuality(q.index)}
              className={cn(
                "w-full rounded px-2 py-1 text-left text-xs transition-colors",
                activeQuality === q.index ? "bg-purple-600 text-white" : "text-zinc-300 hover:bg-zinc-700"
              )}
            >
              {q.label}
            </button>
          ))}
        </>
      );
    }

    if (activeSettingsTab === "subtitles") {
      return (
        <>
          <button onClick={() => setActiveSettingsTab("main")} className="mb-2 text-[10px] text-zinc-500 hover:text-zinc-300">← Back</button>
          <p className="text-[10px] text-zinc-500 mb-1 px-2">{PLAYER.subtitles}</p>
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
      );
    }

    return (
      <>
        <p className="text-[10px] text-zinc-500 mb-1 px-2">{PLAYER.settings}</p>
        {sources.length > 1 && (
          <button onClick={() => setActiveSettingsTab("quality")} className="w-full rounded px-2 py-1 text-left text-xs text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center justify-between">
            <span>{PLAYER.quality}</span>
            <span className="text-zinc-500">{activeQuality === -1 ? PLAYER.auto : qualityLevels.find((q) => q.index === activeQuality)?.label || PLAYER.auto}</span>
          </button>
        )}
        <button onClick={() => setActiveSettingsTab("speed")} className="w-full rounded px-2 py-1 text-left text-xs text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center justify-between">
          <span>{PLAYER.speed}</span>
          <span className="text-zinc-500">{playbackSpeed}x</span>
        </button>
        {subtitles.length > 0 && (
          <button onClick={() => setActiveSettingsTab("subtitles")} className="w-full rounded px-2 py-1 text-left text-xs text-zinc-300 hover:bg-zinc-700 transition-colors flex items-center justify-between">
            <span>{PLAYER.subtitles}</span>
            <span className="text-zinc-500">{activeTrack === -1 ? PLAYER.off : subtitles[activeTrack]?.label}</span>
          </button>
        )}
      </>
    );
  };

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

      {resumePrompt && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
          <div className="rounded-xl bg-zinc-900 p-5 text-center shadow-xl">
            <p className="text-sm text-white font-medium">Resume from {formatTime(resumeTime)}?</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <button onClick={resumePlayback} className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-500">Resume</button>
              <button onClick={() => { setResumePrompt(false); videoRef.current?.play().catch(() => {}); }} className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600">Start over</button>
            </div>
          </div>
        </div>
      )}

      {showNextCountdown && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70">
          <div className="rounded-xl bg-zinc-900 p-5 text-center shadow-xl">
            <p className="text-sm text-white font-medium">{PLAYER.autoPlayNext} {nextCountdown}s</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <button onClick={() => { if (nextCountdownTimer.current) clearInterval(nextCountdownTimer.current); onNext?.(); }} className="rounded-lg bg-purple-600 px-4 py-2 text-sm text-white hover:bg-purple-500">{PLAYER.nextEpisode}</button>
              <button onClick={() => { if (nextCountdownTimer.current) clearInterval(nextCountdownTimer.current); setShowNextCountdown(false); }} className="rounded-lg bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600">{PLAYER.cancel}</button>
            </div>
          </div>
        </div>
      )}

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
            <div
              className="group/progress relative h-1.5 flex-1 cursor-pointer overflow-hidden rounded-full bg-zinc-700"
              onClick={seek}
              onMouseMove={seekHover}
            >
              <div
                className="absolute inset-y-0 left-0 bg-zinc-500/50"
                style={{ width: `${buffered}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 transition-all group-hover/progress:h-full"
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
                <button onClick={onPrevious} className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors" aria-label={PLAYER.previousEpisode}>
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <button onClick={togglePlay} className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors" aria-label={isPlaying ? PLAYER.pause : PLAYER.play}>
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              {hasNext && (
                <button onClick={onNext} className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors" aria-label={PLAYER.nextEpisode}>
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
              <div className="group/volume relative flex items-center">
                <button onClick={toggleMute} className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors" aria-label={isMuted ? PLAYER.unmute : PLAYER.mute}>
                  {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={changeVolume}
                  className="ml-1 h-1 w-0 overflow-hidden rounded-full bg-zinc-700 accent-purple-500 transition-all group-hover/volume:w-20 group-focus-within/volume:w-20"
                />
              </div>
            </div>

            <div className="flex items-center gap-1 relative">
              <div className="relative">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                  aria-label={PLAYER.settings}
                >
                  <Settings className="h-5 w-5" />
                </button>
                {showSettings && (
                  <div className="absolute bottom-full right-0 mb-2 max-h-64 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-800 p-2 shadow-xl min-w-[180px]">
                    {settingsContent()}
                  </div>
                )}
              </div>
              <button
                onClick={togglePiP}
                className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                aria-label={isPiP ? PLAYER.exitPictureInPicture : PLAYER.pictureInPicture}
              >
                <PictureInPicture2 className="h-5 w-5" />
              </button>
              <button
                onClick={toggleFullscreen}
                className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
                aria-label={isFullscreen ? PLAYER.exitFullscreen : PLAYER.fullscreen}
              >
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
