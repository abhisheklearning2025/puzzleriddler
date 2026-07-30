import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getGameAdmin } from "@/lib/data/admin";
import { PuzzleManager } from "@/components/admin/PuzzleManager";
import { PromptBuilder } from "@/components/admin/PromptBuilder";

async function PuzzlesBody({ params }: { params: Promise<{ gameSlug: string }> }) {
  await connection();
  const { gameSlug } = await params;
  const game = await getGameAdmin(gameSlug);
  if (!game) notFound();

  const categories = game.categories.map((c) => ({ id: c.id, name: c.name }));
  const puzzles = game.puzzles.map((p) => ({
    id: p.id,
    categoryId: p.categoryId,
    categoryName: p.category.name,
    answers: p.answers,
    note: p.note,
    difficulty: p.difficulty,
    content: (p.content ?? {}) as { emoji?: string; layout?: { text: string }[] },
  }));

  return (
    <>
      <h1>{game.name} · Puzzles</h1>
      <p className="help">Add, edit or remove puzzles — changes appear in the live game immediately.</p>
      <PromptBuilder gameName={game.name} kind={game.kind} categories={categories} puzzles={puzzles} />
      <section className="card" style={{ padding: 18, marginTop: 12 }}>
        <PuzzleManager gameId={game.id} kind={game.kind} categories={categories} puzzles={puzzles} />
      </section>
    </>
  );
}

export default function PuzzlesPage({ params }: { params: Promise<{ gameSlug: string }> }) {
  return (
    <Suspense fallback={<p className="help">Loading…</p>}>
      <PuzzlesBody params={params} />
    </Suspense>
  );
}
