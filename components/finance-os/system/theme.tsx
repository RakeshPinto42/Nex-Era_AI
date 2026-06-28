"use client";

// Finance OS theme — dark by default, light via toggle. Scoped to the workspace
// by setting [data-fos-theme] on a wrapper; the rest of the app is untouched.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "dark" | "light";
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void } | null>(null);

export function FosThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("fos-theme");
    if (saved === "light" || saved === "dark") setTheme(saved);
  }, []);

  const toggle = () => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("fos-theme", next);
      return next;
    });
  };

  return (
    <div data-fos-theme={theme} className="h-full">
      <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>
    </div>
  );
}

export function useFosTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useFosTheme must be used within FosThemeProvider");
  return ctx;
}

export function ThemeToggle() {
  const { theme, toggle } = useFosTheme();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      className="grid h-9 w-9 place-items-center rounded-lg border border-fos-border bg-fos-surface text-fos-muted transition-colors hover:text-fos-text"
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
