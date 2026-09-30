/**
 * Checks that an xtra install is ready for real Spotify sign-ins.
 *   npm run doctor
 */
try {
  process.loadEnvFile(".env.local");
} catch {
  // use the process environment (e.g. `vercel env pull` output or CI)
}

let failures = 0;
const ok = (msg: string) => console.log(`  ✓ ${msg}`);
const bad = (msg: string) => {
  failures++;
  console.log(`  ✗ ${msg}`);
};
const warn = (msg: string) => console.log(`  ! ${msg}`);

async function main() {
  console.log("\nEnvironment");
  const env = process.env;
  for (const key of ["SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET", "APP_URL", "SESSION_SECRET"]) {
    if (env[key]) ok(`${key} is set`);
    else bad(`${key} is missing`);
  }
  if (env.SESSION_SECRET && env.SESSION_SECRET.length < 32) bad("SESSION_SECRET should be at least 32 characters");
  if (env.APP_URL) {
    if (env.APP_URL.endsWith("/")) bad("APP_URL must not end with a slash");
    if (env.APP_URL.includes("localhost")) bad("Spotify rejects localhost redirect URIs — use http://127.0.0.1:3000");
    console.log(`\n  Register this Redirect URI in the Spotify dashboard, exactly:\n    ${env.APP_URL.replace(/\/$/, "")}/api/auth/callback\n`);
  }
  if (!env.CRON_SECRET) warn("CRON_SECRET not set — scheduled sync (/api/cron/sync) is disabled");

  console.log("Spotify");
  if (env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET) {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    }).catch((e: Error) => e);
    if (res instanceof Error) bad(`Couldn't reach Spotify: ${res.message}`);
    else if (res.ok) ok("Client ID and secret are valid");
    else bad(`Spotify rejected the credentials (${res.status}) — double-check the ID and secret`);
  } else {
    warn("skipped (no credentials)");
  }

  console.log("\nDatabase");
  const { db, schema } = await import("../src/db");
  try {
    const users = await db.select().from(schema.users);
    ok(`Connected to ${env.DATABASE_URL || "file:xtra.db"}`);
    const real = users.filter((u) => !u.id.startsWith("demo"));
    const owner = real.find((u) => u.role === "owner");
    if (owner) ok(`Owner: ${owner.displayName} (/u/${owner.username})`);
    else warn("No one has signed in yet — the first person to connect Spotify becomes the owner");
    ok(`${real.length} real profile(s), ${users.length - real.length} demo profile(s)`);
  } catch (e) {
    bad(`Database not ready (${(e as Error).message}) — run \`npm run db:migrate\``);
  }

  console.log(failures ? `\n${failures} problem(s) to fix.\n` : "\nAll good. Start the app and connect Spotify.\n");
  process.exit(failures ? 1 : 0);
}

main();
