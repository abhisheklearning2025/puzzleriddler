// Parity smoke test for the ported engine. Run: npx tsx scripts/check-engine.ts
import { check } from "../lib/games/engine/match";
import { emo, graphemes } from "../lib/games/engine/grapheme";
import { buildDeck } from "../lib/games/engine/deck";
import { pointsNow } from "../lib/games/engine/score";

let fails = 0;
function eq<T>(label: string, got: T, want: T) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) {
    fails++;
    console.error(`FAIL  ${label}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
  } else {
    console.log(`ok    ${label}`);
  }
}

// --- answer matching (the subtle parity cases from the plan) ---
eq("exact basic", check("Sholay", ["Sholay"]), "exact");
eq("trailing space + case", check("sholay ", ["Sholay"]), "exact");
eq("alias match", check("DDLJ", ["Dilwale Dulhania Le Jayenge", "DDLJ"]), "exact");
eq("noise words ignored", check("the lion king", ["The Lion King", "Lion King"]), "exact");
eq("typo tolerance on long answer", check("interstelar", ["Interstellar"]), "exact");
eq("substring on long answer", check("avenger", ["The Avengers", "Avengers"]), "exact");
eq("short alias must NOT fuzzy-match (GOT vs Goa)", check("GOT", ["Goa"]), "no");
eq("empty guess", check("", ["Sholay"]), "no");

// --- grapheme spacing ---
eq("emo spaces three emoji", emo("🪙🔫🐴"), "🪙 🔫 🐴");
eq("flag stays one grapheme", graphemes("🇮🇳").length, 1);

// --- deck ramp ---
const ramped = buildDeck(
  [{ difficulty: 3 }, { difficulty: 1 }, { difficulty: 2 }],
  3,
  true,
).map((p) => p.difficulty);
eq("ramp sorts easy→hard", ramped, [1, 2, 3]);

// --- solo points curve ---
eq("full points, no help", pointsNow(0, 0, false), 100);
eq("one wrong guess", pointsNow(1, 0, false), 70);
eq("letter + clue penalties", pointsNow(0, 1, true), 60);
eq("never below floor", pointsNow(2, 3, true), 10);

console.log(fails ? `\n${fails} FAILED` : "\nALL PASS ✅");
process.exit(fails ? 1 : 0);
