import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import emojiSeed from "@/prisma/data/emoji.seed.json";
import dingbatsSeed from "@/prisma/data/dingbats.seed.json";

export type GameSummary = {
  slug: string;
  name: string;
  tagline: string;
  kind: "EMOJI" | "DINGBATS";
  icon: string;
  puzzleCount: number;
  categoryCount: number;
};

const ICON: Record<string, string> = { emoji: "🧩", dingbats: "🔤" };

function countPuzzles(seed: { puzzles: Record<string, unknown[]> }): number {
  return Object.values(seed.puzzles).reduce((n, list) => n + list.length, 0);
}

/** Fallback used until a real DATABASE_URL is configured. */
function fallbackGames(): GameSummary[] {
  return [
    {
      slug: "emoji",
      name: "Guessemojiddle",
      tagline: "Three emoji. One answer.",
      kind: "EMOJI",
      icon: ICON.emoji,
      puzzleCount: countPuzzles(emojiSeed),
      categoryCount: emojiSeed.categories.length,
    },
    {
      slug: "dingbats",
      name: "Dingbats",
      tagline: "Read the layout. Say the phrase.",
      kind: "DINGBATS",
      icon: ICON.dingbats,
      puzzleCount: countPuzzles(dingbatsSeed),
      categoryCount: dingbatsSeed.categories.length,
    },
  ];
}

export async function getGames(): Promise<GameSummary[]> {
  "use cache";
  cacheTag("games");
  cacheLife("max"); // invalidated on admin writes

  if (!process.env.DATABASE_URL) return fallbackGames();

  const { prisma } = await import("@/lib/db");
  const games = await prisma.game.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { puzzles: true, categories: true } } },
  });
  return games.map((g) => ({
    slug: g.slug,
    name: g.name,
    tagline: g.tagline,
    kind: g.kind,
    icon: ICON[g.slug] ?? "🎲",
    puzzleCount: g._count.puzzles,
    categoryCount: g._count.categories,
  }));
}
