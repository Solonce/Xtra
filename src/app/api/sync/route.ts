import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { syncUser } from "@/lib/sync";

export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await syncUser(user));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Spotify sync failed" }, { status: 502 });
  }
}
