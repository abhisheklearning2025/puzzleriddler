import Link from "next/link";
import type { GameSummary } from "@/lib/data/games";

export function GameCard({ game }: { game: GameSummary }) {
  return (
    <Link href={`/games/${game.slug}`} className="card game-tile">
      <span className="ic emoji">{game.icon}</span>
      <span className="t">{game.name}</span>
      <span className="d">{game.tagline}</span>
      <span className="meta">
        <span className="tag">{game.puzzleCount} puzzles</span>
        <span className="chip">{game.categoryCount} categories</span>
      </span>
    </Link>
  );
}
