import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { db, schema } from "@/db";
import { createSession } from "@/lib/session";
import { exchangeCode, pickImage, type SpotifyMe, spotifyGet } from "@/lib/spotify";
import { syncIfStale } from "@/lib/sync";

function slugify(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "listener"
  );
}

async function uniqueUsername(base: string) {
  for (let i = 0; ; i++) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    const taken = await db.query.users.findFirst({ where: eq(schema.users.username, candidate) });
    if (!taken) return candidate;
  }
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const jar = await cookies();
  const expected = jar.get("xtra_oauth_state")?.value;
  jar.delete("xtra_oauth_state");

  const code = params.get("code");
  if (params.get("error") || !code || !expected || params.get("state") !== expected) {
    redirect("/?error=auth");
  }

  const token = await exchangeCode(code);
  const me = await spotifyGet<SpotifyMe>(token.access_token, "/me");
  if (!me) redirect("/?error=auth");

  const existing = await db.query.users.findFirst({ where: eq(schema.users.id, me.id) });
  const credentials = {
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? existing?.refreshToken ?? null,
    tokenExpiresAt: Date.now() + token.expires_in * 1000,
    displayName: me.display_name || me.id,
    avatarUrl: pickImage(me.images, 300),
  };
  if (existing) {
    await db.update(schema.users).set(credentials).where(eq(schema.users.id, me.id));
  } else {
    const username = await uniqueUsername(slugify(me.display_name || me.id));
    await db.insert(schema.users).values({ id: me.id, username, ...credentials });
  }

  await createSession(me.id);
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, me.id) });
  if (user) await syncIfStale(user, 0);
  redirect("/me");
}
