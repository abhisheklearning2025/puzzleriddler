"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCategory, updateCategory, deleteCategory } from "@/lib/actions/categories";

type Cat = { id: string; slug: string; name: string; icon: string; count: number };

export function CategoryManager({ gameId, categories }: { gameId: string; categories: Cat[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null); // id | "new" | null
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(fd: FormData, id?: string) {
    setBusy(true);
    setError(null);
    const res = id ? await updateCategory(id, fd) : await createCategory(gameId, fd);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function remove(id: string) {
    if (!confirm("Delete this category and all its puzzles?")) return;
    setBusy(true);
    const res = await deleteCategory(id);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  const form = (c?: Cat) => (
    <form action={(fd) => submit(fd, c?.id)} className="admin-form" style={{ margin: "10px 0" }}>
      <div className="row">
        <div className="field">
          <label className="label">Name</label>
          <input className="input" name="name" defaultValue={c?.name} required />
        </div>
        <div className="field">
          <label className="label">Slug</label>
          <input className="input" name="slug" defaultValue={c?.slug} placeholder="e.g. bolly" required />
        </div>
        <div className="field">
          <label className="label">Icon</label>
          <input className="input emoji" name="icon" defaultValue={c?.icon} placeholder="🎬" />
        </div>
      </div>
      {error && <div className="err">{error}</div>}
      <div className="rowline">
        <button className="btn" disabled={busy}>
          {busy ? "Saving…" : c ? "Save" : "Add category"}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={() => {
            setEditing(null);
            setError(null);
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <div>
      <table className="atable">
        <thead>
          <tr>
            <th>Icon</th>
            <th>Name</th>
            <th>Slug</th>
            <th>Puzzles</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {categories.map((c) =>
            editing === c.id ? (
              <tr key={c.id}>
                <td colSpan={5}>{form(c)}</td>
              </tr>
            ) : (
              <tr key={c.id}>
                <td className="emoji">{c.icon}</td>
                <td>{c.name}</td>
                <td>
                  <span className="badge">{c.slug}</span>
                </td>
                <td>{c.count}</td>
                <td className="rowline">
                  <button className="tool" onClick={() => { setEditing(c.id); setError(null); }}>
                    Edit
                  </button>
                  <button className="tool" onClick={() => remove(c.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ),
          )}
        </tbody>
      </table>

      {editing === "new" ? (
        form()
      ) : (
        <button className="btn" style={{ marginTop: 12 }} onClick={() => { setEditing("new"); setError(null); }}>
          + New category
        </button>
      )}
    </div>
  );
}
