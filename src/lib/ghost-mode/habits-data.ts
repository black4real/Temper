import "server-only";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_HABITS, type Habit, type HabitKind } from "./habits";

export type HabitsResult = {
  habits: Habit[];
  /** false when the habits table isn't migrated yet — the UI shows a notice and read-only defaults. */
  editable: boolean;
};

/**
 * Loads the current user's active commitments in order. Degrades gracefully:
 * if the `habits` table doesn't exist yet (migration 0002 not run) or returns
 * nothing, we fall back to the default set so the app keeps working.
 */
export async function getHabits(userId: string): Promise<HabitsResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("habits")
    .select("slug, position, title, detail, kind, href, is_system")
    .eq("user_id", userId)
    .eq("archived", false)
    .order("position", { ascending: true });

  if (error || !data || data.length === 0) {
    // Table missing (pre-migration) or no rows yet — show defaults; the editor
    // offers a "Load default commitments" action that seeds real rows.
    return { habits: DEFAULT_HABITS, editable: false };
  }

  const habits: Habit[] = data.map((r) => ({
    slug: r.slug as string,
    position: r.position as number,
    title: r.title as string,
    detail: (r.detail as string | null) ?? "",
    kind: r.kind as HabitKind,
    href: (r.href as string | null) ?? null,
    isSystem: !!r.is_system,
  }));

  return { habits, editable: true };
}

/** Just the active slugs — used to sanitise writes against what the user actually has. */
export async function getHabitSlugs(userId: string): Promise<string[]> {
  const { habits } = await getHabits(userId);
  return habits.map((h) => h.slug);
}
