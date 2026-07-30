export type DingbatTransform =
  | "none"
  | "reverse" // letters in reverse order (e.g. "ecnalg")
  | "rotate90"
  | "rotate180"
  | "vertical" // stacked top-to-bottom
  | "mirror"; // horizontally flipped

export type DingbatArrangement = "stack" | "row" | "grid" | "free";

export interface DingbatCell {
  text: string;
  transform?: DingbatTransform;
  position?: string;
  repeat?: number;
  size?: "sm" | "md" | "lg";
}

export interface DingbatContent {
  layout: DingbatCell[];
  style: { arrangement: DingbatArrangement };
}

/** Defensive normaliser — the DB `content` is JSON, so never trust its shape. */
export function normalizeDingbat(content: unknown): DingbatContent {
  const c = (content ?? {}) as Partial<DingbatContent> & { style?: { arrangement?: DingbatArrangement } };
  const layout = Array.isArray(c.layout)
    ? (c.layout.filter((x) => x && typeof (x as DingbatCell).text === "string") as DingbatCell[])
    : [];
  const arrangement = (c.style?.arrangement ?? "row") as DingbatArrangement;
  return { layout, style: { arrangement } };
}
