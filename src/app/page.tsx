import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Mesh } from "@/components/Mesh";
import { getSessionUserId } from "@/lib/session";

const FEATURES = [
  {
    title: "Every play, kept",
    body: "Xtra scrobbles your Spotify in the background and backfills years of history from your Spotify data export.",
  },
  {
    title: "A profile that designs itself",
    body: "No themes and no settings. Colours come from your album covers, the headline from your current era, and badges from how you listen.",
  },
  {
    title: "Charts worth sharing",
    body: "Top artists, albums and tracks for any period, plus a listening clock, a streak counter and a heatmap of the last six months.",
  },
];

const TICKER = ["Night Owl", "in my era", "On Repeat", "Album Head", "Explorer", "Marathoner", "Loyalist", "Weekender"];

export default async function Home({ searchParams }: PageProps<"/">) {
  const signedIn = Boolean(await getSessionUserId());
  const { error } = await searchParams;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <Mesh />
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <Logo />
        <Link
          href={signedIn ? "/me" : "/api/auth/login"}
          prefetch={false}
          className="glass rounded-full px-4 py-2 text-sm font-medium transition hover:bg-white/10"
        >
          {signedIn ? "Open dashboard" : "Sign in"}
        </Link>
      </nav>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-5 pb-16 pt-10">
        {error && (
          <p className="mb-6 w-fit rounded-full bg-red-500/15 px-4 py-2 text-sm text-red-200">
            Couldn’t connect to Spotify. Try again.
          </p>
        )}
        <p className="rise mb-6 text-xs uppercase tracking-[0.24em] text-muted">A scrobbler for Spotify</p>
        <h1 className="rise text-[clamp(3rem,10vw,8.5rem)] font-semibold leading-[0.9] tracking-[-0.04em]" style={{ animationDelay: "80ms" }}>
          Your listening,
          <br />
          <span className="font-display font-normal italic tracking-[-0.02em] text-accent">in full colour.</span>
        </h1>
        <p className="rise mt-8 max-w-xl text-lg text-muted" style={{ animationDelay: "160ms" }}>
          Xtra keeps track of what you play on Spotify and turns it into a profile page. You can’t change how it looks.
          Only what you listen to can.
        </p>
        <div className="rise mt-10 flex flex-wrap items-center gap-4" style={{ animationDelay: "240ms" }}>
          <Link
            href={signedIn ? "/me" : "/api/auth/login"}
            prefetch={false}
            className="inline-flex items-center gap-3 rounded-full bg-fg px-6 py-3.5 font-medium text-bg transition hover:scale-[1.03]"
          >
            <SpotifyGlyph />
            {signedIn ? "Go to your dashboard" : "Connect Spotify"}
          </Link>
          <Link href="/u/demo" className="rounded-full px-5 py-3.5 text-muted transition hover:text-fg">
            See a demo profile →
          </Link>
        </div>
      </main>

      <div className="border-y border-line py-4 overflow-hidden">
        <div className="marquee flex w-max gap-10 whitespace-nowrap font-display text-3xl italic text-muted">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="flex items-center gap-10">
              {t} <span className="size-2 rounded-full bg-accent" />
            </span>
          ))}
        </div>
      </div>

      <section className="mx-auto grid w-full max-w-6xl gap-4 px-5 py-16 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <div key={f.title} className="glass rounded-3xl p-6">
            <div className="font-mono text-xs text-accent">0{i + 1}</div>
            <h3 className="mt-6 text-xl font-semibold tracking-tight">{f.title}</h3>
            <p className="mt-2 text-muted">{f.body}</p>
          </div>
        ))}
      </section>

      <footer className="mx-auto w-full max-w-6xl px-5 pb-10 text-sm text-muted">
        Not affiliated with Spotify. Listening data stays in your own database.
      </footer>
    </div>
  );
}

function SpotifyGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
      <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1 .25c-2.85-1.74-6.43-2.13-10.66-1.17a.75.75 0 1 1-.33-1.46c4.62-1.05 8.6-.6 11.74 1.33.36.22.47.69.25 1.05Zm1.47-3.27a.94.94 0 0 1-1.29.31c-3.26-2-8.23-2.59-12.08-1.42a.94.94 0 0 1-.54-1.8c4.4-1.33 9.88-.68 13.6 1.62.44.27.58.85.31 1.29Zm.13-3.4C15.18 8.3 8.72 8.08 4.98 9.22a1.13 1.13 0 1 1-.65-2.16c4.29-1.3 11.43-1.05 15.94 1.63a1.13 1.13 0 0 1-1.16 1.94Z" />
    </svg>
  );
}
