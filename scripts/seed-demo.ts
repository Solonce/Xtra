/**
 * Seeds fictional listeners (/u/demo, /u/demo-rave) to show off profiles without Spotify.
 *   npm run db:seed
 */
import { eq } from "drizzle-orm";
import { albumKey, artistKey } from "../src/lib/keys";

try {
  process.loadEnvFile(".env.local");
} catch {
  // defaults to a local SQLite file
}

const DAY = 86_400_000;

// Fictional catalogue — cover art is rendered as gradients from these colours.
const CATALOG: { artist: string; genres: string[]; albums: { name: string; colors: string[]; tracks: string[] }[] }[] = [
  { artist: "Velvet Static", genres: ["dream pop", "shoegaze"], albums: [
    { name: "Softer Than Signal", colors: ["#ff6fb5", "#6b3cff", "#ffd1e8", "#1b0b3a"], tracks: ["Halo Frequency", "Pink Noise", "Satellite Hearts", "Drift", "Low Orbit"] },
    { name: "Glass Weather", colors: ["#9ad7ff", "#3a5bff", "#e6f3ff", "#0a1640"], tracks: ["Condensation", "Blue Hour", "Weatherproof"] },
  ] },
  { artist: "Nova Kaye", genres: ["alt r&b", "neo soul"], albums: [
    { name: "Afterglow Tapes", colors: ["#ff8a3d", "#c2185b", "#ffe0b2", "#2a0c12"], tracks: ["Slow Burn", "Tangerine Sky", "Late Checkout", "Honey Static"] },
  ] },
  { artist: "Paper Tigers Club", genres: ["indie rock"], albums: [
    { name: "Fever Dream Summer", colors: ["#ffe14d", "#ff5a36", "#fff6cc", "#2b1500"], tracks: ["Sunburnt", "Parking Lot Poets", "Cherry Cola", "Heatwave"] },
  ] },
  { artist: "Lumen & The Hollow", genres: ["ambient", "electronica"], albums: [
    { name: "Nightshift", colors: ["#2de2e6", "#0b3d91", "#b8fffd", "#020a1a"], tracks: ["03:14", "Neon Rain", "Vending Machine Glow", "Night Bus"] },
  ] },
  { artist: "Marisol", genres: ["latin pop"], albums: [
    { name: "Corazón Eléctrico", colors: ["#ff2e63", "#08d9d6", "#ffe6ec", "#1a0610"], tracks: ["Luz", "Bailar Sola", "Eléctrico"] },
  ] },
  { artist: "Oak & Ember", genres: ["folk", "indie folk"], albums: [
    { name: "Kindling", colors: ["#c8a165", "#5a3e2b", "#f3e3c3", "#1b120b"], tracks: ["Woodsmoke", "Northern Road", "Letters Home"] },
  ] },
  { artist: "KXNG VOLT", genres: ["hip hop", "trap"], albums: [
    { name: "High Voltage", colors: ["#b6ff3b", "#1e1e1e", "#f0ffd6", "#0a0a0a"], tracks: ["Ampere", "Surge", "Blackout", "Live Wire"] },
  ] },
  { artist: "Saint Juniper", genres: ["bedroom pop"], albums: [
    { name: "Houseplants", colors: ["#7bd389", "#2f6f4e", "#e3ffe8", "#0c1f15"], tracks: ["Monstera", "Watering Can", "Sunlight Through Blinds"] },
  ] },
  // Greyscale, grungy covers: tests that the sky borrows a hue from the genres instead.
  { artist: "Rust Belt Saints", genres: ["grunge", "alternative rock"], albums: [
    { name: "Carburetor Hymns", colors: ["#6e6259", "#2b2522", "#a39a91", "#141210"], tracks: ["Oil Slick", "Fuzz Halo", "Basement Summer", "Corrosion"] },
  ] },
  { artist: "Ashen Choir", genres: ["gothic rock", "post-punk", "new wave"], albums: [
    { name: "Disintegrating Light", colors: ["#8a8f96", "#3b3f45", "#d0d3d6", "#101113"], tracks: ["Lullaby for Ghosts", "Pictures in Ash", "Cold Cathedral"] },
  ] },
  { artist: "Cinder Tomb", genres: ["thrash metal", "metalcore"], albums: [
    { name: "Writ in Brimstone", colors: ["#7a1d12", "#1a1a1a", "#c9a36b", "#0b0808"], tracks: ["Hellmouth", "Brimstone Choir", "Nine Circles"] },
  ] },
];

// Deterministic PRNG so every seed looks the same.
let seed = 42;
const rand = () => ((seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32);
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

// Two contrasting listeners, so the generated skies can be compared side by side.
const PERSONAS = [
  {
    id: "demo",
    displayName: "Demo Listener",
    focus: ["Velvet Static"], // a dreamy late-night era with one song on repeat
    startHourUtc: 22, // 6pm New York
    maxPlays: 45,
    focusShare: 0.45,
    obsessionShare: 0.12,
  },
  {
    id: "demo-rave",
    displayName: "Rave Demo",
    focus: ["KXNG VOLT", "Marisol", "Paper Tigers Club"], // daytime, high energy, lots of variety
    startHourUtc: 12, // 8am New York
    maxPlays: 60,
    focusShare: 0.5,
    obsessionShare: 0,
  },
  {
    id: "demo-grunge",
    displayName: "Grunge Demo",
    focus: ["Rust Belt Saints", "Ashen Choir", "Cinder Tomb"], // afternoons, loud and gloomy
    startHourUtc: 18, // 2pm New York
    maxPlays: 40,
    focusShare: 0.7,
    obsessionShare: 0.1,
  },
];

async function main() {
  // Imported after loading .env.local, since the client reads DATABASE_URL on import.
  const { db, schema } = await import("../src/db");
  type NewScrobble = typeof schema.scrobbles.$inferInsert;

  const allTracks: { id: string; artistId: string; albumId: string; weight: number }[] = [];
  for (const [ai, a] of CATALOG.entries()) {
    const artistId = artistKey(a.artist);
    await db.insert(schema.artists).values({ id: artistId, name: a.artist, genres: a.genres }).onConflictDoNothing();
    for (const al of a.albums) {
      const albumId = albumKey(a.artist, al.name);
      await db.insert(schema.albums).values({ id: albumId, name: al.name, artistId, colors: al.colors }).onConflictDoNothing();
      for (const [ti, name] of al.tracks.entries()) {
        const id = `demo-${ai}-${albumId.length}-${ti}`;
        await db
          .insert(schema.tracks)
          .values({ id, name, artistId, albumId, artistNames: a.artist, durationMs: 150_000 + ti * 17_000, enriched: true })
          .onConflictDoNothing();
        allTracks.push({ id, artistId, albumId, weight: 1 / (ai + 1.5) });
      }
    }
  }

  const now = Date.now();
  for (const persona of PERSONAS) {
    await db.delete(schema.scrobbles).where(eq(schema.scrobbles.userId, persona.id));
    await db
      .insert(schema.users)
      .values({
        id: persona.id,
        username: persona.id,
        displayName: persona.displayName,
        timezone: "America/New_York",
        onboarded: true,
      })
      .onConflictDoUpdate({ target: schema.users.id, set: { timezone: "America/New_York" } });

    const focusIds = new Set(persona.focus.map(artistKey));
    const focusTracks = allTracks.filter((t) => focusIds.has(t.artistId));
    const obsession = focusTracks[0];
    const rows: NewScrobble[] = [];

    for (let d = 200; d >= 0; d--) {
      const recent = d < 14;
      const plays = Math.floor(rand() * (recent ? persona.maxPlays : 30));
      let t = Math.floor((now - d * DAY) / DAY) * DAY + (persona.startHourUtc + rand() * 4) * 3_600_000 - DAY;
      for (let i = 0; i < plays; i++) {
        let track = pick(allTracks);
        if (rand() < track.weight) track = pick(allTracks.filter((x) => x.artistId === track.artistId));
        if (recent && rand() < persona.focusShare) track = pick(focusTracks);
        if (d < 7 && rand() < persona.obsessionShare) track = obsession;
        t += 150_000 + rand() * 90_000;
        if (t > now) break;
        rows.push({
          userId: persona.id,
          trackId: track.id,
          artistId: track.artistId,
          albumId: track.albumId,
          playedAt: Math.floor(t / 1000) * 1000,
          msPlayed: 180_000,
          source: "import",
        });
      }
    }

    for (let i = 0; i < rows.length; i += 500) {
      await db.insert(schema.scrobbles).values(rows.slice(i, i + 500)).onConflictDoNothing();
    }
    // Spotify's top lists, as if fetched from /me/top: the focus artists lead every range.
    await db.delete(schema.topItems).where(eq(schema.topItems.userId, persona.id));
    const ranked = [...focusIds, ...CATALOG.map((c) => artistKey(c.artist)).filter((id) => !focusIds.has(id))];
    for (const range of ["short_term", "medium_term", "long_term"] as const) {
      await db.insert(schema.topItems).values([
        ...ranked.map((itemId, rank) => ({ userId: persona.id, kind: "artist" as const, range, rank, itemId })),
        ...[...focusTracks, ...allTracks.filter((t) => !focusIds.has(t.artistId))]
          .slice(0, 20)
          .map((t, rank) => ({ userId: persona.id, kind: "track" as const, range, rank, itemId: t.id })),
      ]);
    }
    console.log(`Seeded ${rows.length} scrobbles → /u/${persona.id}`);
  }
}

main();
