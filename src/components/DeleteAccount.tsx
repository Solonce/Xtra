"use client";

import { useActionState } from "react";
import { deleteAccount, type FormState } from "@/app/actions/profile";

export function DeleteAccount({ username }: { username: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(deleteAccount, {});
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Deletes your profile and every scrobble. This can’t be undone. Type <span className="font-mono text-fg">{username}</span> to confirm.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          name="confirm"
          autoComplete="off"
          className="glass min-w-0 flex-1 rounded-full px-4 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-red-400"
        />
        <button disabled={pending} className="rounded-full bg-red-500/80 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:opacity-50">
          {pending ? "Deleting…" : "Delete everything"}
        </button>
      </div>
      {state.error && <p className="text-sm text-red-300">{state.error}</p>}
    </form>
  );
}
