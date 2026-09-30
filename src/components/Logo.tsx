import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="group inline-flex items-baseline gap-0.5 text-2xl font-semibold tracking-tight">
      xtra
      <span className="size-2 rounded-full bg-accent transition-transform group-hover:scale-150" />
    </Link>
  );
}
