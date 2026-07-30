"use client";

import type { GamePayload } from "@/lib/games/types";
import { GameApp } from "@/components/games/shared/GameApp";
import { DingbatBoard } from "@/lib/games/dingbats/render";

export function DingbatsGame({ payload }: { payload: GamePayload }) {
  return (
    <GameApp
      payload={payload}
      hero={{
        kicker: payload.name,
        title1: "Read the layout.",
        title2: "Say the phrase.",
        lede: `${payload.tagline} A word-picture riddle — the way the text sits IS the clue. Host it for a room, or solve solo.`,
      }}
      renderPuzzle={(p, variant) => <DingbatBoard content={p.content} variant={variant} />}
    />
  );
}
