"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type Skin = "brutal" | "glass" | "y2k";
export type Mode = "light" | "dark";

type ThemeCtx = {
  skin: Skin;
  mode: Mode;
  setSkin: (s: Skin) => void;
  toggleMode: () => void;
};

const Ctx = createContext<ThemeCtx | null>(null);

function readAttr<T extends string>(name: string, fallback: T): T {
  if (typeof document === "undefined") return fallback;
  return (document.documentElement.dataset[name] as T) || fallback;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialised from the attributes the no-flash script already set on <html>.
  const [skin, setSkinState] = useState<Skin>("brutal");
  const [mode, setModeState] = useState<Mode>("light");

  useEffect(() => {
    setSkinState(readAttr<Skin>("skin", "brutal"));
    setModeState(readAttr<Mode>("theme", "light"));
  }, []);

  const setSkin = useCallback((s: Skin) => {
    setSkinState(s);
    document.documentElement.dataset.skin = s;
    try {
      localStorage.setItem("pr_skin", s);
    } catch {}
  }, []);

  const toggleMode = useCallback(() => {
    setModeState((prev) => {
      const next: Mode = prev === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem("pr_theme", next);
      } catch {}
      return next;
    });
  }, []);

  const value = useMemo(() => ({ skin, mode, setSkin, toggleMode }), [skin, mode, setSkin, toggleMode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
