import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import emojiSeed from "@/prisma/data/emoji.seed.json";
import dingbatsSeed from "@/prisma/data/dingbats.seed.json";
import type { GamePayload, PayloadPuzzle, Difficulty } from "@/lib/games/types";
import { getCacheTtl } from "./settings";

const SEED_META: Record<string, { name: string; tagline: string; kind: "EMOJI" | "DINGBATS" }> = {
  emoji: { name: "Guessemojiddle", tagline: "Three emoji. One answer.", kind: "EMOJI" },
  dingbats: { name: "Dingbats", tagline: "Read the layout. Say the phrase.", kind: "DINGBATS" },
};

/** Build a payload from the committed seed JSON (used before a DB is wired). */
function fallbackPayload(slug: string): GamePayload | null {
  const seed = slug === "emoji" ? emojiSeed : slug === "dingbats" ? dingbatsSeed : null;
  const meta = SEED_META[slug];
  if (!seed || !meta) return null;

  const categories = seed.categories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon }));
  const puzzles: PayloadPuzzle[] = [];
  for (const c of seed.categories) {
    const list = (seed.puzzles as Record<string, unknown[]>)[c.slug] ?? [];
    list.forEach((raw, i) => {
      const p = raw as { e?: string; a: string[]; d: number; h?: string; content?: unknown };
      puzzles.push({
        id: `${slug}-${c.slug}-${i}`,
        answers: p.a,
        note: p.h ?? "",
        difficulty: p.d as Difficulty,
        categorySlug: c.slug,
        categoryName: c.name,
        content: slug === "emoji" ? { emoji: p.e } : (p.content as Record<string, unknown>),
      });
    });
  }
  return { slug, name: meta.name, tagline: meta.tagline, kind: meta.kind, categories, puzzles };
}

async function loadGamePayload(slug: string, ttlSeconds: number): Promise<GamePayload | null> {
  "use cache";
  cacheTag(`game:${slug}`);
  cacheLife({ stale: 300, revalidate: ttlSeconds, expire: ttlSeconds * 2 });

  if (!process.env.DATABASE_URL) return fallbackPayload(slug);

  const { prisma } = await import("@/lib/db");
  const game = await prisma.game.findUnique({
    where: { slug },
    include: {
      categories: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      puzzles: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: { category: true },
      },
    },
  });
  if (!game) return null;

  return {
    slug: game.slug,
    name: game.name,
    tagline: game.tagline,
    kind: game.kind,
    categories: game.categories.map((c) => ({ slug: c.slug, name: c.name, icon: c.icon })),
    puzzles: game.puzzles.map((p) => ({
      id: p.id,
      answers: p.answers,
      note: p.note,
      difficulty: p.difficulty as Difficulty,
      categorySlug: p.category.slug,
      categoryName: p.category.name,
      content: p.content as Record<string, unknown>,
    })),
  };
}

/** Public reader: resolves the admin TTL, then returns the cached payload
 *  keyed by (slug, ttl) so a TTL change naturally produces a fresh entry. */
export async function getGamePayload(slug: string): Promise<GamePayload | null> {
  const ttl = await getCacheTtl();
  return loadGamePayload(slug, ttl);
}
