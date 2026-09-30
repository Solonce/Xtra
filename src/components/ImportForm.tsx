"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ImportForm() {
  const router = useRouter();
  const [state, setState] = useState<{ busy: boolean; message?: string }>({ busy: false });

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = [...(e.target.files ?? [])];
    if (!files.length) return;
    setState({ busy: true, message: `Importing ${files.length} file(s)…` });
    const body = new FormData();
    files.forEach((f) => body.append("files", f));
    const res = await fetch("/api/import", { method: "POST", body });
    const json = await res.json();
    setState({
      busy: false,
      message: res.ok
        ? `Imported ${json.added.toLocaleString()} scrobbles from ${json.files} file(s). Artwork fills in over the next few syncs.`
        : json.error,
    });
    e.target.value = "";
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        Spotify only exposes your last 50 plays. To backfill years of history, request your{" "}
        <a className="text-fg underline decoration-accent underline-offset-4" href="https://www.spotify.com/account/privacy/" target="_blank" rel="noreferrer">
          Extended streaming history
        </a>{" "}
        and drop the <code className="font-mono text-xs">Streaming_History_Audio_*.json</code> files here.
      </p>
      <label className="flex cursor-pointer items-center justify-center rounded-2xl border border-dashed border-line px-4 py-6 text-sm transition hover:border-accent hover:bg-white/5">
        <input type="file" accept="application/json,.json" multiple className="sr-only" onChange={onChange} disabled={state.busy} />
        {state.busy ? "Importing…" : "Choose JSON files"}
      </label>
      {state.message && <p className="text-sm text-muted">{state.message}</p>}
    </div>
  );
}
