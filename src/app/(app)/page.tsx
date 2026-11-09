import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getHabits } from "@/lib/ghost-mode/habits-data";
import { TodayBoard } from "@/components/today/today-board";

export default async function TodayPage() {
  const { user, profile } = await getProfile();
  const supabase = await createClient();

  // Both queries only need user.id, so run them together rather than back to back —
  // one round-trip of latency instead of two on every page turn.
  const [{ habits }, { data }] = await Promise.all([
    getHabits(user.id),
    // Load all of this user's day records (<= 120 rows). The board picks today's locally.
    supabase.from("day_records").select("day_number, completed_habit_ids").eq("user_id", user.id),
  ]);

  const records: Record<number, string[]> = {};
  for (const row of data ?? []) {
    records[row.day_number as number] = (row.completed_habit_ids as string[] | null) ?? [];
  }

  return (
    <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-[720px] flex-1 px-5 py-8 sm:py-10">
      <TodayBoard
        startDate={profile.start_date}
        initialRecords={records}
        habits={habits}
        layout={profile.habit_layout}
      />
    </main>
  );
}
