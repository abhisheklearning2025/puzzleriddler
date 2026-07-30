"use client";

import { useTheme, type Skin } from "./ThemeProvider";

const SKINS: { id: Skin; label: string }[] = [
  { id: "brutal", label: "Bold" },
  { id: "glass", label: "Glass" },
  { id: "y2k", label: "Y2K" },
];

export function ThemeSwitcher() {
  const { skin, mode, setSkin, toggleMode } = useTheme();
  return (
    <div style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <div className="switcher" role="group" aria-label="Visual theme">
        {SKINS.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={skin === s.id}
            onClick={() => setSkin(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>
      {skin === "brutal" && (
        <button
          type="button"
          className="icon-btn"
          onClick={toggleMode}
          title="Light / dark"
          aria-label={mode === "dark" ? "Switch to light" : "Switch to dark"}
        >
          {mode === "dark" ? "☀️" : "🌙"}
        </button>
      )}
    </div>
  );
}
