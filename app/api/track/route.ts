import { NextResponse } from "next/server";
import { recordEvent, isMetric } from "@/lib/data/analytics";

const KNOWN_GAMES = new Set(["", "emoji", "dingbats"]);

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as { metric?: string; gameSlug?: string } | null;
    if (!body || !isMetric(body.metric)) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const gameSlug =
      typeof body.gameSlug === "string" && KNOWN_GAMES.has(body.gameSlug) ? body.gameSlug : "";
    await recordEvent(body.metric, gameSlug);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
