"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GamePayload, PayloadPuzzle } from "@/lib/games/types";
import { buildDeck } from "@/lib/games/engine/deck";
import { POINTS } from "@/lib/games/engine/score";
import { track } from "./track";
import type { useAudio } from "./useAudio";
import type { RenderPuzzle } from "./render";

type Audio = ReturnType<typeof useAudio>;
type Team = { name: string; score: number; wins: number };

const TEAM_COLORS = ["#ffc857", "#4ade9b", "#a97bff", "#ff6b8b", "#4cc9f0", "#ff9f45"];
const LEN_OPTS = [8, 12, 16, 20];
const TIME_OPTS = [0, 20, 30, 45, 60];
const DIFF_LABEL = ["", "Easy", "Medium", "Hard"];

export function HostMode({
  payload,
  audio,
  renderPuzzle,
  onExit,
}: {
  payload: GamePayload;
  audio: Audio;
  renderPuzzle: RenderPuzzle;
  onExit: () => void;
}) {
  const [phase, setPhase] = useState<"setup" | "play" | "over">("setup");
  const [teams, setTeams] = useState<Team[]>([
    { name: "Team 1", score: 0, wins: 0 },
    { name: "Team 2", score: 0, wins: 0 },
  ]);
  const [cat, setCat] = useState("all");
  const [len, setLen] = useState(12);
  const [time, setTime] = useState(30);
  const [ramp, setRamp] = useState(true);

  const [deck, setDeck] = useState<PayloadPuzzle[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [awarded, setAwarded] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [timeUp, setTimeUp] = useState(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poolFor = useCallback(
    (c: string) => (c === "all" ? payload.puzzles : payload.puzzles.filter((p) => p.categorySlug === c)),
    [payload],
  );

  const stopTimer = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setTimeUp(false);
    if (!time) {
      setTimeLeft(0);
      return;
    }
    setTimeLeft(time);
    tickRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          stopTimer();
          setTimeUp(true);
          audio.beep([300, 240], 0.2, "triangle");
          return 0;
        }
        if (t - 1 === 3) audio.beep([520], 0.09);
        return t - 1;
      });
    }, 1000);
  }, [time, stopTimer, audio]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const cur = deck[idx];

  const startRound = useCallback(() => {
    setTeams((ts) => ts.map((t, i) => ({ name: t.name.trim() || `Team ${i + 1}`, score: 0, wins: 0 })));
    setDeck(buildDeck(poolFor(cat), len, ramp));
    setIdx(0);
    setPhase("play");
  }, [poolFor, cat, len, ramp]);

  useEffect(() => {
    if (phase !== "play") return;
    setRevealed(false);
    setAwarded(null);
    startTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, phase]);

  const revealNobody = useCallback(() => {
    setRevealed((r) => {
      if (!r) audio.beep([330, 262], 0.18, "triangle");
      return true;
    });
    stopTimer();
  }, [audio, stopTimer]);

  const award = useCallback(
    (i: number) => {
      if (awarded !== null || revealed || !deck[idx] || !teams[i]) return;
      const p = deck[idx];
      setAwarded(i);
      setTeams((ts) => ts.map((t, j) => (j === i ? { ...t, score: t.score + POINTS[p.difficulty], wins: t.wins + 1 } : t)));
      stopTimer();
      track("solve", payload.slug);
      audio.beep([784, 1047], 0.14);
      setRevealed(true);
    },
    [awarded, revealed, deck, idx, teams, stopTimer, audio, payload.slug],
  );

  const finish = useCallback(() => {
    stopTimer();
    audio.beep([523, 659, 784], 0.18);
    setPhase("over");
  }, [stopTimer, audio]);

  const next = useCallback(() => {
    if (!revealed) {
      revealNobody();
      return;
    }
    if (idx >= deck.length - 1) finish();
    else setIdx((i) => i + 1);
  }, [revealed, idx, deck.length, revealNobody, finish]);

  useEffect(() => {
    if (phase !== "play") return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const k = e.key.toLowerCase();
      if (k >= "1" && k <= "6") {
        e.preventDefault();
        award(parseInt(k, 10) - 1);
      } else if (k === "r") {
        e.preventDefault();
        revealNobody();
      } else if (k === " " || k === "enter") {
        e.preventDefault();
        next();
      } else if (k === "escape") {
        e.preventDefault();
        setPhase("setup");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, award, revealNobody, next]);

  // ---------- SETUP ----------
  if (phase === "setup") {
    const catOpts = [{ slug: "all", name: "🎲 Mixed", icon: "" }, ...payload.categories];
    return (
      <div className="stack">
        <section className="card" style={{ padding: 22 }}>
          <div className="field">
            <h3 className="display" style={{ fontSize: 20 }}>
              Teams
            </h3>
            <p className="help">Two to six. Teams beat individuals for an ice-breaker.</p>
          </div>
          <div className="stack" style={{ gap: 9, marginTop: 12 }}>
            {teams.map((t, i) => (
              <div className="team-row" key={i}>
                <span className="dot" style={{ background: TEAM_COLORS[i] }} />
                <input
                  className="input"
                  value={t.name}
                  maxLength={18}
                  placeholder={`Team ${i + 1}`}
                  onChange={(e) =>
                    setTeams((ts) => ts.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                />
                {teams.length > 2 && (
                  <button
                    className="rm"
                    title="Remove"
                    onClick={() => setTeams((ts) => ts.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            className="btn btn--ghost"
            style={{ marginTop: 10 }}
            disabled={teams.length >= 6}
            onClick={() =>
              setTeams((ts) => (ts.length >= 6 ? ts : [...ts, { name: `Team ${ts.length + 1}`, score: 0, wins: 0 }]))
            }
          >
            + Add team
          </button>
        </section>

        <div className="grid2">
          <section className="card" style={{ padding: 22 }}>
            <div className="field">
              <h3 className="display" style={{ fontSize: 20 }}>
                Category
              </h3>
              <p className="help">Mixed keeps the room guessing.</p>
            </div>
            <div className="opts" style={{ marginTop: 12 }}>
              {catOpts.map((c) => (
                <button
                  key={c.slug}
                  className={"opt" + (cat === c.slug ? " sel" : "")}
                  onClick={() => setCat(c.slug)}
                >
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </button>
              ))}
            </div>
          </section>

          <section className="card" style={{ padding: 22 }}>
            <div className="field">
              <h3 className="display" style={{ fontSize: 20 }}>
                Round length
              </h3>
              <p className="help">Ten to twelve is about eight minutes.</p>
            </div>
            <div className="opts" style={{ marginTop: 12 }}>
              {LEN_OPTS.map((n) => (
                <button key={n} className={"opt" + (len === n ? " sel" : "")} onClick={() => setLen(n)}>
                  {n}
                </button>
              ))}
            </div>
            <h3 className="display" style={{ fontSize: 20, marginTop: 18 }}>
              Timer per puzzle
            </h3>
            <div className="opts" style={{ marginTop: 12 }}>
              {TIME_OPTS.map((n) => (
                <button key={n} className={"opt" + (time === n ? " sel" : "")} onClick={() => setTime(n)}>
                  {n === 0 ? "Off" : `${n}s`}
                </button>
              ))}
            </div>
          </section>
        </div>

        <section className="card" style={{ padding: 22 }}>
          <div className="field">
            <h3 className="display" style={{ fontSize: 20 }}>
              Difficulty ramp
            </h3>
            <p className="help">On: easy puzzles first to warm the room up, hard ones for the end.</p>
          </div>
          <div className="opts" style={{ marginTop: 12 }}>
            <button className={"opt" + (ramp ? " sel" : "")} onClick={() => setRamp(true)}>
              Ramp on
            </button>
            <button className={"opt" + (!ramp ? " sel" : "")} onClick={() => setRamp(false)}>
              Fully random
            </button>
          </div>
        </section>

        <div className="actions">
          <button className="btn btn--lg" onClick={startRound}>
            Start the round →
          </button>
          <button className="btn btn--ghost" onClick={onExit}>
            Back
          </button>
        </div>
      </div>
    );
  }

  // ---------- RESULTS ----------
  if (phase === "over") {
    const ranked = teams.map((t, i) => ({ ...t, i })).sort((a, b) => b.score - a.score);
    const top = ranked[0];
    const tie = ranked.filter((t) => t.score === top.score).length > 1;
    return (
      <section className="card result">
        <div className="medal">{tie ? "🤝" : "🏆"}</div>
        <h2>
          {tie
            ? "It's a tie — " + ranked.filter((t) => t.score === top.score).map((t) => t.name).join(" & ")
            : `${top.name} wins`}
        </h2>
        <p className="answer-note">
          {deck.length} puzzles · {ranked.reduce((s, t) => s + t.wins, 0)} solved in the room
        </p>
        <div className="standings">
          {ranked.map((t, r) => (
            <div className={"srow" + (r === 0 && !tie ? " first" : "")} key={t.i}>
              <span className="rank">{r + 1}</span>
              <span className="nm" style={{ color: TEAM_COLORS[t.i] }}>
                {t.name}
              </span>
              <span className="won">
                {t.wins} puzzle{t.wins === 1 ? "" : "s"}
              </span>
              <span className="sc">{t.score}</span>
            </div>
          ))}
        </div>
        <div className="actions" style={{ justifyContent: "center", marginTop: 20 }}>
          <button className="btn" onClick={startRound}>
            Rematch — same teams
          </button>
          <button className="btn btn--ghost" onClick={() => setPhase("setup")}>
            Change setup
          </button>
          <button className="btn btn--ghost" onClick={onExit}>
            Menu
          </button>
        </div>
      </section>
    );
  }

  // ---------- PLAY ----------
  const pct = time ? Math.max(0, (timeLeft / time) * 100) : 100;
  const catName = cur ? payload.categories.find((c) => c.slug === cur.categorySlug)?.name ?? "Mixed" : "Mixed";

  return (
    <div className="stage">
      <div className="topline">
        <span className="chip">{catName}</span>
        <span className="diffdots" title={cur ? DIFF_LABEL[cur.difficulty] : ""}>
          {[1, 2, 3].map((n) => (
            <i key={n} className={cur && n <= cur.difficulty ? "on" : ""} />
          ))}
        </span>
        <span className="spacer" />
        <span className="chip">
          {idx + 1} / {deck.length}
        </span>
        <button className="icon-btn" onClick={onExit} title="Quit round" aria-label="Quit">
          ✕
        </button>
      </div>

      <div className={"timerbar" + (timeUp ? " up" : "")}>
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="bigstage">
        {cur ? renderPuzzle(cur, "host") : null}
        <div className="reveal">
          {!revealed ? (
            <>
              <div className="hidden-answer">
                {cur?.answers[0]
                  .split(" ")
                  .map((w) => "•".repeat(w.length))
                  .join("   ")}
              </div>
              <div className="answer-note">
                {cur ? cur.answers[0].split(" ").length : 0} word
                {cur && cur.answers[0].split(" ").length > 1 ? "s" : ""} · worth{" "}
                {cur ? POINTS[cur.difficulty] : 0} points
              </div>
            </>
          ) : (
            <>
              <div className="answer-big">{cur?.answers[0]}</div>
              {cur?.note && <div className="answer-note">{cur.note}</div>}
              {awarded !== null ? (
                <div className="answer-note" style={{ color: TEAM_COLORS[awarded] }}>
                  +{cur ? POINTS[cur.difficulty] : 0} to {teams[awarded].name}
                </div>
              ) : (
                <div className="answer-note">No points this round</div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="teams" style={{ gridTemplateColumns: `repeat(${Math.min(teams.length, 6)}, 1fr)` }}>
        {teams.map((t, i) => (
          <button
            className={"team" + (awarded === i ? " won" : "")}
            key={i}
            style={{ borderColor: awarded === i ? TEAM_COLORS[i] : undefined }}
            onClick={() => award(i)}
          >
            <div className="nm" style={{ color: TEAM_COLORS[i] }}>
              {t.name}
            </div>
            <div className="sc">{t.score}</div>
            <div className="key">press {i + 1}</div>
          </button>
        ))}
      </div>

      <div className="hostbar">
        <button className="btn btn--ghost" onClick={revealNobody} disabled={revealed}>
          Nobody got it — reveal
        </button>
        <button className="btn" onClick={next}>
          {idx === deck.length - 1 ? "Finish →" : "Next puzzle →"}
        </button>
        <div className="hint">
          <kbd>1</kbd>–<kbd>6</kbd> award · <kbd>R</kbd> reveal · <kbd>Space</kbd> next · <kbd>Esc</kbd> quit
        </div>
      </div>
    </div>
  );
}
