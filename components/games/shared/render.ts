import type { ReactNode } from "react";
import type { PayloadPuzzle } from "@/lib/games/types";

/** How a puzzle is being shown: full host stage, solo card, or a review row. */
export type PuzzleVariant = "host" | "solo" | "mini";

/** Each game supplies one of these; it's the ONLY thing that differs between
 *  the emoji game and dingbats — everything else (scoring, teams, timer,
 *  matching) is shared. */
export type RenderPuzzle = (puzzle: PayloadPuzzle, variant: PuzzleVariant) => ReactNode;
