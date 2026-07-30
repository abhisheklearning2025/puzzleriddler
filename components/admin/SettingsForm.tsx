"use client";

import { useActionState } from "react";
import { updateCacheTtl, type ActionState } from "@/lib/actions/settings";

export function SettingsForm({ hours }: { hours: number }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateCacheTtl, {});
  return (
    <form action={action} className="admin-form">
      <div className="field">
        <label className="label" htmlFor="hours">
          Cache lifetime (hours)
        </label>
        <input
          className="input"
          id="hours"
          name="hours"
          type="number"
          min={1}
          max={720}
          step={1}
          defaultValue={hours}
        />
      </div>
      {state.error && <div className="err">{state.error}</div>}
      {state.ok && <div className="ok">Saved — puzzle caches refreshed.</div>}
      <button className="btn" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
