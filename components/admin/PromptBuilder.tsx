"use client";

import { useMemo, useState } from "react";

type Cat = { id: string; name: string };
type Puz = {
  categoryId: string;
  answers: string[];
  note: string;
  difficulty: number;
  content: Record<string, unknown>;
};

function line(kind: "EMOJI" | "DINGBATS", p: Puz): string {
  const answers = p.answers.join(" / ");
  const shown =
    kind === "EMOJI" ? String((p.content as { emoji?: string }).emoji ?? "") : JSON.stringify(p.content);
  return `${shown}\t${answers}\t${p.note}\t${p.difficulty}`;
}

function buildPrompt(
  gameName: string,
  kind: "EMOJI" | "DINGBATS",
  catName: string,
  existing: Puz[],
  count: number,
): string {
  const rows = existing.map((p) => line(kind, p)).join("\n") || "(none yet — set the style yourself)";
  const answers = existing.map((p) => p.answers[0]).join(", ") || "(none yet)";

  if (kind === "EMOJI") {
    return `You are helping expand a party game called ${gameName}, where players see a few emoji and guess the answer.

Write ${count} brand-new puzzles for the category "${catName}".

Output one puzzle per line, tab-separated, in exactly this format:
emoji<TAB>answer / alternate answer<TAB>short reveal note<TAB>difficulty (1 = easy, 2 = medium, 3 = hard)

Guidelines:
- 2–4 emoji per puzzle; clever but fair to guess.
- Match the tone and the mix of difficulties in the examples.
- Do NOT reuse any of these existing answers: ${answers}

Existing puzzles in "${catName}" (for style — do not repeat):
${rows}`;
  }

  return `You are helping expand a Dingbats / rebus word-puzzle game called ${gameName}. Each puzzle is a visual arrangement of text that represents a word or phrase (e.g. "ecnalg" = Backward Glance; STAND above I = I Understand).

Write ${count} brand-new dingbats for the category "${catName}".

Each puzzle's picture is described by this layout JSON:
{ "layout": [ { "text": "WORD", "transform": "none|reverse|rotate90|rotate180|vertical|mirror" } ], "style": { "arrangement": "stack|row|grid|free" } }

Output one puzzle per line, tab-separated, in exactly this format:
<layout JSON><TAB>answer / alternate answer<TAB>short note explaining the wordplay<TAB>difficulty (1–3)

Guidelines:
- The arrangement must actually encode the answer.
- Match the style of the examples.
- Do NOT reuse any of these existing answers: ${answers}

Existing dingbats in "${catName}" (for style — do not repeat):
${rows}`;
}

export function PromptBuilder({
  gameName,
  kind,
  categories,
  puzzles,
}: {
  gameName: string;
  kind: "EMOJI" | "DINGBATS";
  categories: Cat[];
  puzzles: Puz[];
}) {
  const [catId, setCatId] = useState(categories[0]?.id ?? "");
  const [count, setCount] = useState(10);
  const [copied, setCopied] = useState(false);

  const cat = categories.find((c) => c.id === catId);
  const existing = useMemo(() => puzzles.filter((p) => p.categoryId === catId), [puzzles, catId]);
  const prompt = useMemo(
    () => buildPrompt(gameName, kind, cat?.name ?? "this category", existing, count),
    [gameName, kind, cat?.name, existing, count],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — the textarea is selectable as a fallback
    }
  }

  if (categories.length === 0) return null;

  return (
    <section className="card" style={{ padding: 18, marginTop: 12 }}>
      <div className="rowline" style={{ justifyContent: "space-between" }}>
        <div className="label">Generate more with AI</div>
        <span className="help">{existing.length} existing puzzles included</span>
      </div>
      <p className="help" style={{ margin: "4px 0 12px" }}>
        Copy this prompt into any AI chat to get fresh puzzles for a category. It already lists what
        exists so nothing repeats — and it grows every time you add more.
      </p>

      <div className="row" style={{ marginBottom: 10 }}>
        <div className="field">
          <label className="label">Category</label>
          <select className="input" value={catId} onChange={(e) => setCatId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">How many to ask for</label>
          <input
            className="input"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
          />
        </div>
      </div>

      <textarea className="input" readOnly rows={10} value={prompt} onFocus={(e) => e.currentTarget.select()} />
      <div className="rowline" style={{ marginTop: 10 }}>
        <button className="btn" onClick={copy}>
          {copied ? "Copied ✓" : "Copy prompt"}
        </button>
        <span className="help">Paste the AI’s answers back in using “+ New puzzle”.</span>
      </div>
    </section>
  );
}
