import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card } from "@/components/Card";
import { CopyLink } from "@/components/CopyLink";
import { Cover } from "@/components/Cover";
import { Heatmap } from "@/components/Heatmap";
import { ImportForm } from "@/components/ImportForm";
import { ListeningClock } from "@/components/ListeningClock";
import { Logo } from "@/components/Logo";
import { Aura } from "@/components/Aura";
import { NowPlaying } from "@/components/NowPlaying";
import { RankList } from "@/components/RankList";
import { StatTile } from "@/components/StatTile";
import { SyncButton } from "@/components/SyncButton";
import { TimezoneReporter } from "@/components/TimezoneReporter";
import { hours, nf, parsePeriod, PERIODS, periodStart, timeAgo } from "@/lib/format";
import { getNowPlaying } from "@/lib/now-playing";
import { buildProfile } from "@/lib/profile";
import { getSessionUser } from "@/lib/session";
import { recentPlays, topAlbums, topArtists, topTracks, totals } from "@/lib/stats";
import { syncIfStale } from "@/lib/sync";
import { themeVars } from "@/lib/theme";

export const metadata: Metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: PageProps<"/me">) {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (!user.onboarded) redirect("/welcome");
  await syncIfStale(user);

  const period = parsePeriod((await searchParams).period);
  const since = periodStart(period);
  const [profile, stats, artists, albums, tracks, recent, nowPlaying] = await Promise.all([
    buildProfile(user),
    totals(user.id, since),
    topArtists(user.id, since, 9),
    topAlbums(user.id, since, 8),
    topTracks(user.id, since, 10),
    recentPlays(user.id, 15),
    getNowPlaying(user),
  ]);
  const empty = profile.allTime.plays === 0;

  return (
    <div style={themeVars(profile.palette)} className="relative min-h-screen">
      <Aura params={profile.aura.params} veil={0.6} />
      <TimezoneReporter current={user.timezone} />
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-5 py-6">
        <Logo href="/me" />
        <div className="flex items-center gap-1">
          {[
            [`/u/${user.username}`, "Profile"],
            ["/explore", "Explore"],
            ["/settings", "Settings"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="rounded-full px-3 py-2 text-sm text-muted transition hover:text-fg">
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 pb-16">
        <header className="flex flex-col gap-6 py-6 md:flex-row md:items-end md:justify-between">
          <div className="flex items-center gap-5">
            <Cover src={user.avatarUrl} alt={user.displayName} round className="size-20 text-lg ring-2 ring-accent/60 ring-offset-4 ring-offset-transparent" />
            <div>
              <p className="text-sm text-muted">Welcome back</p>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{user.displayName}</h1>
              <p className="mt-1 text-sm text-muted">
                {user.lastSyncedAt ? `Synced ${timeAgo(user.lastSyncedAt)}` : "Not synced yet"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <SyncButton />
            <CopyLink path={`/u/${user.username}`} />
          </div>
        </header>

        <NowPlaying username={user.username} initial={nowPlaying} />

        {empty && (
          <Card title="Getting started">
            <p className="max-w-2xl text-muted">
              No scrobbles yet. Play something on Spotify and hit <span className="text-fg">Sync now</span>, or import your
              history below to backfill everything you’ve ever played.
            </p>
          </Card>
        )}

        <div className="flex flex-wrap gap-1 self-start rounded-full glass p-1">
          {(Object.keys(PERIODS) as (keyof typeof PERIODS)[]).map((p) => (
            <Link
              key={p}
              href={`/me?period=${p}`}
              scroll={false}
              className={`rounded-full px-4 py-1.5 text-sm transition ${p === period ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
            >
              {PERIODS[p].label}
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile label="Scrobbles" value={nf.format(stats.plays)} />
          <StatTile label="Hours" value={hours(stats.ms)} />
          <StatTile label="Artists" value={nf.format(stats.artists)} hint={`${nf.format(stats.tracks)} tracks`} />
          <StatTile label="Streak" value={`${profile.streak}d`} hint="days in a row" />
        </div>

        <Card title={`Top artists · ${PERIODS[period].label}`}>
          {artists.length ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {artists.map((a, i) => (
                <div key={a.id} className={i === 0 ? "col-span-2 row-span-2" : ""}>
                  <div className="group relative overflow-hidden rounded-2xl">
                    <Cover src={a.imageUrl} alt={a.name} className="aspect-square w-full !rounded-2xl text-4xl transition duration-500 group-hover:scale-105" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-10">
                      <div className={`truncate font-semibold text-white ${i === 0 ? "text-2xl" : ""}`}>{a.name}</div>
                      <div className="font-mono text-xs text-white/70">{nf.format(a.plays)} plays</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted">No plays in this period.</p>
          )}
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Top tracks">
            <RankList
              items={tracks.map((t) => ({
                id: t.id,
                title: t.name,
                subtitle: t.artist,
                imageUrl: t.imageUrl,
                colors: t.colors,
                plays: t.plays,
                href: `https://open.spotify.com/track/${t.id}`,
              }))}
            />
          </Card>
          <Card title="Top albums">
            <RankList
              items={albums.map((a) => ({
                id: a.id,
                title: a.name,
                subtitle: a.artist,
                imageUrl: a.imageUrl,
                colors: a.colors,
                plays: a.plays,
              }))}
            />
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <Card title="Last 26 weeks">
            <Heatmap cells={profile.heatmap} />
          </Card>
          <Card title="Listening clock · 6 months">
            <ListeningClock byHour={profile.byHour} />
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <Card title="Recent scrobbles">
            {recent.length ? (
              <ul className="flex flex-col">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 border-b border-line py-2 last:border-0">
                    <Cover src={r.imageUrl} alt={r.name} colors={r.colors} className="size-10 shrink-0 text-[10px] !rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{r.name}</div>
                      <div className="truncate text-sm text-muted">{r.artist}</div>
                    </div>
                    <time className="shrink-0 font-mono text-xs text-muted">{timeAgo(r.playedAt)}</time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Nothing yet.</p>
            )}
          </Card>
          <Card title="Import history">
            <ImportForm />
          </Card>
        </div>
      </main>
    </div>
  );
}
