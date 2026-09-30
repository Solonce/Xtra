import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { getNowPlaying } from "@/lib/now-playing";

export async function GET(_req: Request, ctx: RouteContext<"/api/now-playing/[username]">) {
  const { username } = await ctx.params;
  const user = await db.query.users.findFirst({ where: eq(schema.users.username, username) });
  if (!user) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(await getNowPlaying(user));
}
