"use client";

import { useState } from "react";
import Link from "next/link";
import type { GamePayload } from "@/lib/games/types";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { useAudio } from "./useAudio";
import { HostMode } from "./HostMode";
import { SoloMode } from "./SoloMode";
import { track } from "./track";
import type { RenderPuzzle } from "./render";

export type GameHero = { kicker: string; title1: string; title2: string; lede: string };

/** Shared shell for every game: header, mode picker, and the Host/Solo flows.
 *  Games differ only in their hero copy and `renderPuzzle`. */
export function GameApp({
  payload,
  hero,
  renderPuzzle,
}: {
  payload: GamePayload;
  hero: GameHero;
  renderPuzzle: RenderPuzzle;
}) {
  const [mode, setMode] = useState<"menu" | "host" | "solo">("menu");
  const audio = useAudio();

  const enter = (m: "host" | "solo") => {
    track("play", payload.slug);
    setMode(m);
  };

  return (
    <main className="container">
      <header className="game-header">
        <Link className="brand" href="/">
          <span className="mark emoji">🧩</span>
          <span className="name">
            Puzzle<em>Riddler</em>
          </span>
        </Link>
        <div className="right">
          <span className="chip">{payload.puzzles.length} puzzles</span>
          <button
            className="icon-btn"
            onClick={audio.toggleSound}
            title="Sound"
            aria-label={audio.soundOn ? "Mute" : "Unmute"}
          >
            {audio.soundOn ? "🔊" : "🔇"}
          </button>
          <ThemeSwitcher />
        </div>
      </header>

      {mode === "menu" && (
        <>
          <section className="card hero">
            <p className="kicker">{hero.kicker}</p>
            <h1 className="display" style={{ fontSize: "clamp(28px,5vw,44px)" }}>
              {hero.title1}
              <br />
              {hero.title2}
            </h1>
            <p className="lede">{hero.lede}</p>
          </section>

          <p className="section-label">How are you playing?</p>
          <div className="modes">
            <button className="mode-card" onClick={() => enter("host")}>
              <span className="ic">📽️</span>
              <span className="nm">Host a Room</span>
              <span className="ct">
                One screen, 2–6 teams, you keep score. Puzzle goes up, people shout, you tap whoever
                got it first.
              </span>
              <span className="tag" style={{ alignSelf: "flex-start" }}>
                Best for ice-breakers
              </span>
            </button>
            <button className="mode-card" onClick={() => enter("solo")}>
              <span className="ic">🎯</span>
              <span className="nm">Solo Practice</span>
              <span className="ct">
                Play alone, type your answers, buy hints, build a streak. Ten puzzles a round.
              </span>
            </button>
          </div>
        </>
      )}

      {mode === "host" && (
        <HostMode payload={payload} audio={audio} renderPuzzle={renderPuzzle} onExit={() => setMode("menu")} />
      )}
      {mode === "solo" && (
        <SoloMode payload={payload} audio={audio} renderPuzzle={renderPuzzle} onExit={() => setMode("menu")} />
      )}
    </main>
  );
}
