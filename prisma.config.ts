import path from "node:path";
import { defineConfig } from "@prisma/config";

// Prisma CLI commands (migrate/seed/studio) don't read .env automatically in
// Prisma 7 — load .env.local ourselves. Next.js loads its own env separately.
try {
  process.loadEnvFile(path.join(process.cwd(), ".env.local"));
} catch {
  // .env.local may be absent (e.g. CI provides real env vars) — ignore.
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    // Run the TypeScript seed via tsx after `prisma migrate`/`db seed`.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations use the direct (non-pooled) connection; fall back to the
    // pooled URL if only that is set. Undefined is fine for validate/generate.
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
