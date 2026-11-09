import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { getHabits } from "@/lib/ghost-mode/habits-data";
import { rowsToDayMap } from "@/lib/ghost-mode/records";
import { WeekReview } from "@/components/analysis/week-review";

export const metadata = { title: "Week" };

export default async function WeekPage() {
  const { user, profile } = await getProfile();
  const supabase = await createClient();

  const [{ habits }, recordsRes, sessionsRes] = await Promise.all([
    getHabits(user.id),
    supabase.from("day_records").select("*").eq("user_id", user.id),
    supabase.from("speaking_sessions").select("day_number, actual_duration_seconds").eq("user_id", user.id),
  ]);

  // Seconds spoken per day of the cycle.
  const spoken: Record<number, number> = {};
  for (const r of sessionsRes.data ?? []) {
    const d = r.day_number as number;
    spoken[d] = (spoken[d] ?? 0) + ((r.actual_duration_seconds as number | null) ?? 0);
  }

  return (
    <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-[1040px] flex-1 px-5 pt-8 pb-12 sm:px-8 sm:pt-12">
      <WeekReview
        startDate={profile.start_date}
        days={rowsToDayMap(recordsRes.data as Record<string, unknown>[] | null)}
        habits={habits}
        spokenSeconds={spoken}
      />
    </main>
  );
}
