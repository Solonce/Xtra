# Going live with real data

This is the checklist for getting the first real profile (the owner's) onto xtra.

## 1. Create the Spotify app (5 minutes)

1. Sign in at <https://developer.spotify.com/dashboard> with **your own Spotify account**. Since February 2026, development-mode apps need the owner to have **Spotify Premium**.
2. **Create app**
   - App name / description: anything (e.g. "xtra").
   - Redirect URIs, one per environment you'll use:
     - Local: `http://127.0.0.1:3000/api/auth/callback`
     - Hosted: `https://<your-domain>/api/auth/callback`
   - APIs used: tick **Web API**.
3. Open the app's **Settings** and copy the **Client ID** and **Client secret**. Keep the secret out of chat, email and git; it only goes in env vars.
4. **User Management**: add the Spotify email of everyone who should be able to sign in. Development mode allows **5 users** in total, including you. Going beyond that needs Spotify's extended quota review.

## 2a. Run it on your own computer (quickest)

```sh
git clone <this repo> && cd Xtra
npm install
cp .env.example .env.local        # paste the Client ID + secret, set SESSION_SECRET
npm run db:migrate
npm run doctor                    # should end with "All good"
npm run dev
```

Open **http://127.0.0.1:3000** (not `localhost`) and click **Connect Spotify**. You'll land on `/welcome` to claim your handle. Because you're the first person to sign in, you become the instance **owner**.

Note: with this setup, plays only sync while the app is running. Spotify only remembers your last 50 tracks, so anything older than that is missed while the app is off. Use the history import to backfill.

## 2b. Host it (recommended, so sync runs 24/7 and the profile is shareable)

1. **Database:** create a free Turso database (<https://turso.tech>), then copy its `libsql://…` URL and an auth token.
2. **Vercel:** import the GitHub repo at <https://vercel.com/new> and set these environment variables:

   | Variable | Value |
   | --- | --- |
   | `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | from step 1 |
   | `APP_URL` | `https://<your-project>.vercel.app` (no trailing slash) |
   | `SESSION_SECRET` | output of `openssl rand -base64 32` |
   | `DATABASE_URL` / `DATABASE_AUTH_TOKEN` | from Turso |
   | `CRON_SECRET` | output of `openssl rand -hex 24` |

3. Create the tables once, from your machine:
   ```sh
   DATABASE_URL=libsql://… DATABASE_AUTH_TOKEN=… npm run db:migrate
   ```
4. Add `https://<your-project>.vercel.app/api/auth/callback` to the Spotify app's Redirect URIs.
5. **Scheduled sync:** in the GitHub repo, go to Settings → Secrets and variables → Actions:
   - Variables: `XTRA_URL` = `https://<your-project>.vercel.app`
   - Secrets: `CRON_SECRET` = the same value as on Vercel

   The `Scrobble sync` workflow then pulls new plays every 30 minutes. Scheduled workflows run from the default branch, so merge this branch first.

## 3. Backfill your history

Spotify's live API only knows your last 50 plays. For everything before that:

1. Go to <https://www.spotify.com/account/privacy/> and request **Extended streaming history**. The email usually arrives within a few days, but Spotify quotes up to 30.
2. On your xtra dashboard, go to **Import history** and select all the `Streaming_History_Audio_*.json` files.

Artwork for imported tracks fills in over the next few syncs, about 25 tracks per sync, most-played first.
