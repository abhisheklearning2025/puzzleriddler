import type { Difficulty } from "./engine/score";

export type { Difficulty };

/** One puzzle, shaped for the client. `content` is game-specific:
 *  EMOJI → { emoji: string }; DINGBATS → { layout, style }. */
export interface PayloadPuzzle {
  id: string;
  answers: string[];
  note: string;
  difficulty: Difficulty;
  categorySlug: string;
  categoryName: string;
  content: Record<string, unknown>;
}

export interface PayloadCategory {
  slug: string;
  name: string;
  icon: string;
}

export interface GamePayload {
  slug: string;
  name: string;
  tagline: string;
  kind: "EMOJI" | "DINGBATS";
  categories: PayloadCategory[];
  puzzles: PayloadPuzzle[];
}
