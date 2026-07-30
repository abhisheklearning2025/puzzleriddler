import "server-only";
import { cacheLife, cacheTag } from "next/cache";

export const DEFAULT_TTL = 86400; // 24h

/** Admin-configurable cache lifetime (seconds). Cached under the `settings`
 *  tag and invalidated whenever the admin saves a new value. */
export async function getCacheTtl(): Promise<number> {
  "use cache";
  cacheTag("settings");
  cacheLife("max");

  if (!process.env.DATABASE_URL) return DEFAULT_TTL;
  const { prisma } = await import("@/lib/db");
  const s = await prisma.adminSettings.findUnique({ where: { id: 1 } });
  return s?.cacheTtlSeconds ?? DEFAULT_TTL;
}
