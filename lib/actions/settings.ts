"use server";

import { revalidateTag, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export type ActionState = { ok?: boolean; error?: string };

export async function updateCacheTtl(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const hours = Number(formData.get("hours"));
  if (!Number.isFinite(hours) || hours <= 0 || hours > 720) {
    return { error: "Enter a whole number of hours between 1 and 720." };
  }
  const cacheTtlSeconds = Math.round(hours * 3600);
  await prisma.adminSettings.upsert({
    where: { id: 1 },
    update: { cacheTtlSeconds },
    create: { id: 1, cacheTtlSeconds },
  });

  // New TTL is baked into the game cache entries, so refresh those too.
  updateTag("settings");
  revalidateTag("game:emoji", "max");
  revalidateTag("game:dingbats", "max");
  return { ok: true };
}
