import Link from "next/link";
import { getProfile } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";
import { currentStage, successesAtCurrentStage, type StageInput } from "@/lib/ghost-mode/speaking";
import { SpeakingSession } from "@/components/speaking/speaking-session";
import { PageTitle } from "@/components/app/page-title";

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
    <main id="main" tabIndex={-1} className="outline-hidden mx-auto w-full max-w-[1040px] flex-1 px-5 pt-8 pb-12 sm:px-8 sm:pt-12">
      <PageTitle
        title="Speaking"
        lede="Talk on the topic until the bar reaches the target. Hit the target and today's speaking commitment is done."
        aside={
          <Link
            href="/speaking/history"
            className="text-sm text-muted-foreground underline decoration-1 underline-offset-4 transition-colors hover:text-foreground hover:decoration-2"
          >
            Past sessions
          </Link>
        }
        className="mb-10"
      />

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
