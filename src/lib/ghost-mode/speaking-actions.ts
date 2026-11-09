"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TOTAL_DAYS } from "@/lib/ghost-mode/day";
import { SPEAKING_ID } from "@/lib/ghost-mode/habits";

export type SaveSpeakingResult = { ok: true; id: string } | { ok: false; error: string };
export type SimpleResult = { ok: true } | { ok: false; error: string };

export async function saveSpeakingSession(input: {
  dayNumber: number;
  dayDate: string; // YYYY-MM-DD, for the day_record
  date: string; // ISO datetime of the session
  stage: number;
  topic: string;
  curveballs: string[];
  targetDurationSeconds: number;
  actualDurationSeconds: number;
  completedTarget: boolean;
  transcript: string;
  recordingPath: string | null;
}): Promise<SaveSpeakingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const dayNumber = Math.trunc(input.dayNumber);
  if (dayNumber < 1 || dayNumber > TOTAL_DAYS) return { ok: false, error: "Invalid day." };
  const stage = Math.trunc(input.stage);
  if (stage < 1 || stage > 4) return { ok: false, error: "Invalid stage." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dayDate)) return { ok: false, error: "Invalid date." };

  // A recording path, if given, must live under this user's own folder.
  let recordingPath: string | null = input.recordingPath ?? null;
  if (recordingPath && !recordingPath.startsWith(`${user.id}/`)) {
    recordingPath = null;
  }

  const legacyId = `${dayNumber}_${Date.now()}`;

  const { data, error } = await supabase
    .from("speaking_sessions")
    .insert({
      user_id: user.id,
      day_number: dayNumber,
      date: input.date,
      stage,
      topic: input.topic.slice(0, 200),
      curveballs: input.curveballs.slice(0, 5).map((c) => c.slice(0, 80)),
      target_duration_seconds: Math.max(0, Math.trunc(input.targetDurationSeconds)),
      actual_duration_seconds: Math.max(0, Math.trunc(input.actualDurationSeconds)),
      completed_target: !!input.completedTarget,
      transcript: input.transcript.slice(0, 20000),
      recording_path: recordingPath,
      legacy_id: legacyId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  // Mark the speaking habit complete for that day when the target was met.
  if (input.completedTarget) {
    const { data: rec } = await supabase
      .from("day_records")
      .select("completed_habit_ids")
      .eq("user_id", user.id)
      .eq("day_number", dayNumber)
      .maybeSingle();
    const ids = new Set<string>((rec?.completed_habit_ids as string[] | null) ?? []);
    if (!ids.has(SPEAKING_ID)) {
      ids.add(SPEAKING_ID);
      await supabase.from("day_records").upsert(
        {
          user_id: user.id,
          day_number: dayNumber,
          date: input.dayDate,
          completed_habit_ids: Array.from(ids),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,day_number" },
      );
    }
  }

  revalidatePath("/speaking");
  revalidatePath("/");
  revalidatePath("/analysis");
  return { ok: true, id: data.id as string };
}

export async function deleteSpeakingSession(id: string): Promise<SimpleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: row, error: fetchErr } = await supabase
    .from("speaking_sessions")
    .select("id, day_number, recording_path")
    .eq("id", id)
    .maybeSingle();
  if (fetchErr) return { ok: false, error: fetchErr.message };
  if (!row) return { ok: false, error: "Session not found." };

  const dayNumber = row.day_number as number;
  const recordingPath = row.recording_path as string | null;

  if (recordingPath) {
    await supabase.storage.from("recordings").remove([recordingPath]);
  }

  const { error: delErr } = await supabase.from("speaking_sessions").delete().eq("id", id);
  if (delErr) return { ok: false, error: delErr.message };

  // If no completed sessions remain for that day, unmark the speaking habit.
  const { count } = await supabase
    .from("speaking_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("day_number", dayNumber)
    .eq("completed_target", true);

  if ((count ?? 0) === 0) {
    const { data: rec } = await supabase
      .from("day_records")
      .select("completed_habit_ids")
      .eq("user_id", user.id)
      .eq("day_number", dayNumber)
      .maybeSingle();
    if (rec) {
      const ids = new Set<string>((rec.completed_habit_ids as string[] | null) ?? []);
      if (ids.has(SPEAKING_ID)) {
        ids.delete(SPEAKING_ID);
        await supabase
          .from("day_records")
          .update({ completed_habit_ids: Array.from(ids), updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("day_number", dayNumber);
      }
    }
  }

  revalidatePath("/speaking");
  revalidatePath("/");
  revalidatePath("/analysis");
  return { ok: true };
}
