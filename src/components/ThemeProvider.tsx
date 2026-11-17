"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Icon from "@/components/Icon";
import { cn } from "@/lib/utils";

export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "fox_theme";

const ThemeContext = createContext<{
  theme: ThemeMode;
  setTheme: (next: ThemeMode) => void;
  toggleTheme: () => void;
}>({
  theme: "dark",
  setTheme: () => undefined,
  toggleTheme: () => undefined,
});

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") {
        setThemeState(saved);
        document.documentElement.setAttribute("data-theme", saved);
        return;
      }
    } catch {
      /* ignore storage errors */
    }
    document.documentElement.setAttribute("data-theme", "dark");
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", next);
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((curr) => {
      const next: ThemeMode = curr === "dark" ? "light" : "dark";
      if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", next);
      }
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
        "border-slate-200 bg-white/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900",
        "dark:border-[#2d313b] dark:bg-[#1e2128] dark:text-slate-300 dark:hover:bg-[#282c35] dark:hover:text-white",
        className,
      )}
    >
      <Icon name={isDark ? "sun" : "moon"} className="h-[18px] w-[18px]" />
    </button>
  );
}
