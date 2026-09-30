export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="text-xs uppercase tracking-[0.14em] text-muted">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
