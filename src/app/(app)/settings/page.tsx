import { getProfile } from "@/lib/supabase/auth";
import { getHabits } from "@/lib/ghost-mode/habits-data";
import { SettingsForm } from "@/components/settings/settings-form";
import { HabitsEditor } from "@/components/settings/habits-editor";
import { PageTitle } from "@/components/app/page-title";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { user, profile } = await getProfile();
  const { habits, editable } = await getHabits(user.id);

  return (
    <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-[880px] flex-1 px-5 pt-8 pb-12 sm:px-8 sm:pt-12">
      <PageTitle title="Settings" className="mb-12" />
      <div className="flex flex-col gap-16">
        <HabitsEditor habits={habits} editable={editable} />
        <SettingsForm profile={profile} />
      </div>
    </main>
  );
}
