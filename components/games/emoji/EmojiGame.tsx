"use client";

import type { GamePayload, PayloadPuzzle } from "@/lib/games/types";
import { GameApp } from "@/components/games/shared/GameApp";
import { emo } from "@/lib/games/engine/grapheme";

const emojiOf = (p: PayloadPuzzle) => String((p.content as { emoji?: string }).emoji ?? "");

export function EmojiGame({ payload }: { payload: GamePayload }) {
  return (
    <GameApp
      payload={payload}
      hero={{
        kicker: payload.name,
        title1: "Three emoji.",
        title2: "One answer.",
        lede: `${payload.tagline} Put it on the big screen for teams, or practise solo before you host.`,
      }}
      renderPuzzle={(p, variant) =>
        variant === "host" ? (
          <div className="bigemoji">{emo(emojiOf(p))}</div>
        ) : variant === "mini" ? (
          <span className="emoji" style={{ fontSize: 17 }}>
            {emo(emojiOf(p))}
          </span>
        ) : (
          <div className="puzzle">{emo(emojiOf(p))}</div>
        )
      }
    />
  );
}
