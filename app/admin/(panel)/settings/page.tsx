import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { SettingsForm } from "@/components/admin/SettingsForm";

async function SettingsBody() {
  await connection();
  const s = await prisma.adminSettings.findUnique({ where: { id: 1 } });
  const hours = Math.round(((s?.cacheTtlSeconds ?? 86400) / 3600) * 10) / 10;
  return (
    <section className="card" style={{ padding: 20, marginTop: 12, maxWidth: 420 }}>
      <SettingsForm hours={hours} />
    </section>
  );
}

export default function SettingsPage() {
  return (
    <>
      <h1>Cache &amp; settings</h1>
      <p className="help">
        How long puzzle data is cached before it refreshes on its own. Editing puzzles or categories
        updates the live games <b>immediately</b> regardless of this value.
      </p>
      <Suspense fallback={<p className="help">Loading…</p>}>
        <SettingsBody />
      </Suspense>
    </>
  );
}
