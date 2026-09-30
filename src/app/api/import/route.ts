import { after, NextResponse } from "next/server";
import type { HistoryRow } from "@/lib/history-format";
import { importRows } from "@/lib/import";
import { getSessionUser } from "@/lib/session";
import { enrichUser } from "@/lib/sync";

export const maxDuration = 120;

const MAX_ROWS = 5_000;

/** Receives one batch of play rows parsed in the browser. */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { rows?: HistoryRow[]; last?: boolean } | null;
  if (!Array.isArray(body?.rows) || body.rows.length > MAX_ROWS) {
    return NextResponse.json({ error: `Send up to ${MAX_ROWS} rows per request` }, { status: 400 });
  }
  const result = await importRows(user.id, body.rows);
  if (body.last) after(() => enrichUser(user, 60_000));
  return NextResponse.json(result);
}
