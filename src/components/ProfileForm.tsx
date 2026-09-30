"use client";

import { useActionState, useState } from "react";
import { type FormState, saveProfile } from "@/app/actions/profile";
import { handleError, normalizeHandle, VISIBILITY, type Visibility } from "@/lib/handles";

export function ProfileForm({
  username,
  visibility,
  submitLabel,
}: {
  username: string;
  visibility: Visibility;
  submitLabel: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProfile, {});
  const [handle, setHandle] = useState(username);
  const [seen, setSeen] = useState<Visibility>(visibility);
  const localError = handle ? handleError(normalizeHandle(handle)) : null;

  return (
    <form action={action} className="flex flex-col gap-8">
      <label className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.16em] text-muted">Handle</span>
        <div className="glass flex items-center rounded-2xl pl-4 focus-within:ring-2 focus-within:ring-accent">
          <span className="font-mono text-sm text-muted">/u/</span>
          <input
            name="username"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase())}
            autoComplete="off"
            spellCheck={false}
            maxLength={24}
            className="min-w-0 flex-1 bg-transparent px-1 py-3.5 font-mono text-lg outline-none"
          />
        </div>
        <span className={`text-sm ${localError ? "text-red-300" : "text-muted"}`}>
          {localError ?? "This is the only thing about your profile you get to choose."}
        </span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-xs uppercase tracking-[0.16em] text-muted">Who can see it</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(VISIBILITY) as Visibility[]).map((v) => (
            <label
              key={v}
              className={`glass cursor-pointer rounded-2xl p-4 transition ${seen === v ? "ring-2 ring-accent" : "hover:bg-white/10"}`}
            >
              <input type="radio" name="visibility" value={v} checked={seen === v} onChange={() => setSeen(v)} className="sr-only" />
              <div className="font-medium">{VISIBILITY[v].label}</div>
              <div className="mt-1 text-sm text-muted">{VISIBILITY[v].hint}</div>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex items-center gap-4">
        <button
          disabled={pending || Boolean(localError)}
          className="rounded-full bg-fg px-6 py-3 font-medium text-bg transition hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        {state.error && <span className="text-sm text-red-300">{state.error}</span>}
        {state.saved && <span className="text-sm text-muted">Saved.</span>}
      </div>
    </form>
  );
}
