import { and, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Aura } from "@/components/Aura";
import { Cover } from "@/components/Cover";
import { Logo } from "@/components/Logo";
import { db, schema } from "@/db";
import { DEFAULT_AURA } from "@/lib/aura";
import { nf, timeAgo } from "@/lib/format";
import { topAlbums, topArtists } from "@/lib/stats";

export const metadata: Metadata = { title: "Explore" };

const DAY = 86_400_000;

async function loadListeners() {
  const { users: u, scrobbles: s } = schema;
  const listeners = await db
    .select({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatarUrl: u.avatarUrl,
      plays: sql<number>`count(${s.id})`,
      last: sql<number | null>`max(${s.playedAt})`,
    })
    .from(u)
    .leftJoin(s, eq(s.userId, u.id))
    .where(and(eq(u.visibility, "public"), eq(u.onboarded, true)))
    .groupBy(u.id)
    .orderBy(sql`max(${s.playedAt}) desc nulls last`)
    .limit(60);

  const since = Date.now() - 14 * DAY;
  const cards = await Promise.all(
    listeners.map(async (l) => {
      const [[era], albums] = await Promise.all([topArtists(l.id, since, 1), topAlbums(l.id, since, 4)]);
      const colors = albums.flatMap((a) => a.colors ?? []).slice(0, 4);
      return { ...l, era, albums, colors: colors.length ? colors : DEFAULT_AURA.colors };
    }),
  );
  return cards;
}

export default async function Explore() {
  await connection();
  const cards = await loadListeners();

  return (
    <div className="relative min-h-screen">
      <Aura params={DEFAULT_AURA} veil={0.55} />
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <Logo />
        <Link href="/me" className="glass rounded-full px-4 py-2 text-sm font-medium transition hover:bg-white/10">
          Your dashboard
        </Link>
      </nav>
      <main className="mx-auto w-full max-w-6xl px-5 pb-20">
        <h1 className="rise py-8 text-[clamp(2.5rem,7vw,5.5rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
          Other <span className="font-display font-normal italic text-accent">skies.</span>
        </h1>
        {cards.length === 0 && <p className="text-muted">No public profiles yet.</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c, i) => (
            <Link
              key={c.id}
              href={`/u/${c.username}`}
              className="rise group relative overflow-hidden rounded-3xl border border-line p-5 transition hover:-translate-y-1"
              style={{
                animationDelay: `${i * 50}ms`,
                background: `radial-gradient(circle at 20% 15%, ${c.colors[0]}cc, transparent 55%),
                  radial-gradient(circle at 85% 30%, ${c.colors[1] ?? c.colors[0]}aa, transparent 50%),
                  radial-gradient(circle at 50% 110%, ${c.colors[2] ?? c.colors[0]}99, transparent 60%), #0b0b10`,
              }}
            >
              <div className="absolute inset-0 bg-black/35 transition group-hover:bg-black/20" />
              <div className="relative flex h-full flex-col gap-10">
                <div className="flex items-center gap-3">
                  <Cover src={c.avatarUrl} alt={c.displayName} round className="size-11 text-sm" />
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-white">{c.displayName}</div>
                    <div className="font-mono text-xs text-white/60">@{c.username}</div>
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-semibold leading-tight tracking-tight text-white">
                    {c.era ? (
                      <>in my <span className="font-display font-normal italic">{c.era.name}</span> era</>
                    ) : (
                      <span className="font-display font-normal italic">quiet lately</span>
                    )}
                  </div>
                  <div className="mt-4 flex items-end justify-between">
                    <div className="flex -space-x-3">
                      {c.albums.map((a) => (
                        <Cover key={a.id} src={a.imageUrl} alt={a.name} colors={a.colors} className="size-10 !rounded-lg border-2 border-black/40 text-[10px]" />
                      ))}
                    </div>
                    <div className="text-right font-mono text-xs text-white/60">
                      {nf.format(c.plays)} plays
                      {c.last && <div>{timeAgo(c.last)}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
