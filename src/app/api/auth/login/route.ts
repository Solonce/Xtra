import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authorizeUrl } from "@/lib/spotify";

export async function GET() {
  const state = randomBytes(16).toString("hex");
  (await cookies()).set("xtra_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  redirect(authorizeUrl(state));
}
