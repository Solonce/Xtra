import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { cache } from "react";
import { Cover } from "@/components/Cover";
import { Heatmap } from "@/components/Heatmap";
import { ListeningClock } from "@/components/ListeningClock";
import { Logo } from "@/components/Logo";
import { Mesh } from "@/components/Mesh";
import { NowPlaying } from "@/components/NowPlaying";
import { db, schema } from "@/db";
import { hours, nf } from "@/lib/format";
import { getNowPlaying } from "@/lib/now-playing";
import { buildProfile } from "@/lib/profile";
import { syncIfStale } from "@/lib/sync";
import { themeVars } from "@/lib/theme";

const findUser = cache((username: string) =>
  db.query.users.findFirst({ where: eq(schema.users.username, username) }),
);

export async function generateMetadata({ params }: PageProps<"/u/[username]">): Promise<Metadata> {
  const user = await findUser((await params).username);
  return { title: user ? `${user.displayName}’s listening` : "Not found" };
}

const TRAIT_GLYPHS: Record<string, string> = {
  "night-owl": "☾",
  "early-bird": "☀",
  loyalist: "♥",
  explorer: "✦",
  "on-repeat": "↻",
  "album-head": "◉",
  marathoner: "∞",
  weekender: "✺",
};

export default async function ProfilePage({ params }: PageProps<"/u/[username]">) {
  const user = await findUser((await params).username);
  if (!user) notFound();
  after(() => syncIfStale(user, 15 * 60_000));

  const [p, nowPlaying] = await Promise.all([buildProfile(user), getNowPlaying(user)]);
  const since = p.allTime.first
    ? new Date(p.allTime.first).toLocaleDateString("en", { month: "long", year: "numeric" })
    : null;

  return (
    <div style={themeVars(p.palette, p.mood as "light" | "dark")} className="relative min-h-screen text-fg">
      <Mesh />

      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <Logo />
        <Link href="/" className="text-sm text-muted transition hover:text-fg">
          Make your own →
        </Link>
      </nav>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 pb-20">
        {/* Hero */}
        <header className="rise flex flex-col gap-8 pb-8 pt-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full p-[3px]" style={{ background: "conic-gradient(from 0deg, var(--p1), var(--p2), var(--p3), var(--p1))" }}>
              <Cover src={user.avatarUrl} alt={user.displayName} round className="size-16 border-[3px] border-[var(--bg)] text-sm" />
            </div>
            <div>
              <div className="text-xl font-semibold tracking-tight">{user.displayName}</div>
              <div className="text-sm text-muted">
                @{user.username}
                {since && ` · scrobbling since ${since}`}
              </div>
            </div>
          </div>

          <h1 className="max-w-5xl text-[clamp(2.75rem,8vw,7rem)] font-semibold leading-[0.92] tracking-[-0.04em]">
            {p.era ? (
              <>
                in my <span className="font-display font-normal italic tracking-[-0.01em] text-accent">{p.era.name}</span> era
              </>
            ) : (
              <>
                just getting <span className="font-display font-normal italic text-accent">started</span>
              </>
            )}
          </h1>

          <div className="flex flex-wrap items-center gap-3">
            <NowPlaying username={user.username} initial={nowPlaying} />
            {p.traits.map((t) => (
              <span key={t.id} className="glass inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm" title={t.detail}>
                <span className="text-accent">{TRAIT_GLYPHS[t.id]}</span>
                <span className="font-medium">{t.title}</span>
                <span className="hidden text-muted sm:inline">· {t.detail}</span>
              </span>
            ))}
          </div>
        </header>

        {/* Bento */}
        <div className="grid auto-rows-min gap-4 md:grid-cols-6">
          {p.obsession ? (
            <section className="glass rise relative flex flex-col overflow-hidden rounded-3xl p-6 md:col-span-3 md:row-span-2" style={{ animationDelay: "60ms" }}>
              <h2 className="text-xs uppercase tracking-[0.16em] text-muted">Current obsession</h2>
              <Cover src={p.obsession.imageUrl} alt={p.obsession.name} colors={p.obsession.colors} className="mt-5 aspect-square w-full !rounded-2xl text-7xl shadow-2xl shadow-black/40" />
              <div className="mt-auto flex items-end justify-between gap-4 pt-6">
                <div className="min-w-0">
                  <div className="truncate text-3xl font-semibold tracking-tight">{p.obsession.name}</div>
                  <div className="truncate text-muted">{p.obsession.artist}</div>
                </div>
                <div className="shrink-0 text-right font-display text-6xl italic leading-none text-accent">
                  {p.obsession.plays}×
                  <div className="font-sans text-xs not-italic text-muted">this week</div>
                </div>
              </div>
            </section>
          ) : null}

          <section className={`glass rise rounded-3xl p-6 ${p.obsession ? "md:col-span-3" : "md:col-span-6"}`} style={{ animationDelay: "120ms" }}>
            <h2 className="text-xs uppercase tracking-[0.16em] text-muted">The wall · 90 days</h2>
            {p.wall.length ? (
              <div className="mt-5 grid grid-cols-3 gap-2">
                {p.wall.map((a) => (
                  <Cover
                    key={a.id}
                    src={a.imageUrl}
                    alt={`${a.name} by ${a.artist}`}
                    colors={a.colors}
                    className="aspect-square w-full !rounded-lg text-2xl transition duration-300 hover:scale-[1.04] hover:rotate-[-1.5deg]"
                  />
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">Nothing on the wall yet.</p>
            )}
          </section>

          <section className="glass rise rounded-3xl p-6 md:col-span-3" style={{ animationDelay: "180ms" }}>
            <h2 className="text-xs uppercase tracking-[0.16em] text-muted">On rotation · 7 days</h2>
            <ol className="mt-4 flex flex-col gap-3">
              {p.onRotation.map((t, i) => (
                <li key={t.id} className="flex items-center gap-3">
                  <span className="w-5 font-display text-xl italic text-accent">{i + 1}</span>
                  <Cover src={t.imageUrl} alt={t.name} colors={t.colors} className="size-10 shrink-0 !rounded-md text-[10px]" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{t.name}</div>
                    <div className="truncate text-xs text-muted">{t.artist}</div>
                  </div>
                  <span className="font-mono text-xs text-muted">{t.plays}</span>
                </li>
              ))}
              {!p.onRotation.length && <li className="text-sm text-muted">Quiet week.</li>}
            </ol>
          </section>

          <section className="glass rise rounded-3xl p-6 md:col-span-4" style={{ animationDelay: "240ms" }}>
            <h2 className="text-xs uppercase tracking-[0.16em] text-muted">Top artists · 30 days</h2>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-5">
              {p.topArtists.map((a, i) => (
                <div key={a.id} className="flex items-center gap-3">
                  <Cover src={a.imageUrl} alt={a.name} round className={`${i === 0 ? "size-16 text-lg" : "size-11 text-xs"} shrink-0`} />
                  <div>
                    <div className={i === 0 ? "text-xl font-semibold" : "font-medium"}>{a.name}</div>
                    <div className="font-mono text-xs text-muted">{nf.format(a.plays)} plays</div>
                  </div>
                </div>
              ))}
              {!p.topArtists.length && <p className="text-sm text-muted">No plays this month.</p>}
            </div>
            {p.genres.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {p.genres.map((g) => (
                  <span key={g} className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                    {g}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="glass rise flex flex-col justify-between gap-6 rounded-3xl p-6 md:col-span-2" style={{ animationDelay: "300ms" }}>
            <h2 className="text-xs uppercase tracking-[0.16em] text-muted">All time</h2>
            <dl className="grid grid-cols-2 gap-4">
              {[
                ["scrobbles", nf.format(p.allTime.plays)],
                ["hours", hours(p.allTime.ms)],
                ["artists", nf.format(p.allTime.artists)],
                ["day streak", String(p.streak)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="text-2xl font-semibold tabular-nums tracking-tight">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="glass rise rounded-3xl p-6 md:col-span-4" style={{ animationDelay: "360ms" }}>
            <h2 className="mb-5 text-xs uppercase tracking-[0.16em] text-muted">Rhythm · 26 weeks</h2>
            <Heatmap cells={p.heatmap} />
          </section>

          <section className="glass rise grid place-items-center rounded-3xl p-6 md:col-span-2" style={{ animationDelay: "420ms" }}>
            <ListeningClock byHour={p.byHour} size={200} />
          </section>
        </div>

        {/* Palette provenance */}
        <footer className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex">
              {p.palette.map((c) => (
                <span key={c} className="-ml-1.5 size-7 rounded-full border-2 border-[var(--bg)] first:ml-0" style={{ background: c }} title={c} />
              ))}
            </div>
            <p className="text-sm text-muted">
              This page’s colours come from the album covers {user.displayName} played this week.
            </p>
          </div>
          <p className="font-mono text-xs text-muted">{p.palette.join(" · ")}</p>
        </footer>
      </main>
    </div>
  );
}
