import Link from "next/link";
import { requireUser } from "@/lib/supabase/auth";
import { SpeakingHistoryList, type HistoryItem } from "@/components/speaking/speaking-history-list";
import { PageTitle } from "@/components/app/page-title";

export const metadata = { title: "Speaking history" };

export default async function SpeakingHistoryPage() {
  const { supabase, user } = await requireUser();

  const { data } = await supabase
    .from("speaking_sessions")
    .select(
      "id, day_number, date, stage, topic, curveballs, target_duration_seconds, actual_duration_seconds, completed_target, transcript, recording_path",
    )
    .eq("user_id", user.id)
    .order("day_number", { ascending: false })
    .order("date", { ascending: false });

  const rows = data ?? [];

  // Create short-lived signed URLs for any recordings.
  const items: HistoryItem[] = await Promise.all(
    rows.map(async (r) => {
      let audioUrl: string | null = null;
      if (r.recording_path) {
        const { data: signed } = await supabase.storage
          .from("recordings")
          .createSignedUrl(r.recording_path as string, 3600);
        audioUrl = signed?.signedUrl ?? null;
      }
      return {
        id: r.id as string,
        dayNumber: r.day_number as number,
        date: r.date as string,
        stage: r.stage as number,
        topic: r.topic as string,
        curveballs: (r.curveballs as string[] | null) ?? [],
        targetDurationSeconds: r.target_duration_seconds as number,
        actualDurationSeconds: r.actual_duration_seconds as number,
        completedTarget: r.completed_target as boolean,
        transcript: (r.transcript as string | null) ?? "",
        audioUrl,
      };
    }),
  );

  return (
    <main id="main" tabIndex={-1} className="outline-hidden mx-auto w-full max-w-[880px] flex-1 px-5 pt-8 pb-12 sm:px-8 sm:pt-12">
      <PageTitle
        title="Past sessions"
        lede="Every session you saved, newest first, with its transcript and recording."
        aside={
          <Link
            href="/speaking"
            className="text-sm text-muted-foreground underline decoration-1 underline-offset-4 transition-colors hover:text-foreground hover:decoration-2"
          >
            Back to practice
          </Link>
        }
        className="mb-10"
      />

      {items.length === 0 ? (
        <p className="border-y border-border py-8 text-sm text-muted-foreground">
          No sessions yet. Save one from the practice screen and it shows up here.
        </p>
      ) : (
        <SpeakingHistoryList items={items} />
      )}
    </main>
  );
}
