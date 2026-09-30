"use client";

import { useEffect, useState } from "react";
import type { NowPlaying as NowPlayingData } from "@/lib/now-playing";
import { Cover } from "./Cover";

/** Live "now playing" pill that polls the owner's Spotify player. */
export function NowPlaying({ username, initial }: { username: string; initial: NowPlayingData }) {
  const [track, setTrack] = useState(initial);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/now-playing/${username}`, { cache: "no-store" });
        if (alive && res.ok) setTrack(await res.json());
      } catch {
        /* keep last known state */
      }
    };
    const id = setInterval(tick, 30_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [username]);

  if (!track) {
    return (
      <div className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-muted">
        <span className="size-2 rounded-full bg-white/25" /> Not listening right now
      </div>
    );
  }

  return (
    <a
      href={track.url}
      target="_blank"
      rel="noreferrer"
      className="glass group inline-flex max-w-full items-center gap-3 rounded-full py-1.5 pl-1.5 pr-5 transition hover:bg-white/10"
    >
      <Cover src={track.imageUrl} alt={track.album} className="size-10 shrink-0 !rounded-full animate-[spin_12s_linear_infinite]" />
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-accent">
          <span className="eq inline-flex h-3.5 items-end gap-[2px]" aria-hidden>
            <span /><span /><span /><span />
          </span>
          Now playing
        </div>
        <div className="truncate text-sm">
          <span className="font-medium">{track.name}</span>
          <span className="text-muted"> — {track.artist}</span>
        </div>
      </div>
    </a>
  );
}
