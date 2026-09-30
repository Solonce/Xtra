"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { handleError, normalizeHandle, VISIBILITY, type Visibility } from "@/lib/handles";
import { destroySession, getSessionUser } from "@/lib/session";

export type FormState = { error?: string; saved?: boolean };

export async function saveProfile(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) redirect("/");

  const username = normalizeHandle(String(form.get("username") ?? ""));
  const error = handleError(username);
  if (error) return { error };

  const visibility = String(form.get("visibility")) as Visibility;
  if (!(visibility in VISIBILITY)) return { error: "Pick who can see your profile." };

  const taken = await db.query.users.findFirst({
    where: and(eq(schema.users.username, username), ne(schema.users.id, user.id)),
  });
  if (taken) return { error: `@${username} is taken.` };

  await db
    .update(schema.users)
    .set({ username, visibility, onboarded: true })
    .where(eq(schema.users.id, user.id));

  revalidatePath(`/u/${user.username}`);
  if (!user.onboarded) redirect(`/u/${username}?welcome=1`);
  return { saved: true };
}

export async function deleteAccount(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (normalizeHandle(String(form.get("confirm") ?? "")) !== user.username) {
    return { error: `Type ${user.username} to confirm.` };
  }
  await db.delete(schema.scrobbles).where(eq(schema.scrobbles.userId, user.id));
  await db.delete(schema.users).where(eq(schema.users.id, user.id));
  await destroySession();
  redirect("/");
}
