"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GamePayload, PayloadPuzzle } from "@/lib/games/types";
import { buildDeck } from "@/lib/games/engine/deck";
import { check } from "@/lib/games/engine/match";
import { ROUND, LIVES, STREAK_BONUS, pointsNow } from "@/lib/games/engine/score";
import { track } from "./track";
import type { useAudio } from "./useAudio";
import type { RenderPuzzle } from "./render";

type Audio = ReturnType<typeof useAudio>;
type LogEntry = { puzzle: PayloadPuzzle; ok: boolean; pts: number };

const lettersOf = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "").split("");

export function SoloMode({
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
  const [phase, setPhase] = useState<"pick" | "play" | "over">("pick");
  const [cat, setCat] = useState("all");
  const [deck, setDeck] = useState<PayloadPuzzle[]>([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [solved, setSolved] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(LIVES);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [clueUsed, setClueUsed] = useState(false);
  const [locked, setLocked] = useState(false);
  const [guess, setGuess] = useState("");
  const [verdict, setVerdict] = useState<{ kind: string; html: string } | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const poolFor = useCallback(
    (c: string) => (c === "all" ? payload.puzzles : payload.puzzles.filter((p) => p.categorySlug === c)),
    [payload],
  );

  const cur = deck[idx];

  const startRound = useCallback(() => {
    setDeck(buildDeck(poolFor(cat), ROUND, true));
    setIdx(0);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setSolved(0);
    setLog([]);
    setPhase("play");
  }, [poolFor, cat]);

  useEffect(() => {
    if (phase !== "play") return;
    setLives(LIVES);
    setRevealed(new Set());
    setClueUsed(false);
    setLocked(false);
    setGuess("");
    setVerdict(null);
    inputRef.current?.focus();
  }, [idx, phase]);

  const doShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 360);
  }, []);

  const endPuzzle = useCallback(() => {
    setLocked(true);
    if (cur) setRevealed(new Set(lettersOf(cur.answers[0])));
  }, [cur]);

  const submit = useCallback(() => {
    if (locked || !cur) return;
    const g = guess.trim();
    if (!g) return;
    const r = check(g, cur.answers);
    if (r === "exact") {
      const livesUsed = LIVES - lives;
      const pts = pointsNow(livesUsed, revealed.size, clueUsed) + streak * STREAK_BONUS;
      const ns = streak + 1;
      setScore((s) => s + pts);
      setSolved((s) => s + 1);
      setStreak(ns);
      setBestStreak((b) => Math.max(b, ns));
      setLog((l) => [...l, { puzzle: cur, ok: true, pts }]);
      setVerdict({
        kind: "good",
        html: `✅ ${cur.answers[0]} — +${pts}${ns > 1 ? ` · ${ns} in a row 🔥` : ""}`,
      });
      track("solve", payload.slug);
      audio.beep([784, 1047], 0.13);
      endPuzzle();
    } else if (r === "close") {
      setVerdict({ kind: "warm", html: "🔥 So close — check your spelling. That one's free." });
      doShake();
    } else {
      const nl = lives - 1;
      setLives(nl);
      if (nl <= 0) {
        setStreak(0);
        setLog((l) => [...l, { puzzle: cur, ok: false, pts: 0 }]);
        setVerdict({ kind: "bad", html: `❌ Out of guesses. It was ${cur.answers[0]}.` });
        audio.beep([300, 240], 0.18, "triangle");
        endPuzzle();
      } else {
        setVerdict({ kind: "bad", html: `❌ Not it — ${nl} guess${nl === 1 ? "" : "es"} left.` });
        doShake();
      }
    }
  }, [locked, cur, guess, lives, revealed, clueUsed, streak, audio, endPuzzle, doShake]);

  const revealLetter = useCallback(() => {
    if (locked || !cur) return;
    const left = [...new Set(lettersOf(cur.answers[0]))].filter((c) => !revealed.has(c));
    if (!left.length) return;
    const pick = left[Math.floor(Math.random() * left.length)];
    setRevealed((r) => new Set([...r, pick]));
    inputRef.current?.focus();
  }, [locked, cur, revealed]);

  const skip = useCallback(() => {
    if (locked || !cur) return;
    setStreak(0);
    setLog((l) => [...l, { puzzle: cur, ok: false, pts: 0 }]);
    setVerdict({ kind: "bad", html: `⏭ Skipped. It was ${cur.answers[0]}.` });
    endPuzzle();
  }, [locked, cur, endPuzzle]);

  const finish = useCallback(() => {
    let b = score;
    try {
      b = Math.max(Number(localStorage.getItem(`pr_${payload.slug}_best`) || 0), score);
      localStorage.setItem(`pr_${payload.slug}_best`, String(b));
    } catch {}
    setBest(b);
    setPhase("over");
    audio.beep([523, 659, 784], 0.18);
  }, [score, audio, payload.slug]);

  const next = useCallback(() => {
    if (idx >= deck.length - 1) finish();
    else setIdx((i) => i + 1);
  }, [idx, deck.length, finish]);

  const blanks = useMemo(() => {
    if (!cur) return "";
    let out = "";
    for (const ch of cur.answers[0]) {
      if (ch === " ") out += "   ";
      else if (!/[a-zA-Z0-9]/.test(ch)) out += ch;
      else out += revealed.has(ch.toLowerCase()) ? ch.toUpperCase() : "_";
    }
    return out;
  }, [cur, revealed]);

  const lettersLeft = cur ? [...new Set(lettersOf(cur.answers[0]))].filter((c) => !revealed.has(c)).length : 0;

  // ---------- PICK ----------
  if (phase === "pick") {
    const catOpts = [{ slug: "all", name: "🎲 Mixed", icon: "" }, ...payload.categories];
    return (
      <div className="stack">
        <section className="card" style={{ padding: 22 }}>
          <div className="field">
            <h3 className="display" style={{ fontSize: 20 }}>
              Pick a category
            </h3>
            <p className="help">Ten puzzles. Three guesses each — wrong guesses cost you, so think.</p>
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
        <div className="actions">
          <button className="btn btn--lg" onClick={startRound}>
            Start →
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
    const pct = solved / (deck.length || 1);
    const [medal, title, sub] =
      pct === 1
        ? ["🏆", "Flawless", "Every single one."]
        : pct >= 0.8
          ? ["🥇", "Fluent", "You'd host this well."]
          : pct >= 0.5
            ? ["🥈", "Solid round", "Half of them fell."]
            : pct >= 0.3
              ? ["🥉", "Warming up", "The clue button exists for a reason."]
              : ["🌱", "Rough one", "Everyone starts here."];
    return (
      <section className="card result">
        <div className="medal">{medal}</div>
        <h2>{title}</h2>
        <p className="answer-note">
          {sub} · {score} points · {solved}/{deck.length} solved · best streak {bestStreak} · personal
          best {best}
        </p>
        <div className="standings">
          {log.map((l, i) => (
            <div className="srow" key={i}>
              <div className="review-ic">{renderPuzzle(l.puzzle, "mini")}</div>
              <span className="nm">{l.puzzle.answers[0]}</span>
              <span className="sc" style={{ fontSize: 17 }}>
                {l.ok ? `+${l.pts}` : "—"}
              </span>
            </div>
          ))}
        </div>
        <div className="actions" style={{ justifyContent: "center", marginTop: 20 }}>
          <button className="btn" onClick={startRound}>
            Play again
          </button>
          <button className="btn btn--ghost" onClick={onExit}>
            Menu
          </button>
        </div>
      </section>
    );
  }

  // ---------- PLAY ----------
  return (
    <div className="stack">
      <div className="progress">
        <div className="track">
          <div className="fill" style={{ width: `${(idx / deck.length) * 100}%` }} />
        </div>
        <span className="pill">
          {idx + 1} / {deck.length}
        </span>
      </div>

      <section className={"card solo-stage" + (shake ? " shake" : "")}>
        <span className="chip">
          {cur ? payload.categories.find((c) => c.slug === cur.categorySlug)?.name : ""} ·{" "}
          {cur ? ["", "Easy", "Medium", "Hard"][cur.difficulty] : ""}
        </span>
        {cur ? renderPuzzle(cur, "solo") : null}
        <div className="blanks">{blanks}</div>
        <div className="clue">{clueUsed && cur ? `💡 ${cur.note}` : ""}</div>

        <div className="answer">
          <input
            ref={inputRef}
            className="input"
            placeholder="Type your answer…"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={guess}
            disabled={locked}
            onChange={(e) => setGuess(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (locked) next();
                else submit();
              }
            }}
          />
          <button className="btn" onClick={locked ? next : submit}>
            {locked ? (idx === deck.length - 1 ? "See results" : "Next →") : "Guess"}
          </button>
        </div>

        <div className="tools">
          <button className="tool" onClick={revealLetter} disabled={locked || lettersLeft <= 1}>
            🔤 Reveal a letter (−15)
          </button>
          <button className="tool" onClick={() => setClueUsed(true)} disabled={locked || clueUsed}>
            💡 Clue (−25)
          </button>
          <button className="tool" onClick={skip} disabled={locked}>
            ⏭ Skip
          </button>
        </div>

        {verdict && <div className={`verdict ${verdict.kind}`}>{verdict.html}</div>}

        <div className="scorebar">
          <span className="pill">
            Score <b>{score}</b>
          </span>
          <span className="pill">
            Guesses left <b>{Math.max(0, lives)}</b>
          </span>
          <span className="pill">
            Streak <b>{streak}</b>
          </span>
        </div>
      </section>

      <div className="actions">
        <button className="btn btn--ghost" onClick={onExit}>
          Quit
        </button>
      </div>
    </div>
  );
}
