"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

type Theme = "dark" | "midnight" | "abyss";

const THEMES: Theme[] = ["dark", "midnight", "abyss"];

const THEME_LABELS: Record<Theme, string> = {
  dark: "Dark",
  midnight: "Midnight",
  abyss: "Abyss",
};

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  themeLabel: string;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "midnight", "abyss");
  root.classList.add(theme);
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      document.documentElement.style.setProperty(
        "transition-duration",
        "0s"
      );
    }

    const stored = localStorage.getItem("theme") as Theme | null;
    const initial = stored && THEMES.includes(stored) ? stored : "dark";
    setTheme(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const setThemeFn = useCallback((t: Theme) => {
    setTheme(t);
    localStorage.setItem("theme", t);
    applyTheme(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: setThemeFn, themeLabel: THEME_LABELS[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
}
