import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { getSessionUserId } from "@/lib/session";

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { timezone } = await req.json();
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    return NextResponse.json({ error: "invalid timezone" }, { status: 400 });
  }
  await db.update(schema.users).set({ timezone }).where(eq(schema.users.id, userId));
  return NextResponse.json({ ok: true });
}
