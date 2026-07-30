// One-time extraction of the hardcoded PUZZLES/BUILTIN_CATEGORIES from the
// reference HTML into a deterministic seed JSON. Run once (committed output):
//   npx tsx scripts/extract-emoji-seed.ts
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const html = readFileSync("reference/emojiguess.html", "utf8");

// Balanced-bracket scanner that skips string literals — robust against the
// many nested braces/brackets and emoji inside the data object.
function extractLiteral(source: string, marker: string, open: "{" | "["): string {
  const markerIdx = source.indexOf(marker);
  if (markerIdx < 0) throw new Error(`marker not found: ${marker}`);
  const litStart = source.indexOf(open, markerIdx);
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let quote = "";
  let esc = false;
  for (let i = litStart; i < source.length; i++) {
    const ch = source[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === quote) inStr = false;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inStr = true;
      quote = ch;
    } else if (ch === open) {
      depth++;
    } else if (ch === close) {
      depth--;
      if (depth === 0) return source.slice(litStart, i + 1);
    }
  }
  throw new Error(`unbalanced literal for ${marker}`);
}

type RawCat = { id: string; name: string; icon: string };
type RawPuzzle = { e: string; a: string[]; d: number; h?: string };

const catsLit = extractLiteral(html, "const BUILTIN_CATEGORIES=", "[");
const puzzlesLit = extractLiteral(html, "const PUZZLES=", "{");

// The literals are pure data (strings/numbers/arrays) from a trusted local
// file — safe to evaluate in isolation.
const categoriesRaw = Function(`"use strict";return (${catsLit});`)() as RawCat[];
const puzzlesRaw = Function(`"use strict";return (${puzzlesLit});`)() as Record<string, RawPuzzle[]>;

const categories = categoriesRaw.map((c, idx) => ({
  slug: c.id,
  name: c.name,
  icon: c.icon,
  sortOrder: idx,
}));

const puzzles: Record<string, { e: string; a: string[]; d: number; h: string }[]> = {};
let total = 0;
for (const c of categories) {
  const list = puzzlesRaw[c.slug] ?? [];
  puzzles[c.slug] = list.map((p) => ({ e: p.e, a: p.a, d: p.d, h: p.h ?? "" }));
  total += list.length;
}

mkdirSync("prisma/data", { recursive: true });
writeFileSync(
  "prisma/data/emoji.seed.json",
  JSON.stringify({ categories, puzzles }, null, 2) + "\n",
);
console.log(`Wrote prisma/data/emoji.seed.json — ${categories.length} categories, ${total} puzzles`);
