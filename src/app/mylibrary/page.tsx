"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Film,
  Plus,
  Trash2,
  Play,
  ExternalLink,
  LogIn,
  Link as LinkIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

interface VideoItem {
  id: string;
  title: string;
  driveUrl: string;
  streamUrl: string;
  embedUrl: string;
  thumbnailUrl: string;
  duration: string | null;
  addedAt: string;
}

export default function MyLibraryPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string } | null>(null);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          loadVideos();
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const loadVideos = useCallback(() => {
    fetch("/api/videos")
      .then((r) => r.json())
      .then((data) => {
        setVideos(data.videos || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleAdd = async () => {
    setAddError("");
    if (!newTitle.trim()) {
      setAddError("Please enter a title");
      return;
    }
    if (!newUrl.trim()) {
      setAddError("Please enter a URL");
      return;
    }
    if (!newUrl.includes("drive.google.com") && !newUrl.includes("onedrive.live.com") && !newUrl.includes("1drv.ms")) {
      setAddError("Please enter a Google Drive / OneDrive link");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), driveUrl: newUrl.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setVideos((prev) => [data.video, ...prev]);
        setNewTitle("");
        setNewUrl("");
        setShowAdd(false);
      } else {
        const data = await res.json();
        setAddError(data.error || "Failed to add video");
      }
    } catch {
      setAddError("Something went wrong");
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch("/api/videos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setVideos((prev) => prev.filter((v) => v.id !== id));
      }
    } catch { /* ignore */ }
  };

  if (!loading && !user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <div className="mb-4 inline-flex rounded-2xl bg-purple-500/10 p-4">
          <Film className="h-10 w-10 text-purple-400" />
        </div>
        <h1 className="text-3xl font-bold text-white">My Library</h1>
        <p className="mt-3 text-zinc-400">
          Sign in to watch your personal videos from Google Drive.
        </p>
        <Button variant="primary" size="lg" className="mt-6" onClick={() => router.push("/auth/login")}>
          <LogIn className="h-4 w-4" />
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center justify-center rounded-2xl bg-purple-500/10 p-3">
            <Film className="h-8 w-8 text-purple-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">My Library</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Your personal videos from Google Drive.
          </p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(!showAdd)}>
          <Plus className="h-4 w-4" />
          Add Video
        </Button>
      </div>

      {showAdd && (
        <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900 p-5">
          <h3 className="mb-4 text-sm font-semibold text-white">Add Google Drive Video</h3>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="My Video"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                Google Drive Share URL
              </label>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
              <p className="mt-1 text-[11px] text-zinc-600">
                In Google Drive: Right-click the file &gt; Share &gt; Copy link
              </p>
            </div>

            {addError && (
              <p className="text-sm text-red-400">{addError}</p>
            )}

            <div className="flex gap-2">
              <Button variant="primary" size="sm" onClick={handleAdd} disabled={adding}>
                {adding ? "Adding..." : "Add Video"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setShowAdd(false); setAddError(""); }}>
                Cancel
              </Button>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-zinc-800/50 p-3">
            <p className="text-xs text-zinc-500">
              <strong className="text-zinc-400">Google One = Google Drive</strong> — both use the same system.
            </p>
            <ol className="mt-1 list-inside list-decimal space-y-0.5 text-[11px] text-zinc-600">
              <li>Open <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">drive.google.com</a> (same account as Google One)</li>
              <li>Right-click on the video file</li>
              <li>Click &quot;Share&quot; &gt; &quot;Copy link&quot;</li>
              <li>Paste the link above</li>
            </ol>
            <p className="mt-2 text-[10px] text-zinc-700">
              Tip: For best quality, upload as MP4 or MKV. Click the player logo to play.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-purple-500" />
        </div>
      ) : videos.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 py-16 text-center">
          <LinkIcon className="h-12 w-12 text-zinc-700" />
          <div>
            <p className="text-zinc-400">No videos yet</p>
            <p className="mt-1 text-xs text-zinc-600">
              Add a Google Drive link to start watching
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowAdd(true)}>
            <Plus className="h-4 w-4" />
            Add Your First Video
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((video) => (
            <div
              key={video.id}
              className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-all hover:border-zinc-700"
            >
              <div
                className="relative aspect-video cursor-pointer bg-zinc-800"
                onClick={() => router.push(`/watch/${video.id}`)}
              >
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Film className="h-10 w-10 text-zinc-700" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/40">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-600 text-white opacity-0 transition-opacity group-hover:opacity-100">
                    <Play className="h-5 w-5 ml-0.5" />
                  </div>
                </div>
              </div>

              <div className="p-3">
                <h3 className="truncate text-sm font-medium text-zinc-100">
                  {video.title}
                </h3>
                <p className="mt-1 text-xs text-zinc-600">
                  Added {new Date(video.addedAt).toLocaleDateString()}
                </p>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => router.push(`/watch/${video.id}`)}
                    className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-500 transition-colors"
                  >
                    <Play className="h-3 w-3" />
                    Watch
                  </button>
                  <a
                    href={video.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Drive
                  </a>
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
