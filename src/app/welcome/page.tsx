import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Aura } from "@/components/Aura";
import { Logo } from "@/components/Logo";
import { ProfileForm } from "@/components/ProfileForm";
import { buildProfile } from "@/lib/profile";
import { getSessionUser } from "@/lib/session";
import { themeVars } from "@/lib/theme";

export const metadata: Metadata = { title: "Welcome" };

export default async function Welcome() {
  const user = await getSessionUser();
  if (!user) redirect("/");
  if (user.onboarded) redirect("/me");

  const profile = await buildProfile(user);
  const plays = profile.allTime.plays;

  return (
    <div style={themeVars(profile.palette, profile.mood)} className="relative min-h-screen">
      <Aura params={profile.aura.params} veil={0.5} />
      <nav className="mx-auto w-full max-w-3xl px-5 py-6">
        <Logo href="/welcome" />
      </nav>
      <main className="rise mx-auto flex w-full max-w-3xl flex-col gap-10 px-5 pb-20 pt-6">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted">Welcome, {user.displayName}</p>
          <h1 className="mt-4 text-[clamp(2.5rem,7vw,5rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
            Claim your <span className="font-display font-normal italic text-accent">corner of the sky.</span>
          </h1>
          <p className="mt-6 max-w-xl text-muted">
            {plays > 0
              ? `We just pulled your last ${plays} plays from Spotify. The sky behind this text is already built from them.`
              : "Once you play some music, the sky behind this text will start building itself from it."}{" "}
            Your profile works the same way: no themes and no bio. You pick a handle, and your listening does the rest.
          </p>
        </div>
        <div className="glass rounded-3xl p-6 sm:p-8">
          <ProfileForm username={user.username} visibility={user.visibility} submitLabel="Create my profile" />
        </div>
      </main>
    </div>
  );
}
