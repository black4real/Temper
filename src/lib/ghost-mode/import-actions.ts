"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizeHabitIds } from "@/lib/ghost-mode/habits";
import { getHabitSlugs } from "@/lib/ghost-mode/habits-data";
import { TOTAL_DAYS } from "@/lib/ghost-mode/day";

export type ImportPayload = {
  setStartDate: string | null; // YYYY-MM-DD or null to keep current
  records: { dayNumber: number; date: string; completedHabitIds: string[] }[];
  sessions: {
    dayNumber: number;
    date: string; // ISO datetime
    dayDate: string; // YYYY-MM-DD
    stage: number;
    topic: string;
    curveballs: string[];
    targetDurationSeconds: number;
    actualDurationSeconds: number;
    completedTarget: boolean;
    transcript: string;
    legacyId: string;
    recordingPath: string | null;
    /** Client-only: original audio file name, used to match provided files. Server ignores it. */
    recordingFileName?: string | null;
  }[];
};

export type ImportResult =
  | { ok: true; importedRecords: number; importedSessions: number; skippedSessions: number }
  | { ok: false; error: string };

export async function importGhostModeData(payload: ImportPayload): Promise<ImportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // 1) Optional start date.
  if (payload.setStartDate && /^\d{4}-\d{2}-\d{2}$/.test(payload.setStartDate)) {
    await supabase
      .from("profiles")
      .upsert({ id: user.id, start_date: payload.setStartDate, updated_at: new Date().toISOString() }, { onConflict: "id" });
  }

  // 2) Day records — validated, deduped by (user, day_number) via upsert.
  // Completed ids are kept only when they match a commitment this user actually has.
  const allowedSlugs = await getHabitSlugs(user.id);
  const recordRows = payload.records
    .filter((r) => Number.isFinite(r.dayNumber) && r.dayNumber >= 1 && r.dayNumber <= TOTAL_DAYS)
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.date))
    .map((r) => ({
      user_id: user.id,
      day_number: Math.trunc(r.dayNumber),
      date: r.date,
      completed_habit_ids: sanitizeHabitIds(r.completedHabitIds, allowedSlugs),
      updated_at: new Date().toISOString(),
    }));

  let importedRecords = 0;
  if (recordRows.length > 0) {
    const { error } = await supabase.from("day_records").upsert(recordRows, { onConflict: "user_id,day_number" });
    if (error) return { ok: false, error: `Records: ${error.message}` };
    importedRecords = recordRows.length;
  }

  // 3) Speaking sessions — skip any whose legacy_id already exists for this user.
  const { data: existing } = await supabase
    .from("speaking_sessions")
    .select("legacy_id")
    .eq("user_id", user.id);
  const existingIds = new Set<string>((existing ?? []).map((e) => e.legacy_id as string).filter(Boolean));

  const candidateSessions = payload.sessions.filter(
    (s) => Number.isFinite(s.dayNumber) && s.dayNumber >= 1 && s.dayNumber <= TOTAL_DAYS && s.stage >= 1 && s.stage <= 4,
  );
  const toInsert = candidateSessions.filter((s) => s.legacyId && !existingIds.has(s.legacyId));
  const skippedSessions = candidateSessions.length - toInsert.length;

  let importedSessions = 0;
  if (toInsert.length > 0) {
    const sessionRows = toInsert.map((s) => {
      let recordingPath: string | null = s.recordingPath ?? null;
      if (recordingPath && !recordingPath.startsWith(`${user.id}/`)) recordingPath = null;
      return {
        user_id: user.id,
        day_number: Math.trunc(s.dayNumber),
        date: s.date,
        stage: Math.trunc(s.stage),
        topic: (s.topic ?? "").slice(0, 200),
        curveballs: (s.curveballs ?? []).slice(0, 5).map((c) => c.slice(0, 80)),
        target_duration_seconds: Math.max(0, Math.trunc(s.targetDurationSeconds || 0)),
        actual_duration_seconds: Math.max(0, Math.trunc(s.actualDurationSeconds || 0)),
        completed_target: !!s.completedTarget,
        transcript: (s.transcript ?? "").slice(0, 20000),
        recording_path: recordingPath,
        legacy_id: s.legacyId,
      };
    });
    const { error } = await supabase.from("speaking_sessions").insert(sessionRows);
    if (error) return { ok: false, error: `Sessions: ${error.message}` };
    importedSessions = sessionRows.length;
  }

  revalidatePath("/");
  revalidatePath("/analysis");
  revalidatePath("/speaking");
  revalidatePath("/settings");
  return { ok: true, importedRecords, importedSessions, skippedSessions };
}
