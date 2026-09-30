"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Stores the browser's time zone so hour/day charts line up with the listener's local time. */
export function TimezoneReporter({ current }: { current: string }) {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz || tz === current) return;
    fetch("/api/timezone", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: tz }),
    }).then((r) => r.ok && router.refresh());
  }, [current, router]);
  return null;
}
