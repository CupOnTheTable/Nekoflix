"use client";

import Link from "next/link";
import NekoflixLogo from "@/components/ui/NekoflixLogo";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Logo + Description */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <NekoflixLogo className="h-10 w-10" />
              <span className="text-lg font-bold text-foreground">
                Neko<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-400">flix</span>
              </span>
            </Link>
            <p className="text-sm text-muted leading-relaxed max-w-xs">
              Anime, properly. Catalog metadata comes straight from AniList, so browsing keeps working even when playback sources are down.
            </p>
          </div>

          {/* Browse */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Browse</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/search" className="text-sm text-muted hover:text-foreground transition-colors">
                  Popular
                </Link>
              </li>
              <li>
                <Link href="/search?sort=score" className="text-sm text-muted hover:text-foreground transition-colors">
                  Top rated
                </Link>
              </li>
              <li>
                <Link href="/search?status=RELEASING" className="text-sm text-muted hover:text-foreground transition-colors">
                  Newest
                </Link>
              </li>
              <li>
                <Link href="/random" className="text-sm text-muted hover:text-foreground transition-colors">
                  Random
                </Link>
              </li>
            </ul>
          </div>

          {/* Discover */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Discover</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/" className="text-sm text-muted hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/schedule" className="text-sm text-muted hover:text-foreground transition-colors">
                  Schedule
                </Link>
              </li>
              <li>
                <Link href="/watchlist" className="text-sm text-muted hover:text-foreground transition-colors">
                  Watchlist
                </Link>
              </li>
              <li>
                <Link href="/mylibrary" className="text-sm text-muted hover:text-foreground transition-colors">
                  Library
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted mb-4">Account</h3>
            <ul className="space-y-2.5">
              <li>
                <Link href="/account" className="text-sm text-muted hover:text-foreground transition-colors">
                  Profile
                </Link>
              </li>
              <li>
                <Link href="/auth/login" className="text-sm text-muted hover:text-foreground transition-colors">
                  Sign In
                </Link>
              </li>
              <li>
                <Link href="/auth/register" className="text-sm text-muted hover:text-foreground transition-colors">
                  Register
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted">
            metadata by <a href="https://anilist.co" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">AniList</a> · streams resolve server-side
          </p>
          <p className="text-xs text-muted">
            no files hosted here
          </p>
        </div>
      </div>
    </footer>
  );
}
