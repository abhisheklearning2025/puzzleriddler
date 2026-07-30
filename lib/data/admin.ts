import "server-only";
import { prisma } from "@/lib/db";

export async function listGamesAdmin() {
  return prisma.game.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true, kind: true },
  });
}

export async function getGameAdmin(slug: string) {
  return prisma.game.findUnique({
    where: { slug },
    include: {
      categories: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { puzzles: true } } } },
      puzzles: {
        orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
        include: { category: { select: { name: true, slug: true } } },
      },
    },
  });
}
