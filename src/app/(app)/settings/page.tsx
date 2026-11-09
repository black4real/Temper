import { getProfile } from "@/lib/supabase/auth";
import { SettingsForm } from "@/components/settings/settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { profile } = await getProfile();

  return (
    <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-[640px] flex-1 px-5 py-8 sm:py-10">
      <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight">Settings</h1>
      <SettingsForm profile={profile} />
    </main>
  );
}
