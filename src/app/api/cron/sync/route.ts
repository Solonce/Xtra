import { isNotNull } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { syncUser } from "@/lib/sync";

export const maxDuration = 300;

// Hit this every 30–60 minutes (GitHub Actions, Vercel Cron, cron-job.org…) so no plays
// fall out of Spotify's 50-track recently-played window.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const users = await db.select().from(schema.users).where(isNotNull(schema.users.refreshToken));
  const results: Record<string, number | string> = {};
  for (const user of users) {
    try {
      results[user.username] = (await syncUser(user)).added;
    } catch (e) {
      results[user.username] = e instanceof Error ? e.message : "failed";
    }
  }
  return NextResponse.json({ synced: users.length, results });
}
