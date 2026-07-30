// Deck building — ported from emojiguess.html buildDeck/shuffle, generalized
// to operate on any puzzle array (the server payload) rather than a global
// PUZZLES object. Shared by both games.

export function shuffle<T>(input: readonly T[]): T[] {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick `n` puzzles from a pool, optionally ramped easy → hard.
 * @param pool puzzles already filtered to the chosen category (or all)
 */
export function buildDeck<T extends { difficulty: number }>(
  pool: readonly T[],
  n: number,
  ramp: boolean,
): T[] {
  const deck = shuffle(pool).slice(0, Math.min(n, pool.length));
  if (ramp) deck.sort((a, b) => a.difficulty - b.difficulty);
  return deck;
}
