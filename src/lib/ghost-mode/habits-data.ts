import "server-only";
import { createClient } from "@/lib/supabase/server";
import { ALL_DAYS, DEFAULT_HABITS, HABIT_ICONS, type Habit, type HabitKind } from "./habits";

export type HabitsResult = {
  habits: Habit[];
  /** false when the habits table isn't migrated yet — the UI shows a notice and read-only defaults. */
  editable: boolean;
  /** true once migration 0003 (schedules, counts, icons, notes) has been applied. */
  v3: boolean;
};

const ICONS = new Set<string>(HABIT_ICONS);

function toSchedule(value: unknown): number[] {
  if (!Array.isArray(value)) return ALL_DAYS;
  const days = Array.from(new Set(value.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)));
  return days.length ? days.sort((a, b) => a - b) : ALL_DAYS;
}

/**
 * Loads the current user's active commitments in order. Selects "*" so it works before and
 * after migration 0003, filling defaults for columns that don't exist yet. Degrades
 * gracefully: if the `habits` table doesn't exist (migration 0002 not run) or has no rows, we
 * fall back to the default set so the app keeps working.
 */
export async function getHabits(userId: string): Promise<HabitsResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("habits")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("position", { ascending: true });

  if (error || !data || data.length === 0) {
    return { habits: DEFAULT_HABITS, editable: false, v3: false };
  }

  const v3 = "schedule_days" in data[0];
  const habits: Habit[] = data.map((r) => {
    const kind = r.kind as HabitKind;
    const target = typeof r.target === "number" && kind === "checkbox" ? r.target : null;
    return {
      slug: r.slug as string,
      position: r.position as number,
      title: r.title as string,
      detail: (r.detail as string | null) ?? "",
      kind,
      href: (r.href as string | null) ?? null,
      isSystem: !!r.is_system,
      scheduleDays: toSchedule(r.schedule_days),
      target,
      unit: target !== null ? ((r.unit as string | null) ?? null) : null,
      icon: typeof r.icon === "string" && ICONS.has(r.icon) ? r.icon : null,
    };
  });

  return { habits, editable: true, v3 };
}

/** Just the active slugs — used to sanitise writes against what the user actually has. */
export async function getHabitSlugs(userId: string): Promise<string[]> {
  const { habits } = await getHabits(userId);
  return habits.map((h) => h.slug);
}
