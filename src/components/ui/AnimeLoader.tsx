"use client";

export default function AnimeLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {/* Animated spinner rings */}
        <div className="relative h-28 w-28">
          {/* Outer ring - gradient */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "conic-gradient(from 0deg, transparent, #a855f7, #ec4899, transparent)",
              animation: "kuro-spin 1.2s linear infinite",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
            }}
          />
          {/* Middle ring - cyan */}
          <div
            className="absolute inset-2 rounded-full"
            style={{
              background: "conic-gradient(from 180deg, transparent, #22d3ee, #3b82f6, transparent)",
              animation: "kuro-spin 1.8s linear infinite reverse",
              mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
              WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
            }}
          />
          {/* Inner glow */}
          <div
            className="absolute inset-6 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-md"
            style={{ animation: "kuro-pulse 2s ease-in-out infinite" }}
          />
          {/* Center dot */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="h-4 w-4 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 shadow-lg shadow-purple-500/60"
              style={{ animation: "kuro-pulse 1.5s ease-in-out infinite" }}
            />
          </div>
          {/* Orbiting dot */}
          <div
            className="absolute inset-0"
            style={{ animation: "kuro-spin 2s linear infinite" }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-cyan-400 shadow-lg shadow-cyan-400/60" />
          </div>
        </div>

        {/* Loading text with animated dots */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-zinc-400">{text}</span>
          <span className="flex gap-0.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-400" style={{ animation: "kuro-bounce 0.6s ease-in-out infinite" }} />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-pink-400" style={{ animation: "kuro-bounce 0.6s ease-in-out infinite 0.15s" }} />
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-400" style={{ animation: "kuro-bounce 0.6s ease-in-out infinite 0.3s" }} />
          </span>
        </div>
      </div>
    </div>
  );
}
