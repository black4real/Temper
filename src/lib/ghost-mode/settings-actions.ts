"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { TOTAL_DAYS } from "@/lib/ghost-mode/day";

type SimpleResult = { ok: true } | { ok: false; error: string };

type ProfilePatch = Partial<{
  start_date: string;
  theme: "system" | "light" | "dark";
  habit_layout: "blocks" | "minimal";
  save_recordings: boolean;
}>;

export async function updateProfile(patch: ProfilePatch): Promise<SimpleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const clean: ProfilePatch = {};
  if (patch.start_date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(patch.start_date)) return { ok: false, error: "Invalid date." };
    clean.start_date = patch.start_date;
  }
  if (patch.theme !== undefined) {
    if (!["system", "light", "dark"].includes(patch.theme)) return { ok: false, error: "Invalid theme." };
    clean.theme = patch.theme;
  }
  if (patch.habit_layout !== undefined) {
    if (!["blocks", "minimal"].includes(patch.habit_layout)) return { ok: false, error: "Invalid layout." };
    clean.habit_layout = patch.habit_layout;
  }
  if (patch.save_recordings !== undefined) {
    clean.save_recordings = !!patch.save_recordings;
  }

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...clean, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/analysis");
  revalidatePath("/settings");
  return { ok: true };
}

/** Clears completion for one day. */
export async function resetToday(dayNumber: number): Promise<SimpleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (dayNumber < 1 || dayNumber > TOTAL_DAYS) return { ok: false, error: "Invalid day." };

  const { error } = await supabase
    .from("day_records")
    .update({ completed_habit_ids: [], updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("day_number", dayNumber);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/analysis");
  return { ok: true };
}

/**
 * Erases all of the user's records and speaking sessions (including stored recordings) and
 * resets the start date to today. Irreversible — the UI confirms before calling this.
 */
export async function resetAll(newStartDate: string): Promise<SimpleResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(newStartDate)) return { ok: false, error: "Invalid date." };

  // Remove stored recordings for this user.
  const { data: files } = await supabase.storage.from("recordings").list(user.id);
  if (files && files.length > 0) {
    await supabase.storage.from("recordings").remove(files.map((f) => `${user.id}/${f.name}`));
  }

  await supabase.from("speaking_sessions").delete().eq("user_id", user.id);
  await supabase.from("day_records").delete().eq("user_id", user.id);
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, start_date: newStartDate, updated_at: new Date().toISOString() }, { onConflict: "id" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/");
  revalidatePath("/analysis");
  revalidatePath("/speaking");
  revalidatePath("/settings");
  return { ok: true };
}
