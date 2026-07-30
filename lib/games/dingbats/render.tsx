import type { CSSProperties } from "react";
import { normalizeDingbat, type DingbatCell } from "./types";

function Cell({ cell }: { cell: DingbatCell }) {
  const t = cell.transform ?? "none";

  if (t === "vertical") {
    return (
      <span className="ding-cell ding-vertical">
        {[...cell.text].map((ch, i) => (
          <span key={i}>{ch}</span>
        ))}
      </span>
    );
  }

  let text = cell.text;
  if (t === "reverse") text = [...cell.text].reverse().join("");

  const style: CSSProperties = {};
  if (t === "rotate90") style.transform = "rotate(90deg)";
  else if (t === "rotate180") style.transform = "rotate(180deg)";
  else if (t === "mirror") style.transform = "scaleX(-1)";
  if (t === "rotate90" || t === "rotate180" || t === "mirror") style.display = "inline-block";

  const times = cell.repeat && cell.repeat > 1 ? cell.repeat : 1;
  const rendered = times > 1 ? Array.from({ length: times }, () => text).join(" ") : text;

  return (
    <span className="ding-cell" style={style}>
      {rendered}
    </span>
  );
}

/** Renders a dingbat/rebus puzzle from its stored layout. */
export function DingbatBoard({
  content,
  variant = "host",
}: {
  content: unknown;
  variant?: "host" | "solo" | "mini";
}) {
  const c = normalizeDingbat(content);
  const size = variant === "mini" ? "ding-mini" : variant === "solo" ? "ding-solo" : "ding-host";
  return (
    <div className={`dingboard arr-${c.style.arrangement} ${size}`}>
      {c.layout.map((cell, i) => (
        <Cell key={i} cell={cell} />
      ))}
    </div>
  );
}
