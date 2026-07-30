// Scoring constants + solo point curve — ported verbatim from emojiguess.html.

export type Difficulty = 1 | 2 | 3;

/** Host mode: points awarded per puzzle by difficulty. */
export const POINTS: Record<Difficulty, number> = { 1: 10, 2: 20, 3: 30 };

/** Solo mode tuning. */
export const ROUND = 10; // puzzles per solo round
export const LIVES = 3; // guesses per puzzle
export const DECAY = [100, 70, 45]; // base points by number of wrong guesses so far
export const LETTER_COST = 15; // per revealed letter
export const CLUE_COST = 25; // for showing the note
export const STREAK_BONUS = 10; // per consecutive solve

/**
 * Solo points available right now.
 * @param livesUsed    wrong guesses so far (LIVES - livesRemaining)
 * @param revealedCount number of letters revealed
 * @param clueUsed      whether the clue/note was shown
 */
export function pointsNow(livesUsed: number, revealedCount: number, clueUsed: boolean): number {
  const base = DECAY[livesUsed] ?? DECAY[DECAY.length - 1];
  return Math.max(10, base - revealedCount * LETTER_COST - (clueUsed ? CLUE_COST : 0));
}
