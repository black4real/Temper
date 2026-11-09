import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { currentStage, successesAtCurrentStage, type StageInput } from "@/lib/ghost-mode/speaking";
import { getHabits } from "@/lib/ghost-mode/habits-data";
import { AnalysisBoard } from "@/components/analysis/analysis-board";

export const metadata = { title: "Analysis" };

export default async function AnalysisPage() {
  const { user, profile } = await getProfile();
  const supabase = await createClient();

  const [{ habits }, recordsRes, sessionsRes] = await Promise.all([
    getHabits(user.id),
    supabase.from("day_records").select("day_number, completed_habit_ids").eq("user_id", user.id),
    supabase.from("speaking_sessions").select("day_number, stage, completed_target").eq("user_id", user.id),
  ]);

  const records: Record<number, string[]> = {};
  for (const row of recordsRes.data ?? []) {
    records[row.day_number as number] = (row.completed_habit_ids as string[] | null) ?? [];
  }

  const sessions: StageInput[] = (sessionsRes.data ?? []).map((r) => ({
    dayNumber: r.day_number as number,
    stage: r.stage as number,
    completedTarget: r.completed_target as boolean,
  }));

  return (
    <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-[720px] flex-1 px-5 py-8 sm:py-10">
      <AnalysisBoard
        startDate={profile.start_date}
        records={records}
        habits={habits}
        speakingStage={currentStage(sessions)}
        speakingSuccessesAtStage={successesAtCurrentStage(sessions)}
        speakingTotalSuccessful={sessions.filter((s) => s.completedTarget).length}
      />
    </main>
  );
}
