import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { ThemeId } from "./types";

const THEME_KEY = "fss:theme:v1";

export const THEMES: { id: ThemeId; label: string; isDark: boolean }[] = [
  { id: "dark-pro", label: "Dark Professional", isDark: true },
  { id: "light-pro", label: "Light Professional", isDark: false },
  { id: "corporate-blue", label: "Corporate Blue", isDark: true },
  { id: "emerald", label: "Emerald Green", isDark: true },
  { id: "purple", label: "Executive Purple", isDark: true },
];

interface ThemeCtx {
  theme: ThemeId;
  setTheme: (t: ThemeId) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function apply(theme: ThemeId) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.setAttribute("data-theme", theme);
  const isDark = THEMES.find((t) => t.id === theme)?.isDark ?? true;
  html.classList.toggle("dark", isDark);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("dark-pro");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && (window.localStorage.getItem(THEME_KEY) as ThemeId)) || "dark-pro";
    setThemeState(saved);
    apply(saved);
  }, []);

  const setTheme = useCallback((t: ThemeId) => {
    setThemeState(t);
    apply(t);
    if (typeof window !== "undefined") window.localStorage.setItem(THEME_KEY, t);
  }, []);

  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export function useTheme() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useTheme must be used inside ThemeProvider");
  return v;
}
