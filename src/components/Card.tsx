export function Card({
  title,
  action,
  className = "",
  children,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`glass rounded-3xl p-5 sm:p-6 ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="text-xs uppercase tracking-[0.16em] text-muted">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}
