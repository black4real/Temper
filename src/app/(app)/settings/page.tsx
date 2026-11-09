import { getProfile } from "@/lib/supabase/auth";
import { getHabits } from "@/lib/ghost-mode/habits-data";
import { SettingsForm } from "@/components/settings/settings-form";
import { HabitsEditor } from "@/components/settings/habits-editor";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, profile } = await getProfile();
  const { habits, editable } = await getHabits(user.id);

  return (
    <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-[640px] flex-1 px-5 py-8 sm:py-10">
      <h1 className="mb-6 font-display text-3xl font-semibold tracking-tight">Settings</h1>
      <div className="flex flex-col gap-6">
        <HabitsEditor habits={habits} editable={editable} />
        <SettingsForm profile={profile} />
      </div>
    </main>
  );
}
