import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { currentStage, successesAtCurrentStage, type StageInput } from "@/lib/ghost-mode/speaking";
import { getHabits } from "@/lib/ghost-mode/habits-data";
import { rowsToDayMap } from "@/lib/ghost-mode/records";
import { averageWpm } from "@/lib/ghost-mode/speaking-stats";
import { AnalysisBoard } from "@/components/analysis/analysis-board";

export const metadata = { title: "Record" };

export default async function AnalysisPage() {
  const { user, profile } = await getProfile();
  const supabase = await createClient();

  const [{ habits, v3 }, recordsRes, sessionsRes] = await Promise.all([
    getHabits(user.id),
    supabase.from("day_records").select("*").eq("user_id", user.id),
    supabase
      .from("speaking_sessions")
      .select("day_number, stage, completed_target, transcript, actual_duration_seconds, date")
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
  ]);

  const rows = sessionsRes.data ?? [];
  const sessions: StageInput[] = rows.map((r) => ({
    dayNumber: r.day_number as number,
    stage: r.stage as number,
    completedTarget: r.completed_target as boolean,
  }));
  // Pace from the ten most recent sessions with a transcript.
  const pace = averageWpm(
    rows.slice(0, 10).map((r) => ({
      transcript: (r.transcript as string | null) ?? "",
      seconds: (r.actual_duration_seconds as number | null) ?? 0,
    })),
  );

  return (
    <main id="main" tabIndex={-1} className="outline-hidden mx-auto w-full max-w-[1040px] flex-1 px-5 pt-8 pb-12 sm:px-8 sm:pt-12">
      <AnalysisBoard
        startDate={profile.start_date}
        days={rowsToDayMap(recordsRes.data as Record<string, unknown>[] | null)}
        habits={habits}
        v3={v3}
        speakingStage={currentStage(sessions)}
        speakingSuccessesAtStage={successesAtCurrentStage(sessions)}
        speakingTotalSuccessful={sessions.filter((s) => s.completedTarget).length}
        averageWpm={pace}
      />
    </main>
  );
}
