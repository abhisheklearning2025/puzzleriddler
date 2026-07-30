"use server";

import { z } from "zod";
import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type ActionState = { ok?: boolean; error?: string };

const emojiContent = z.object({ emoji: z.string().trim().min(1, "Emoji is required").max(40) });
const dingCell = z.object({
  text: z.string().min(1),
  transform: z.enum(["none", "reverse", "rotate90", "rotate180", "vertical", "mirror"]).optional(),
  position: z.string().optional(),
  repeat: z.number().optional(),
  size: z.enum(["sm", "md", "lg"]).optional(),
});
const dingContent = z.object({
  layout: z.array(dingCell).min(1, "Add at least one cell"),
  style: z.object({ arrangement: z.enum(["stack", "row", "grid", "free"]) }),
});

const base = z.object({
  categoryId: z.string().min(1, "Pick a category"),
  answers: z.array(z.string().trim().min(1)).min(1, "At least one answer"),
  note: z.string().trim().max(400).optional().default(""),
  difficulty: z.coerce.number().int().min(1).max(3),
});

function parseAnswers(raw: unknown): string[] {
  return String(raw ?? "")
    .split(/[\n/]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Validate the base fields + the game-kind-specific content JSON. */
function readForm(kind: "EMOJI" | "DINGBATS", formData: FormData):
  | { ok: true; data: { categoryId: string; answers: string[]; note: string; difficulty: number; content: Prisma.InputJsonValue } }
  | { ok: false; error: string } {
  const parsedBase = base.safeParse({
    categoryId: formData.get("categoryId"),
    answers: parseAnswers(formData.get("answers")),
    note: formData.get("note") ?? "",
    difficulty: formData.get("difficulty"),
  });
  if (!parsedBase.success) return { ok: false, error: parsedBase.error.issues[0].message };

  let content: Prisma.InputJsonValue;
  if (kind === "EMOJI") {
    const c = emojiContent.safeParse({ emoji: formData.get("emoji") });
    if (!c.success) return { ok: false, error: c.error.issues[0].message };
    content = c.data;
  } else {
    let raw: unknown;
    try {
      raw = JSON.parse(String(formData.get("content") ?? ""));
    } catch {
      return { ok: false, error: "Layout must be valid JSON." };
    }
    const c = dingContent.safeParse(raw);
    if (!c.success) return { ok: false, error: `Layout: ${c.error.issues[0].message}` };
    content = c.data as Prisma.InputJsonValue;
  }
  return { ok: true, data: { ...parsedBase.data, content } };
}

async function gameFor(gameId: string) {
  return prisma.game.findUnique({ where: { id: gameId }, select: { slug: true, kind: true } });
}

export async function createPuzzle(gameId: string, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const game = await gameFor(gameId);
  if (!game) return { error: "Game not found." };
  const parsed = readForm(game.kind, formData);
  if (!parsed.ok) return { error: parsed.error };

  const max = await prisma.puzzle.aggregate({
    where: { categoryId: parsed.data.categoryId },
    _max: { sortOrder: true },
  });
  await prisma.puzzle.create({
    data: { gameId, ...parsed.data, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });

  updateTag(`game:${game.slug}`);
  updateTag("games");
  return { ok: true };
}

export async function updatePuzzle(id: string, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const existing = await prisma.puzzle.findUnique({ where: { id }, select: { gameId: true } });
  if (!existing) return { error: "Puzzle not found." };
  const game = await gameFor(existing.gameId);
  if (!game) return { error: "Game not found." };
  const parsed = readForm(game.kind, formData);
  if (!parsed.ok) return { error: parsed.error };

  await prisma.puzzle.update({ where: { id }, data: parsed.data });
  updateTag(`game:${game.slug}`);
  updateTag("games");
  return { ok: true };
}

export async function deletePuzzle(id: string): Promise<ActionState> {
  await requireAdmin();
  const existing = await prisma.puzzle.findUnique({ where: { id }, select: { gameId: true } });
  if (!existing) return { error: "Puzzle not found." };
  const game = await gameFor(existing.gameId);
  await prisma.puzzle.delete({ where: { id } });
  if (game) updateTag(`game:${game.slug}`);
  updateTag("games");
  return { ok: true };
}
