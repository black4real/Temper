import Link from "next/link";
import { requireUser } from "@/lib/supabase/auth";
import { SpeakingHistoryList, type HistoryItem } from "@/components/speaking/speaking-history-list";

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
    <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-[720px] flex-1 px-5 py-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight">History</h1>
        <Link
          href="/speaking"
          className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Practice
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="rounded-[10px] border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No speaking sessions yet. Complete one on the Practice screen and it&apos;ll appear here.
        </p>
      ) : (
        <SpeakingHistoryList items={items} />
      )}
    </main>
  );
}
