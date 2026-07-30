// Forgiving answer matching — ported verbatim from emojiguess.html.
// The subtle rules matter and must not drift: short answers (≤4 chars) get NO
// typo forgiveness (one edit on "GOT" makes "Goa"); the "so close" nudge is
// only honest on longer answers.

export type MatchResult = "exact" | "close" | "no";

const NOISE = new Set([
  "the", "a", "an", "of", "and", "in", "on", "is", "it", "to",
  "ka", "ke", "ki", "ek", "aur",
]);

export const norm = (s: string): string =>
  String(s)
    .toLowerCase()
    .replace(/[‘’“”]/g, "'")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const core = (s: string): string =>
  norm(s)
    .split(" ")
    .filter((w) => w && !NOISE.has(w))
    .join("");

export function lev(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length,
    n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  let cur: number[] = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    cur[0] = i;
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    [prev, cur] = [cur, prev];
  }
  return prev[n];
}

export function check(guess: string, answers: string[]): MatchResult {
  const g = core(guess);
  if (!g) return "no";
  let warm = false;
  for (const ans of answers) {
    const c = core(ans);
    if (!c) continue;
    if (g === c) return "exact";
    // short answers get NO typo forgiveness — one edit on "GOT" makes "Goa"
    const tol = c.length <= 4 ? 0 : c.length <= 6 ? 1 : c.length <= 12 ? 2 : 3;
    const d = lev(g, c);
    if (d <= tol) return "exact";
    if (c.length >= 7 && (c.includes(g) || g.includes(c)) && Math.abs(c.length - g.length) <= 4)
      return "exact";
    // the "so close" nudge is only honest on longer answers — on a 3-letter
    // alias, one edit away is a completely different word, not a typo
    if (c.length >= 5 && d <= tol + 2) warm = true;
    if (c.length >= 7 && (c.startsWith(g) || g.startsWith(c)) && g.length >= Math.ceil(c.length * 0.6))
      warm = true;
  }
  return warm ? "close" : "no";
}
