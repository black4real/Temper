"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sanitizeHabitIds } from "@/lib/ghost-mode/habits";
import { TOTAL_DAYS } from "@/lib/ghost-mode/day";

export type SaveDayRecordResult =
  | { ok: true; completedHabitIds: string[] }
  | { ok: false; error: string };

/**
 * Upserts the completion state for one day of the current user's cycle.
 * The client supplies the day number, its calendar date, and the full set of completed habit
 * ids; the server authenticates, validates/clamps every field, and writes under RLS.
 */
export async function saveDayRecord(input: {
  dayNumber: number;
  date: string; // YYYY-MM-DD
  completedHabitIds: string[];
}): Promise<SaveDayRecordResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const dayNumber = Math.trunc(input.dayNumber);
  if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > TOTAL_DAYS) {
    return { ok: false, error: "Invalid day." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return { ok: false, error: "Invalid date." };
  }

  const completedHabitIds = sanitizeHabitIds(input.completedHabitIds);

  const { error } = await supabase.from("day_records").upsert(
    {
      user_id: user.id,
      day_number: dayNumber,
      date: input.date,
      completed_habit_ids: completedHabitIds,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,day_number" },
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/analysis");
  return { ok: true, completedHabitIds };
}
