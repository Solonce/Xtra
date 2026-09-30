"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function SyncButton() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);

  async function sync() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const body = await res.json();
      setStatus(res.ok ? `+${body.added} new` : body.error ?? "Sync failed");
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      {status && <span className="text-sm text-muted">{status}</span>}
      <button
        onClick={sync}
        disabled={busy || pending}
        className="glass rounded-full px-4 py-2 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50"
      >
        {busy || pending ? "Syncing…" : "Sync now"}
      </button>
    </div>
  );
}
