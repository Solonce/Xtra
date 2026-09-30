import { after, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { enrichUser, syncUser } from "@/lib/sync";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const result = await syncUser(user);
    after(() => enrichUser(user));
    return NextResponse.json(result);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Spotify sync failed" }, { status: 502 });
  }
}
