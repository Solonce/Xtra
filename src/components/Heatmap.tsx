import { nf } from "@/lib/format";

/** Contribution-style grid: one column per week, Monday at the top. */
export function Heatmap({ cells }: { cells: { day: string; count: number; future: boolean }[] }) {
  const max = Math.max(1, ...cells.map((c) => c.count));
  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-[340px] grid-flow-col grid-rows-7 gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${Math.ceil(cells.length / 7)}, minmax(0, 1fr))` }}
      >
        {cells.map((c) => {
          const level = c.count === 0 ? 0 : 0.2 + 0.8 * Math.sqrt(c.count / max);
          return (
            <div
              key={c.day}
              title={c.future ? undefined : `${c.day} · ${nf.format(c.count)} plays`}
              className="aspect-square rounded-[3px]"
              style={{
                background: c.future
                  ? "transparent"
                  : level === 0
                    ? "rgb(255 255 255 / 0.06)"
                    : `color-mix(in oklab, var(--accent) ${Math.round(level * 100)}%, transparent)`,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
