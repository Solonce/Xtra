import { nf } from "@/lib/format";
import { Cover } from "./Cover";

type Item = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl: string | null;
  colors?: string[] | null;
  plays: number;
  href?: string;
};

export function RankList({ items, round = false, empty = "Nothing here yet." }: {
  items: Item[];
  round?: boolean;
  empty?: string;
}) {
  if (!items.length) return <p className="text-sm text-muted">{empty}</p>;
  const max = items[0].plays;
  return (
    <ol className="flex flex-col gap-1">
      {items.map((item, i) => {
        const row = (
          <>
            <span className="w-6 shrink-0 text-right font-mono text-xs text-muted tabular-nums">{i + 1}</span>
            <Cover src={item.imageUrl} alt={item.title} colors={item.colors} round={round} className="size-11 shrink-0 text-[10px]" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{item.title}</div>
              {item.subtitle && <div className="truncate text-sm text-muted">{item.subtitle}</div>}
              <div className="mt-1.5 h-1 rounded-full bg-white/5">
                <div
                  className="h-full rounded-full bg-accent/70"
                  style={{ width: `${Math.max(4, (item.plays / max) * 100)}%` }}
                />
              </div>
            </div>
            <span className="shrink-0 font-mono text-sm tabular-nums text-muted">{nf.format(item.plays)}</span>
          </>
        );
        return (
          <li key={item.id}>
            {item.href ? (
              <a href={item.href} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5">
                {row}
              </a>
            ) : (
              <div className="flex items-center gap-3 rounded-xl p-2">{row}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
