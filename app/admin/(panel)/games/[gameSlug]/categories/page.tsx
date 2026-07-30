import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getGameAdmin } from "@/lib/data/admin";
import { CategoryManager } from "@/components/admin/CategoryManager";

async function CategoriesBody({ params }: { params: Promise<{ gameSlug: string }> }) {
  await connection();
  const { gameSlug } = await params;
  const game = await getGameAdmin(gameSlug);
  if (!game) notFound();

  const categories = game.categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    icon: c.icon,
    count: c._count.puzzles,
  }));

  return (
    <>
      <h1>{game.name} · Categories</h1>
      <p className="help">Categories group puzzles and appear as filters inside the game.</p>
      <section className="card" style={{ padding: 18, marginTop: 12 }}>
        <CategoryManager gameId={game.id} categories={categories} />
      </section>
    </>
  );
}

export default function CategoriesPage({ params }: { params: Promise<{ gameSlug: string }> }) {
  return (
    <Suspense fallback={<p className="help">Loading…</p>}>
      <CategoriesBody params={params} />
    </Suspense>
  );
}
