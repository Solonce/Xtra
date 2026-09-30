"use client";

import { useState } from "react";

export function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(new URL(path, location.origin).toString());
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-black transition hover:brightness-110"
    >
      {copied ? "Copied!" : "Share profile"}
    </button>
  );
}
