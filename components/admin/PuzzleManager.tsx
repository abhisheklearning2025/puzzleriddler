"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPuzzle, updatePuzzle, deletePuzzle } from "@/lib/actions/puzzles";

type Cat = { id: string; name: string };
type Content = { emoji?: string; layout?: { text: string }[] };
type Puz = {
  id: string;
  categoryId: string;
  categoryName: string;
  answers: string[];
  note: string;
  difficulty: number;
  content: Content;
};

const DIFF = ["", "Easy", "Medium", "Hard"];

export function PuzzleManager({
  gameId,
  kind,
  categories,
  puzzles,
}: {
  gameId: string;
  kind: "EMOJI" | "DINGBATS";
  categories: Cat[];
  puzzles: Puz[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null); // id | "new" | null
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  async function submit(fd: FormData, id?: string) {
    setBusy(true);
    setError(null);
    const res = id ? await updatePuzzle(id, fd) : await createPuzzle(gameId, fd);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this puzzle?")) return;
    setBusy(true);
    const res = await deletePuzzle(id);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  const contentDefault = (p?: Puz) => {
    if (kind === "EMOJI") return p?.content?.emoji ?? "";
    return p
      ? JSON.stringify(p.content, null, 2)
      : JSON.stringify({ layout: [{ text: "TEXT" }], style: { arrangement: "row" } }, null, 2);
  };

  const preview = (p: Puz) =>
    kind === "EMOJI" ? p.content?.emoji ?? "" : (p.content?.layout ?? []).map((l) => l.text).join(" ");

  const form = (p?: Puz) => (
    <form action={(fd) => submit(fd, p?.id)} className="admin-form" style={{ margin: "10px 0" }}>
      <div className="row">
        <div className="field">
          <label className="label">Category</label>
          <select className="input" name="categoryId" defaultValue={p?.categoryId ?? categories[0]?.id} required>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Difficulty</label>
          <select className="input" name="difficulty" defaultValue={String(p?.difficulty ?? 2)}>
            <option value="1">Easy</option>
            <option value="2">Medium</option>
            <option value="3">Hard</option>
          </select>
        </div>
      </div>

      {kind === "EMOJI" ? (
        <div className="field">
          <label className="label">Emoji</label>
          <input
            className="input emoji"
            name="emoji"
            defaultValue={contentDefault(p)}
            placeholder="🪙🔫🐴"
            style={{ fontSize: 22 }}
          />
        </div>
      ) : (
        <div className="field">
          <label className="label">Layout (JSON)</label>
          <textarea className="input" name="content" defaultValue={contentDefault(p)} rows={7} />
        </div>
      )}

      <div className="field">
        <label className="label">Answers (one per line, or slash-separated)</label>
        <textarea className="input" name="answers" defaultValue={p?.answers.join(" / ")} placeholder="Sholay / Sholay 1975" />
      </div>
      <div className="field">
        <label className="label">Reveal note</label>
        <input className="input" name="note" defaultValue={p?.note} />
      </div>

      {error && <div className="err">{error}</div>}
      <div className="rowline">
        <button className="btn" disabled={busy}>
          {busy ? "Saving…" : p ? "Save" : "Add puzzle"}
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => { setEditing(null); setError(null); }}>
          Cancel
        </button>
      </div>
    </form>
  );

  const shown = puzzles.filter((p) => filter === "all" || p.categoryId === filter);

  return (
    <div>
      <div className="rowline" style={{ marginBottom: 12 }}>
        <span className="label">Filter</span>
        <select className="input" style={{ maxWidth: 220 }} value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="help">{shown.length} puzzles</span>
      </div>

      {editing === "new" ? (
        form()
      ) : (
        <button className="btn" onClick={() => { setEditing("new"); setError(null); }}>
          + New puzzle
        </button>
      )}

      <table className="atable" style={{ marginTop: 12 }}>
        <thead>
          <tr>
            <th>Puzzle</th>
            <th>Answer</th>
            <th>Category</th>
            <th>Diff</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {shown.map((p) =>
            editing === p.id ? (
              <tr key={p.id}>
                <td colSpan={5}>{form(p)}</td>
              </tr>
            ) : (
              <tr key={p.id}>
                <td className="emoji" style={{ fontSize: 18, maxWidth: 170 }}>
                  {preview(p)}
                </td>
                <td>{p.answers[0]}</td>
                <td>{p.categoryName}</td>
                <td>{DIFF[p.difficulty]}</td>
                <td className="rowline">
                  <button className="tool" onClick={() => { setEditing(p.id); setError(null); }}>
                    Edit
                  </button>
                  <button className="tool" onClick={() => remove(p.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
