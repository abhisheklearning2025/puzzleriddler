// Grapheme-safe emoji handling — ported verbatim from emojiguess.html.
// Flags and ZWJ sequences must not be split, so we spell out one grapheme
// per visual glyph and join with spaces for display.

const SEG =
  typeof Intl !== "undefined" && "Segmenter" in Intl
    ? new Intl.Segmenter(undefined, { granularity: "grapheme" })
    : null;

export function graphemes(str: string): string[] {
  if (SEG) return [...SEG.segment(str)].map((s) => s.segment);
  return (
    str.match(
      /(?:\p{RI}\p{RI}|\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?(?:‍\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?)*|[\d#*]️?⃣|.)/gsu,
    ) || [str]
  );
}

/** Space out an emoji string one grapheme at a time (e.g. "🪙🔫🐴" → "🪙 🔫 🐴"). */
export function emo(s: string): string {
  return graphemes(s).join(" ");
}
