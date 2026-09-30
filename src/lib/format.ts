export const PERIODS = {
  "7d": { label: "7 days", days: 7 },
  "30d": { label: "30 days", days: 30 },
  "90d": { label: "90 days", days: 90 },
  "365d": { label: "12 months", days: 365 },
  all: { label: "All time", days: null },
} as const;
export type Period = keyof typeof PERIODS;

export function parsePeriod(value: string | string[] | undefined): Period {
  return typeof value === "string" && value in PERIODS ? (value as Period) : "30d";
}

export function periodStart(period: Period, now = Date.now()) {
  const days = PERIODS[period].days;
  return days === null ? 0 : now - days * 86_400_000;
}

export const nf = new Intl.NumberFormat("en");

export function hours(ms: number) {
  const h = ms / 3_600_000;
  return h >= 100 ? nf.format(Math.round(h)) : h.toFixed(1);
}

export function timeAgo(ms: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(ms).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

/** Local calendar parts for a timestamp in an IANA time zone. */
export function zoned(timezone: string) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  });
  return (ms: number) => {
    const parts = Object.fromEntries(fmt.formatToParts(ms).map((p) => [p.type, p.value]));
    return {
      day: `${parts.year}-${parts.month}-${parts.day}`,
      hour: Number(parts.hour),
      weekday: parts.weekday as string,
    };
  };
}
