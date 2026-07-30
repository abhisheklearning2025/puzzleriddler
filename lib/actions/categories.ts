"use server";

import { z } from "zod";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export type ActionState = { ok?: boolean; error?: string };

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(40),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Slug: lowercase letters, numbers and dashes only"),
  icon: z.string().trim().max(8).optional().default(""),
});

async function invalidate(gameId: string) {
  const g = await prisma.game.findUnique({ where: { id: gameId }, select: { slug: true } });
  if (g) updateTag(`game:${g.slug}`);
  updateTag("games");
}

export async function createCategory(gameId: string, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    icon: formData.get("icon") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    const max = await prisma.category.aggregate({ where: { gameId }, _max: { sortOrder: true } });
    await prisma.category.create({
      data: { gameId, ...parsed.data, sortOrder: (max._max.sortOrder ?? 0) + 1 },
    });
  } catch {
    return { error: "Could not create — that slug may already exist in this game." };
  }
  await invalidate(gameId);
  return { ok: true };
}

export async function updateCategory(id: string, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = schema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    icon: formData.get("icon") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const cat = await prisma.category.findUnique({ where: { id }, select: { gameId: true } });
  if (!cat) return { error: "Category not found." };
  try {
    await prisma.category.update({ where: { id }, data: parsed.data });
  } catch {
    return { error: "Could not update — that slug may already exist in this game." };
  }
  await invalidate(cat.gameId);
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionState> {
  await requireAdmin();
  const cat = await prisma.category.findUnique({ where: { id }, select: { gameId: true } });
  if (!cat) return { error: "Category not found." };
  await prisma.category.delete({ where: { id } }); // cascades to its puzzles
  await invalidate(cat.gameId);
  return { ok: true };
}
