/** 24-hour radial bar chart of when you listen. */
export function ListeningClock({ byHour, size = 220 }: { byHour: number[]; size?: number }) {
  const max = Math.max(1, ...byHour);
  const c = size / 2;
  const inner = size * 0.28;
  const outer = size * 0.47;
  const peak = byHour.indexOf(Math.max(...byHour));
  const label = (h: number) => (h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`);

  return (
    <figure className="flex flex-col items-center gap-2">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={`Listening by hour, peak at ${label(peak)}`}>
        <circle cx={c} cy={c} r={inner - 4} fill="none" stroke="rgb(255 255 255 / 0.08)" />
        {byHour.map((v, h) => {
          const angle = ((h / 24) * 360 - 90) * (Math.PI / 180);
          const len = inner + (outer - inner) * (v / max);
          return (
            <line
              key={h}
              x1={c + Math.cos(angle) * inner}
              y1={c + Math.sin(angle) * inner}
              x2={c + Math.cos(angle) * Math.max(inner + 2, len)}
              y2={c + Math.sin(angle) * Math.max(inner + 2, len)}
              stroke={h === peak ? "var(--accent)" : "color-mix(in oklab, var(--accent) 45%, transparent)"}
              strokeWidth={size / 34}
              strokeLinecap="round"
            >
              <title>{`${label(h)}: ${v} plays`}</title>
            </line>
          );
        })}
        {[0, 6, 12, 18].map((h) => {
          const angle = ((h / 24) * 360 - 90) * (Math.PI / 180);
          return (
            <text key={h} x={c + Math.cos(angle) * (inner - 15)} y={c + Math.sin(angle) * (inner - 15) + 3} textAnchor="middle" className="fill-[var(--muted)] font-mono" fontSize={size / 26}>
              {label(h)}
            </text>
          );
        })}
      </svg>
      <figcaption className="text-sm text-muted">
        Peak hour <span className="text-fg">{label(peak)}</span>
      </figcaption>
    </figure>
  );
}
