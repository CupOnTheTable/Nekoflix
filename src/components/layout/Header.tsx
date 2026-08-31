"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "./ThemeProvider";
import { cn } from "@/lib/utils";
import NekoflixLogo from "@/components/ui/NekoflixLogo";

interface HeaderUser {
  name: string;
  email: string;
  avatar?: string;
}

interface HeaderProps {
  user: HeaderUser | null;
}

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Search" },
  { href: "/watchlist", label: "Watchlist" },
  { href: "/schedule", label: "Schedule" },
  { href: "/mylibrary", label: "Library" },
] as const;

function DiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
    </svg>
  );
}

export default function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const { theme, setTheme, themeLabel } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    if (mobileOpen && isMobile) {
      document.body.style.overflow = "hidden";
      closeBtnRef.current?.focus();
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen, isMobile]);

  const closeDrawer = useCallback(() => {
    setMobileOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!mobileOpen || !isMobile) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { closeDrawer(); return; }
      if (e.key === "Tab" && drawerRef.current) {
        const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, isMobile, closeDrawer]);

  useEffect(() => {
    if (!themeOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(e.target as Node)) {
        setThemeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [themeOpen]);

  const isHome = pathname === "/";

  const Logo = ({ mobile }: { mobile?: boolean }) => (
    <Link href="/" className={cn("flex items-center gap-2 font-black tracking-tight", mobile ? "text-xl" : "text-xl")}>
      <NekoflixLogo className={cn("drop-shadow-lg", mobile ? "h-10 w-10" : "h-9 w-9")} />
    </Link>
  );

  const navLinkClass = (active: boolean) => cn(
    "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all",
    active ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground hover:bg-surface-hover"
  );

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/50">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1">
            <button
              ref={triggerRef}
              type="button"
              className="md:hidden rounded-lg p-2 text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <Logo />
          </div>

          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main navigation">
            {NAV_LINKS.map((link) => {
              const active = link.href === "/" ? isHome : pathname.startsWith(link.href);
              return (
                <Link key={link.href} href={link.href} className={navLinkClass(active)} aria-current={active ? "page" : undefined}>
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1">
            <Link
              href="/random"
              className={cn(
                "flex items-center justify-center w-9 h-9 rounded-xl transition-all",
                pathname === "/random"
                  ? "bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30"
                  : "text-muted hover:text-foreground hover:bg-surface-hover"
              )}
              title="Random Anime"
            >
              <DiceIcon className="h-5 w-5" />
            </Link>

            <div className="relative" ref={themeMenuRef}>
              <button
                type="button"
                onClick={() => setThemeOpen(!themeOpen)}
                className="flex items-center justify-center w-9 h-9 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-all"
                aria-label="Theme"
              >
                <MoonIcon className="h-[18px] w-[18px]" />
              </button>
              {themeOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 rounded-xl border border-border bg-surface shadow-xl py-1 z-50">
                  {([
                    { id: "dark" as const, label: "Dark", desc: "Zinc neutral" },
                    { id: "midnight" as const, label: "Midnight", desc: "Deep blue" },
                    { id: "abyss" as const, label: "Abyss", desc: "OLED black" },
                  ]).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setTheme(opt.id); setThemeOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors",
                        theme === opt.id
                          ? "bg-accent/10 text-accent"
                          : "text-muted hover:text-foreground hover:bg-surface-hover"
                      )}
                    >
                      <span className={cn(
                        "h-3 w-3 rounded-full border-2",
                        opt.id === "dark" && "border-zinc-400 bg-zinc-600",
                        opt.id === "midnight" && "border-indigo-400 bg-indigo-600",
                        opt.id === "abyss" && "border-zinc-800 bg-black",
                      )} />
                      <div>
                        <div className="font-medium">{opt.label}</div>
                        <div className="text-[11px] text-muted">{opt.desc}</div>
                      </div>
                      {theme === opt.id && (
                        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {user ? (
              <Link href="/account" className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-foreground hover:bg-surface-hover transition-all">
                {user.avatar ? (
                  <img src={user.avatar} alt="" className="h-7 w-7 rounded-lg object-cover" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-bold">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="hidden sm:inline text-[13px]">{user.name}</span>
              </Link>
            ) : (
              <Link href="/auth/login" className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-1.5 text-[13px] font-semibold text-white hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-600/20">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDrawer} />
          <div ref={drawerRef} className="absolute inset-y-0 left-0 flex w-72 flex-col bg-background/95 backdrop-blur-xl border-r border-border shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-4 py-4">
              <Logo mobile />
              <button ref={closeBtnRef} type="button" onClick={closeDrawer} className="rounded-lg p-2 text-muted hover:text-foreground hover:bg-surface-hover transition-colors" aria-label="Close navigation menu">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Mobile navigation">
              <ul className="space-y-0.5">
                {NAV_LINKS.map((link) => {
                  const active = link.href === "/" ? isHome : pathname.startsWith(link.href);
                  return (
                    <li key={link.href}>
                      <Link href={link.href} onClick={closeDrawer} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground hover:bg-surface-hover")} aria-current={active ? "page" : undefined}>
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
                <li>
                  <Link href="/random" onClick={closeDrawer} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", pathname === "/random" ? "bg-accent/10 text-accent" : "text-muted hover:text-foreground hover:bg-surface-hover")}>
                    <DiceIcon className="h-5 w-5" />
                    Random
                  </Link>
                </li>
              </ul>
            </nav>
            <div className="border-t border-border px-4 py-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted mb-2 px-3">Theme</p>
              <div className="flex gap-1.5 px-3">
                {([
                  { id: "dark" as const, label: "Dark", color: "bg-zinc-600 border-zinc-400" },
                  { id: "midnight" as const, label: "Midnight", color: "bg-indigo-600 border-indigo-400" },
                  { id: "abyss" as const, label: "Abyss", color: "bg-black border-zinc-800" },
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setTheme(opt.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors flex-1",
                      theme === opt.id
                        ? "bg-accent/10 text-accent ring-1 ring-accent/30"
                        : "text-muted hover:text-foreground hover:bg-surface-hover"
                    )}
                  >
                    <span className={cn("h-2.5 w-2.5 rounded-full border-2", opt.color)} />
                    {opt.label}
                  </button>
                ))}
              </div>
              {user ? (
                <Link href="/account" onClick={closeDrawer} className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-bold">{user.name.charAt(0).toUpperCase()}</span>
                  <div className="flex flex-col">
                    <span>{user.name}</span>
                    <span className="text-xs text-muted">{user.email}</span>
                  </div>
                </Link>
              ) : (
                <Link href="/auth/login" onClick={closeDrawer} className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-purple-500 hover:to-pink-500 transition-all shadow-lg shadow-purple-600/20">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
