import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Aura } from "@/components/Aura";
import { Card } from "@/components/Card";
import { DeleteAccount } from "@/components/DeleteAccount";
import { Logo } from "@/components/Logo";
import { ProfileForm } from "@/components/ProfileForm";
import { buildProfile } from "@/lib/profile";
import { getSessionUser } from "@/lib/session";
import { themeVars } from "@/lib/theme";

export const metadata: Metadata = { title: "Settings" };

export default async function Settings() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (!user.onboarded) redirect("/welcome");
  const profile = await buildProfile(user);

  return (
    <div style={themeVars(profile.palette, profile.mood)} className="relative min-h-screen">
      <Aura params={profile.aura.params} veil={0.6} />
      <nav className="mx-auto flex w-full max-w-3xl items-center justify-between px-5 py-6">
        <Logo href="/me" />
        <div className="flex items-center gap-1 text-sm">
          <Link href="/me" className="rounded-full px-3 py-2 text-muted transition hover:text-fg">Dashboard</Link>
          <Link href={`/u/${user.username}`} className="rounded-full px-3 py-2 text-muted transition hover:text-fg">Profile</Link>
        </div>
      </nav>
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-5 pb-20">
        <h1 className="py-4 text-4xl font-semibold tracking-tight">Settings</h1>
        <Card title="Profile">
          <ProfileForm username={user.username} visibility={user.visibility} submitLabel="Save" />
        </Card>
        <Card title="Account">
          <div className="flex flex-col gap-6">
            <p className="text-sm text-muted">
              Signed in with Spotify as <span className="text-fg">{user.displayName}</span>
              {user.role === "owner" && " · owner of this xtra instance"}.
            </p>
            <form action="/api/auth/logout" method="post">
              <button className="glass rounded-full px-4 py-2 text-sm transition hover:bg-white/10">Sign out</button>
            </form>
            <DeleteAccount username={user.username} />
          </div>
        </Card>
      </main>
    </div>
  );
}
