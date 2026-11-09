"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { NOTE_MAX, sanitizeHabitIds } from "@/lib/ghost-mode/habits";
import { getHabits } from "@/lib/ghost-mode/habits-data";
import { computeDayNumber, TOTAL_DAYS } from "@/lib/ghost-mode/day";

export type SaveDayRecordResult =
  | { ok: true; completedHabitIds: string[] }
  | { ok: false; error: string };

const NEEDS_0003 =
  "Counts and notes need the latest database update. Run migration 0003 in Supabase (see DEPLOY.md).";

/**
 * Upserts one day of the current user's cycle: today from the Today screen, or a past day
 * from the Record screen. The client sends the day number, its calendar date, the full set of
 * completed ids, and optionally counts and a note. The server authenticates, rejects future
 * days, validates every field against the user's own commitments, and writes under RLS.
 * Only the fields that were sent are written, so a note edit never clears checkmarks.
 */
export async function saveDayRecord(input: {
  dayNumber: number;
  date: string; // YYYY-MM-DD
  /** Omit to leave the day's checkmarks untouched (e.g. a note-only save). */
  completedHabitIds?: string[];
  counts?: Record<string, number>;
  note?: string;
}): Promise<SaveDayRecordResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub as string | undefined;
  if (!userId) return { ok: false, error: "Not signed in." };

  const dayNumber = Math.trunc(input.dayNumber);
  if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > TOTAL_DAYS) {
    return { ok: false, error: "Invalid day." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { ok: false, error: "Invalid date." };
  }

  const [{ data: profile }, { habits }] = await Promise.all([
    supabase.from("profiles").select("start_date").eq("id", userId).maybeSingle(),
    getHabits(userId),
  ]);

  // No logging ahead. One day of slack covers the device and server being in different zones.
  if (profile?.start_date) {
    const serverDay = computeDayNumber(profile.start_date as string);
    if (dayNumber > serverDay + 1) return { ok: false, error: "That day hasn't happened yet." };
  }

  const slugs = habits.map((h) => h.slug);
  const completedHabitIds =
    input.completedHabitIds !== undefined ? sanitizeHabitIds(input.completedHabitIds, slugs) : undefined;

  const row: Record<string, unknown> = {
    user_id: userId,
    day_number: dayNumber,
    date: input.date,
    updated_at: new Date().toISOString(),
  };
  if (completedHabitIds !== undefined) row.completed_habit_ids = completedHabitIds;

  if (input.counts !== undefined) {
    const counted = new Set(habits.filter((h) => h.target !== null).map((h) => h.slug));
    const counts: Record<string, number> = {};
    for (const [slug, value] of Object.entries(input.counts)) {
      const n = Math.trunc(Number(value));
      if (counted.has(slug) && Number.isFinite(n) && n > 0) counts[slug] = Math.min(n, 9999);
    }
    row.counts = counts;
  }
  if (input.note !== undefined) {
    const note = String(input.note).replace(/\s+/g, " ").trim().slice(0, NOTE_MAX);
    row.note = note || null;
  }

  const { error } = await supabase.from("day_records").upsert(row, { onConflict: "user_id,day_number" });

  if (error) {
    if (/column .*(counts|note)|schema cache/i.test(error.message)) return { ok: false, error: NEEDS_0003 };
    return { ok: false, error: error.message };
  }

  // We deliberately do NOT revalidate "/": the Today board holds this state optimistically,
  // and re-rendering the page on every tap only adds latency. The record views are other
  // routes, so busting their cache keeps them fresh on the next visit.
  revalidatePath("/analysis");
  revalidatePath("/analysis/week");
  return { ok: true, completedHabitIds: completedHabitIds ?? [] };
}
