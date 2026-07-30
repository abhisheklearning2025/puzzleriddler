// Seeds both games from the committed JSON. Idempotent — safe to re-run.
// Invoked by `prisma db seed` (see prisma.config.ts) or directly:
//   npx tsx prisma/seed.ts
import { readFileSync } from "node:fs";
import path from "node:path";

// Load local env before anything touches the DB (the client reads DATABASE_URL
// at construction). `lib/db` is imported dynamically *after* this for that reason.
try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {
  // env may already be present (CI) — ignore a missing .env.local.
}

type SeedCategory = { slug: string; name: string; icon: string; sortOrder: number };
type EmojiPuzzle = { e: string; a: string[]; d: number; h: string };
type DingbatsPuzzle = { a: string[]; d: number; h: string; content: unknown };

type GameMeta = {
  slug: string;
  name: string;
  tagline: string;
  kind: "EMOJI" | "DINGBATS";
  sortOrder: number;
};

function readJson<T>(rel: string): T {
  return JSON.parse(readFileSync(path.join("prisma", "data", rel), "utf8")) as T;
}

async function main() {
  const { prisma } = await import("../lib/db");

  const emoji = readJson<{ categories: SeedCategory[]; puzzles: Record<string, EmojiPuzzle[]> }>(
    "emoji.seed.json",
  );
  const dingbats = readJson<{ categories: SeedCategory[]; puzzles: Record<string, DingbatsPuzzle[]> }>(
    "dingbats.seed.json",
  );

  async function seedGame(
    meta: GameMeta,
    categories: SeedCategory[],
    puzzlesByCat: Record<string, (EmojiPuzzle | DingbatsPuzzle)[]>,
  ) {
    const game = await prisma.game.upsert({
      where: { slug: meta.slug },
      update: { name: meta.name, tagline: meta.tagline, kind: meta.kind, sortOrder: meta.sortOrder },
      create: {
        slug: meta.slug,
        name: meta.name,
        tagline: meta.tagline,
        kind: meta.kind,
        sortOrder: meta.sortOrder,
      },
    });

    for (const cat of categories) {
      const category = await prisma.category.upsert({
        where: { gameId_slug: { gameId: game.id, slug: cat.slug } },
        update: { name: cat.name, icon: cat.icon, sortOrder: cat.sortOrder },
        create: {
          gameId: game.id,
          slug: cat.slug,
          name: cat.name,
          icon: cat.icon,
          sortOrder: cat.sortOrder,
        },
      });

      // Rebuild puzzles for a clean, idempotent re-seed.
      await prisma.puzzle.deleteMany({ where: { categoryId: category.id } });

      const list = puzzlesByCat[cat.slug] ?? [];
      await prisma.puzzle.createMany({
        data: list.map((p, i) => ({
          gameId: game.id,
          categoryId: category.id,
          answers: p.a,
          note: p.h ?? "",
          difficulty: p.d,
          content:
            meta.kind === "EMOJI"
              ? { emoji: (p as EmojiPuzzle).e }
              : ((p as DingbatsPuzzle).content as object),
          sortOrder: i,
        })),
      });
    }

    const count = await prisma.puzzle.count({ where: { gameId: game.id } });
    console.log(`  ${meta.slug}: ${categories.length} categories, ${count} puzzles`);
  }

  console.log("Seeding games…");
  await seedGame(
    { slug: "emoji", name: "Guessemojiddle", tagline: "Three emoji. One answer.", kind: "EMOJI", sortOrder: 0 },
    emoji.categories,
    emoji.puzzles,
  );
  await seedGame(
    { slug: "dingbats", name: "Dingbats", tagline: "Read the layout. Say the phrase.", kind: "DINGBATS", sortOrder: 1 },
    dingbats.categories,
    dingbats.puzzles,
  );

  await prisma.adminSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, cacheTtlSeconds: 86400 },
  });

  await prisma.$disconnect();
  console.log("Seed complete ✅");
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
