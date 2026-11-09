import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getHabits } from "@/lib/ghost-mode/habits-data";
import { rowsToDayMap } from "@/lib/ghost-mode/records";
import { TodayBoard } from "@/components/today/today-board";

export default async function TodayPage() {
  const { user, profile } = await getProfile();
  const supabase = await createClient();

  // Both queries only need user.id, so run them together. All of this user's day records
  // (at most 120 rows) feed the streak; the board picks today's locally. "*" keeps this
  // working before and after migration 0003 (counts, note).
  const [{ habits, v3 }, { data }] = await Promise.all([
    getHabits(user.id),
    supabase.from("day_records").select("*").eq("user_id", user.id),
  ]);

  return (
    <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-[1040px] flex-1 px-5 pt-8 pb-12 sm:px-8 sm:pt-12">
      <TodayBoard
        startDate={profile.start_date}
        initialDays={rowsToDayMap(data as Record<string, unknown>[] | null)}
        habits={habits}
        layout={profile.habit_layout}
        v3={v3}
      />
    </main>
  );
}
