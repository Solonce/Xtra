// Genre families ("vibes") and the page effects they unlock. Shared by the server,
// which scores a listener's taste, and the client, which renders the effects.

export type EffectId =
  | "rain" | "demons" | "lightning" | "embers" | "static" | "bats" | "bokeh" | "lasers"
  | "spray" | "smoke" | "notes" | "fireflies" | "leaves" | "tumbleweed" | "sparkles"
  | "petals" | "confetti" | "disco" | "lanterns" | "vhs" | "lava" | "shootingStars"
  | "glitch" | "planes" | "sunrays" | "constellation" | "vinyl" | "snow";

type Vibe = {
  label: string;
  match: RegExp;
  effects: EffectId[];
  hue: number; // used to tint the sky when album covers are colourless
};

// Order matters only for display; an artist can count towards several vibes.
export const VIBES = {
  melancholy: {
    label: "Melancholy",
    match: /\b(emo|sad|slowcore|sadcore|melanchol|chamber pop|piano rock|singer-songwriter|ballad|dark folk|midwest emo|post-rock)\b|shoegaze|depress/,
    effects: ["rain"],
    hue: 215,
  },
  metal: {
    label: "Metal",
    match: /metal|thrash|death metal|deathcore|black metal|doom|grindcore|sludge|djent|hardcore techno/,
    effects: ["demons", "lightning"],
    hue: 0,
  },
  punk: {
    label: "Punk & hardcore",
    match: /(?<!post-)punk|hardcore|screamo|\boi\b|skate punk|riot grrrl/,
    effects: ["embers"],
    hue: 340,
  },
  grunge: {
    label: "Grunge & alt-rock",
    match: /grunge|alternative rock|alt rock|alternative metal|noise rock|stoner|fuzz|garage rock|90s|post-grunge|^alternative$|^rock$/,
    effects: ["static"],
    hue: 28,
  },
  goth: {
    label: "Goth & post-punk",
    match: /goth|darkwave|post-punk|coldwave|new wave|synthpop|dark wave|deathrock|ethereal wave/,
    effects: ["bats"],
    hue: 285,
  },
  dreamy: {
    label: "Dreamy",
    match: /dream pop|shoegaze|ethereal|chillwave|bedroom pop|ambient pop|slowcore|nu gaze|blackgaze/,
    effects: ["bokeh", "snow"],
    hue: 265,
  },
  electronic: {
    label: "Club",
    match: /edm|house|techno|trance|electro|dubstep|drum and bass|dnb|club|rave|hardstyle|garage\b|bass music|big room|future bass/,
    effects: ["lasers"],
    hue: 190,
  },
  hiphop: {
    label: "Hip-hop",
    match: /hip hop|hip-hop|rap|trap|drill|grime|boom bap|phonk|plugg/,
    effects: ["spray"],
    hue: 45,
  },
  jazz: {
    label: "Jazz & blues",
    match: /jazz|bebop|swing|bossa|lounge|blues|big band/,
    effects: ["smoke"],
    hue: 32,
  },
  classical: {
    label: "Classical & score",
    match: /classical|orchestra|baroque|opera|composer|soundtrack|score|romantic|minimalism|neoclassical|chamber music/,
    effects: ["notes"],
    hue: 48,
  },
  folk: {
    label: "Folk & acoustic",
    match: /folk|acoustic|americana|bluegrass|singer-songwriter|appalachian|celtic/,
    effects: ["fireflies", "leaves"],
    hue: 95,
  },
  country: {
    label: "Country",
    match: /country|western|outlaw|honky|red dirt|cowboy/,
    effects: ["tumbleweed"],
    hue: 35,
  },
  pop: {
    label: "Pop",
    match: /(^|\s)pop$|dance pop|hyperpop|teen pop|electropop|art pop|pop rock|power pop/,
    effects: ["sparkles"],
    hue: 320,
  },
  idol: {
    label: "K-pop, J-pop & anime",
    match: /k-pop|j-pop|c-pop|j-rock|idol|anime|vocaloid|city pop|kpop|jpop/,
    effects: ["petals"],
    hue: 335,
  },
  latin: {
    label: "Latin & tropical",
    match: /latin|reggaeton|salsa|bachata|cumbia|samba|tropical|afrobeat|dancehall|reggae|dembow|corrido|merengue/,
    effects: ["confetti"],
    hue: 18,
  },
  funk: {
    label: "Funk & disco",
    match: /funk|disco|boogie|motown|nu-disco|italo/,
    effects: ["disco"],
    hue: 300,
  },
  soul: {
    label: "R&B & soul",
    match: /r&b|rnb|neo soul|soul|quiet storm|gospel/,
    effects: ["lanterns"],
    hue: 350,
  },
  chill: {
    label: "Lo-fi & chill",
    match: /lo-fi|lofi|chill|study|chillhop|jazzhop|downtempo|trip hop|trip-hop/,
    effects: ["vhs"],
    hue: 255,
  },
  psych: {
    label: "Psychedelic",
    match: /psych|acid|krautrock|space rock|neo-psychedelic|stoner rock/,
    effects: ["lava"],
    hue: 305,
  },
  cosmic: {
    label: "Ambient & post-rock",
    match: /ambient|post-rock|space|drone|new age|cinematic|atmospheric/,
    effects: ["shootingStars"],
    hue: 230,
  },
  experimental: {
    label: "Experimental",
    match: /experimental|noise|glitch|breakcore|idm|digicore|avant|industrial|art rock/,
    effects: ["glitch"],
    hue: 160,
  },
  indie: {
    label: "Indie",
    match: /indie|britpop|math rock|jangle|lo-fi indie|garage/,
    effects: ["planes"],
    hue: 170,
  },
} satisfies Record<string, Vibe>;

export type VibeId = keyof typeof VIBES;

export const EFFECT_INFO: Record<EffectId, { label: string; hint: string }> = {
  rain: { label: "Rain", hint: "move along the bottom to ripple the puddle" },
  demons: { label: "Little demons", hint: "click them" },
  lightning: { label: "Lightning", hint: "click the sky to call it down" },
  embers: { label: "Mosh embers", hint: "swipe through them" },
  static: { label: "Static", hint: "click for interference" },
  bats: { label: "Bats", hint: "click to scatter them" },
  bokeh: { label: "Bokeh", hint: "pop the lights" },
  snow: { label: "Snow", hint: "it settles where you hover" },
  lasers: { label: "Lasers", hint: "click to drop the beat" },
  spray: { label: "Spray paint", hint: "click to tag the wall" },
  smoke: { label: "Smoke", hint: "wave through it" },
  notes: { label: "Notes", hint: "click to play one" },
  fireflies: { label: "Fireflies", hint: "they follow you" },
  leaves: { label: "Falling leaves", hint: "click to blow them" },
  tumbleweed: { label: "Tumbleweed", hint: "click it" },
  sparkles: { label: "Sparkles", hint: "trail behind your cursor" },
  petals: { label: "Petals", hint: "catch the breeze" },
  confetti: { label: "Confetti", hint: "click anywhere" },
  disco: { label: "Disco ball", hint: "light specks sweep the room" },
  lanterns: { label: "Lanterns", hint: "click to release one" },
  vhs: { label: "VHS", hint: "tracking lines and hiss" },
  lava: { label: "Lava lamp", hint: "blobs drift and merge" },
  shootingStars: { label: "Shooting stars", hint: "click to make a wish" },
  glitch: { label: "Glitch", hint: "click to corrupt" },
  planes: { label: "Paper planes", hint: "click to throw one" },
  sunrays: { label: "Morning light", hint: "for early listeners" },
  constellation: { label: "Constellation", hint: "hover the stars: they're your artists" },
  vinyl: { label: "Vinyl", hint: "drag it to scratch" },
};

export type ActiveEffect = {
  id: EffectId;
  intensity: number; // 0–1
  reason: string; // "Melancholy · 34% · The Cure, Silversun Pickups"
};

type ArtistTaste = { id: string; name: string; genres: string[] | null; weight: number };

/**
 * Scores genre families from weighted artists. Each artist's weight is split between
 * the vibes its genres match, so one artist tagged "gothic rock" and "post-punk" doesn't
 * count twice.
 */
export function scoreVibes(artists: ArtistTaste[]) {
  const totals = new Map<VibeId, number>();
  const who = new Map<VibeId, Map<string, number>>();
  let tagged = 0;

  for (const a of artists) {
    const genres = (a.genres ?? []).map((g) => g.toLowerCase());
    if (!genres.length || a.weight <= 0) continue;
    const hits = (Object.keys(VIBES) as VibeId[]).filter((v) =>
      genres.some((g) => VIBES[v].match.test(g)),
    );
    if (!hits.length) continue;
    tagged += a.weight;
    for (const v of hits) {
      totals.set(v, (totals.get(v) ?? 0) + a.weight / hits.length);
      const names = who.get(v) ?? new Map<string, number>();
      names.set(a.name, (names.get(a.name) ?? 0) + a.weight);
      who.set(v, names);
    }
  }

  return [...totals.entries()]
    .map(([id, w]) => ({
      id,
      share: tagged ? w / tagged : 0,
      artists: [...(who.get(id) ?? new Map()).entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n).slice(0, 3),
    }))
    .sort((a, b) => b.share - a.share);
}

export type VibeScore = ReturnType<typeof scoreVibes>[number];

const clamp = (x: number) => Math.min(1, Math.max(0, x));

/** Picks the effects for a page from vibe scores plus a few listening habits. */
export function pickEffects(
  vibes: VibeScore[],
  habits: { night: number; morning: number; variety: number; maxRepeat: number; artistCount: number },
): ActiveEffect[] {
  const effects: ActiveEffect[] = [];
  const seen = new Set<EffectId>();
  const add = (e: ActiveEffect) => {
    if (seen.has(e.id)) return;
    seen.add(e.id);
    effects.push(e);
  };

  for (const v of vibes.filter((v) => v.share >= 0.07).slice(0, 5)) {
    const vibe = VIBES[v.id];
    const intensity = clamp(0.35 + v.share * 1.8);
    const reason = `${vibe.label} · ${Math.round(v.share * 100)}%${v.artists.length ? ` · ${v.artists.join(", ")}` : ""}`;
    vibe.effects.forEach((id, i) => add({ id, intensity: i === 0 ? intensity : intensity * 0.7, reason }));
  }

  if (habits.variety >= 0.35 && habits.artistCount >= 8) {
    add({ id: "constellation", intensity: clamp(habits.variety), reason: `Explorer · ${habits.artistCount} artists lately` });
  }
  if (habits.maxRepeat >= 5) {
    add({ id: "vinyl", intensity: clamp(habits.maxRepeat / 20), reason: `On repeat · one song ${habits.maxRepeat}×` });
  }
  if (habits.morning >= 0.18) {
    add({ id: "sunrays", intensity: clamp(habits.morning * 2), reason: `Early bird · ${Math.round(habits.morning * 100)}% before 9am` });
  }
  return effects.slice(0, 8);
}
