import Link from "next/link";
import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { currentStage, successesAtCurrentStage, type StageInput } from "@/lib/ghost-mode/speaking";
import { SpeakingSession } from "@/components/speaking/speaking-session";

export const metadata = { title: "Speaking" };

export default async function SpeakingPage() {
  const { user, profile } = await getProfile();
  const supabase = await createClient();

  const { data } = await supabase
    .from("speaking_sessions")
    .select("day_number, stage, completed_target")
    .eq("user_id", user.id);

  const sessions: StageInput[] = (data ?? []).map((r) => ({
    dayNumber: r.day_number as number,
    stage: r.stage as number,
    completedTarget: r.completed_target as boolean,
  }));

  const stage = currentStage(sessions);
  const successes = successesAtCurrentStage(sessions);
  const totalSuccessful = sessions.filter((s) => s.completedTarget).length;

  return (
    <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-[720px] flex-1 px-5 py-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Speaking</h1>
        <Link
          href="/speaking/history"
          className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          History
        </Link>
      </div>

      <SpeakingSession
        userId={user.id}
        startDate={profile.start_date}
        saveRecordings={profile.save_recordings}
        currentStage={stage}
        successesAtStage={successes}
        totalSuccessful={totalSuccessful}
      />
    </main>
  );
}
