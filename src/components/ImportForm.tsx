"use client";

import { unzipSync } from "fflate";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type HistoryRow, isHistoryFile, parseHistory } from "@/lib/history-format";

const BATCH = 4_000;

async function readRows(files: File[]): Promise<HistoryRow[]> {
  const rows: HistoryRow[] = [];
  const decoder = new TextDecoder();
  for (const file of files) {
    if (file.name.toLowerCase().endsWith(".zip")) {
      const entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
        filter: (f) => isHistoryFile(f.name),
      });
      for (const data of Object.values(entries)) {
        const parsed = JSON.parse(decoder.decode(data));
        if (Array.isArray(parsed)) rows.push(...parseHistory(parsed));
      }
    } else {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error(`${file.name} isn't a streaming history file`);
      rows.push(...parseHistory(parsed));
    }
  }
  return rows.sort((a, b) => a.t - b.t);
}

export function ImportForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onFiles(list: FileList | null) {
    const files = [...(list ?? [])];
    if (!files.length) return;
    setBusy(true);
    setMessage("Reading your files…");
    setProgress(0);
    try {
      const rows = await readRows(files);
      if (!rows.length) throw new Error("No music plays found. Pick the Streaming_History JSON files or the whole zip.");
      let added = 0;
      for (let i = 0; i < rows.length; i += BATCH) {
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: rows.slice(i, i + BATCH), last: i + BATCH >= rows.length }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        added += json.added;
        setProgress(Math.min(1, (i + BATCH) / rows.length));
        setMessage(`Importing… ${added.toLocaleString()} new plays so far`);
      }
      const first = new Date(rows[0].t).toLocaleDateString("en", { month: "long", year: "numeric" });
      setMessage(
        `Done: ${added.toLocaleString()} new plays going back to ${first}. Artwork and genres fill in over the next few syncs.`,
      );
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import failed");
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {!compact && (
        <ol className="flex flex-col gap-2 text-sm text-muted">
          <li>
            <span className="text-fg">1.</span> Open{" "}
            <a className="text-fg underline decoration-accent underline-offset-4" href="https://www.spotify.com/account/privacy/" target="_blank" rel="noreferrer">
              Spotify → Privacy
            </a>{" "}
            and request <span className="text-fg">Extended streaming history</span> (your whole life on Spotify; the email usually arrives within days).
            <span className="block text-xs">Faster but only the past year: <span className="text-fg">Account data</span>.</span>
          </li>
          <li>
            <span className="text-fg">2.</span> Drop the <code className="font-mono text-xs">my_spotify_data.zip</code> from the email here, as-is. It’s unpacked in your browser, and only the plays are uploaded.
          </li>
        </ol>
      )}
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!busy) onFiles(e.dataTransfer.files);
        }}
        className="relative flex cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border border-dashed border-line px-4 py-7 text-center text-sm transition hover:border-accent hover:bg-white/5"
      >
        <input
          type="file"
          accept=".zip,application/zip,application/json,.json"
          multiple
          className="sr-only"
          disabled={busy}
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span className="font-medium">{busy ? "Importing…" : "Drop your Spotify zip or JSON files"}</span>
        {!busy && <span className="text-xs text-muted">or click to choose</span>}
        {progress !== null && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-white/5">
            <span className="block h-full bg-accent transition-all" style={{ width: `${progress * 100}%` }} />
          </span>
        )}
      </label>
      {message && <p className="text-sm text-muted">{message}</p>}
    </div>
  );
}
