import { NextResponse } from "next/server";
import { importHistory } from "@/lib/import";
import { getSessionUser } from "@/lib/session";

export const maxDuration = 300;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  const totals = { files: 0, considered: 0, eligible: 0, added: 0 };
  for (const file of files) {
    let entries: unknown;
    try {
      entries = JSON.parse(await file.text());
    } catch {
      return NextResponse.json({ error: `${file.name} is not valid JSON` }, { status: 400 });
    }
    if (!Array.isArray(entries)) {
      return NextResponse.json({ error: `${file.name} is not a streaming history file` }, { status: 400 });
    }
    const r = await importHistory(user.id, entries);
    totals.files++;
    totals.considered += r.considered;
    totals.eligible += r.eligible;
    totals.added += r.added;
  }
  return NextResponse.json(totals);
}
