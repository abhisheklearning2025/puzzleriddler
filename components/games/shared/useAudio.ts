"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Beep = (freqs: number[], dur?: number, type?: OscillatorType) => void;

/** Short synthesised tones — no audio files. Ported from emojiguess.html.
 *  The AudioContext is created lazily on first use (autoplay policy). */
export function useAudio(): { beep: Beep; soundOn: boolean; toggleSound: () => void } {
  const [soundOn, setSoundOn] = useState(true);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      setSoundOn(localStorage.getItem("pr_sound") !== "0");
    } catch {}
  }, []);

  const beep = useCallback<Beep>(
    (freqs, dur = 0.16, type = "sine") => {
      if (!soundOn) return;
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const actx = (ctxRef.current ??= new AC());
        freqs.forEach((f, i) => {
          const o = actx.createOscillator();
          const g = actx.createGain();
          o.type = type;
          o.frequency.value = f;
          const t0 = actx.currentTime + i * dur * 0.75;
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.16, t0 + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
          o.connect(g);
          g.connect(actx.destination);
          o.start(t0);
          o.stop(t0 + dur + 0.02);
        });
      } catch {}
    },
    [soundOn],
  );

  const toggleSound = useCallback(() => {
    setSoundOn((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("pr_sound", next ? "1" : "0");
      } catch {}
      if (next) {
        // small confirmation blip
        try {
          const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          const actx = (ctxRef.current ??= new AC());
          const o = actx.createOscillator();
          const g = actx.createGain();
          o.frequency.value = 660;
          const t0 = actx.currentTime;
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.14, t0 + 0.015);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
          o.connect(g);
          g.connect(actx.destination);
          o.start(t0);
          o.stop(t0 + 0.12);
        } catch {}
      }
      return next;
    });
  }, []);

  return { beep, soundOn, toggleSound };
}
