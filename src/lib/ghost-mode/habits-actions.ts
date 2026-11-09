"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_HABITS,
  HABIT_ICONS,
  MAX_HABITS,
  TARGET_MAX,
  TITLE_MAX,
  DETAIL_MAX,
  UNIT_MAX,
  slugify,
} from "@/lib/ghost-mode/habits";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function auth() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub as string | undefined;
  return { supabase, user: sub ? { id: sub } : null };
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/analysis");
  revalidatePath("/analysis/week");
  revalidatePath("/settings");
}

/** Optional 0003 fields: schedule, counted target + unit, icon. */
export type HabitExtras = {
  scheduleDays?: number[];
  target?: number | null;
  unit?: string | null;
  icon?: string | null;
};

const ICONS = new Set<string>(HABIT_ICONS);

/** Validates the 0003 fields; only keys that were sent are returned (so they're only written then). */
function cleanExtras(input: HabitExtras, isLink: boolean): Record<string, unknown> | { error: string } {
  const out: Record<string, unknown> = {};
  if (input.scheduleDays !== undefined) {
    const days = Array.from(new Set(input.scheduleDays.map(Number))).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
    if (days.length === 0) return { error: "Pick at least one day for this commitment." };
    out.schedule_days = days.sort((a, b) => a - b);
  }
  if (input.target !== undefined) {
    if (input.target === null || isLink) {
      out.target = null;
      out.unit = null;
    } else {
      const t = Math.trunc(Number(input.target));
      if (!Number.isFinite(t) || t < 1 || t > TARGET_MAX) return { error: `Targets go from 1 to ${TARGET_MAX}.` };
      out.target = t;
      const unit = typeof input.unit === "string" ? input.unit.trim().slice(0, UNIT_MAX) : "";
      out.unit = unit || null;
    }
  }
  if (input.icon !== undefined) {
    out.icon = input.icon && ICONS.has(input.icon) ? input.icon : null;
  }
  return out;
}

function cleanTitle(v: unknown): string {
  return typeof v === "string" ? v.trim().slice(0, TITLE_MAX) : "";
}
function cleanDetail(v: unknown): string {
  return typeof v === "string" ? v.trim().slice(0, DETAIL_MAX) : "";
}

/** Seeds the default commitments for a user that has none (idempotent via unique(user_id,slug)). */
export async function seedDefaultHabits(): Promise<ActionResult> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not signed in." };

  const rows = DEFAULT_HABITS.map((h) => ({
    user_id: user.id,
    slug: h.slug,
    position: h.position,
    title: h.title,
    detail: h.detail,
    kind: h.kind,
    href: h.href ?? null,
    is_system: h.isSystem,
  }));

  const { error } = await supabase
    .from("habits")
    .upsert(rows, { onConflict: "user_id,slug", ignoreDuplicates: true });

  if (error) return { ok: false, error: friendly(error.message) };
  revalidateAll();
  return { ok: true };
}

export async function createHabit(input: { title: string; detail: string } & HabitExtras): Promise<ActionResult> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not signed in." };

  const title = cleanTitle(input.title);
  const detail = cleanDetail(input.detail);
  if (!title) return { ok: false, error: "Give the commitment a name." };

  const { data: existing, error: readErr } = await supabase
    .from("habits")
    .select("slug, position")
    .eq("user_id", user.id);
  if (readErr) return { ok: false, error: friendly(readErr.message) };

  const rows = existing ?? [];
  if (rows.length >= MAX_HABITS) {
    return { ok: false, error: `You can have at most ${MAX_HABITS} commitments.` };
  }

  // Ensure a unique slug per user.
  const taken = new Set(rows.map((r) => r.slug as string));
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let n = 2;
  while (taken.has(slug)) slug = `${baseSlug}_${n++}`;

  const nextPosition = rows.reduce((max, r) => Math.max(max, (r.position as number) ?? 0), -1) + 1;

  const extras = cleanExtras(input, false);
  if ("error" in extras) return { ok: false, error: extras.error as string };

  const { error } = await supabase.from("habits").insert({
    user_id: user.id,
    slug,
    position: nextPosition,
    title,
    detail,
    kind: "checkbox",
    href: null,
    is_system: false,
    ...extras,
  });

  if (error) return { ok: false, error: friendly(error.message) };
  revalidateAll();
  return { ok: true };
}

export async function updateHabit(
  input: {
    slug: string;
    title: string;
    detail: string;
  } & HabitExtras,
): Promise<ActionResult> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not signed in." };

  const title = cleanTitle(input.title);
  const detail = cleanDetail(input.detail);
  if (!title) return { ok: false, error: "Give the commitment a name." };

  // Title, detail, schedule and icon are editable for any habit (including the system one);
  // slug, kind and href are not, and a link habit (speaking) can't be counted.
  const extras = cleanExtras(input, input.slug === "speaking");
  if ("error" in extras) return { ok: false, error: extras.error as string };

  const { error } = await supabase
    .from("habits")
    .update({ title, detail, ...extras, updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("slug", input.slug);

  if (error) return { ok: false, error: friendly(error.message) };
  revalidateAll();
  return { ok: true };
}

export async function deleteHabit(input: { slug: string }): Promise<ActionResult> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not signed in." };

  // Never delete a protected/system habit (speaking).
  const { data: target, error: readErr } = await supabase
    .from("habits")
    .select("is_system")
    .eq("user_id", user.id)
    .eq("slug", input.slug)
    .maybeSingle();
  if (readErr) return { ok: false, error: friendly(readErr.message) };
  if (!target) return { ok: false, error: "That commitment no longer exists." };
  if (target.is_system) return { ok: false, error: "This commitment can't be removed." };

  const { error } = await supabase
    .from("habits")
    .delete()
    .eq("user_id", user.id)
    .eq("slug", input.slug);

  if (error) return { ok: false, error: friendly(error.message) };
  // Historical day_records keep the old slug harmlessly; it simply stops counting.
  revalidateAll();
  return { ok: true };
}

/** Moves a habit one slot up or down by swapping positions with its neighbour. */
export async function moveHabit(input: {
  slug: string;
  direction: "up" | "down";
}): Promise<ActionResult> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data, error: readErr } = await supabase
    .from("habits")
    .select("slug, position")
    .eq("user_id", user.id)
    .order("position", { ascending: true });
  if (readErr) return { ok: false, error: friendly(readErr.message) };

  const list = data ?? [];
  const idx = list.findIndex((r) => r.slug === input.slug);
  if (idx === -1) return { ok: false, error: "That commitment no longer exists." };
  const swapIdx = input.direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= list.length) return { ok: true }; // already at the edge

  const a = list[idx];
  const b = list[swapIdx];

  // Swap positions via two updates (positions are plain ints; no unique constraint on them).
  const now = new Date().toISOString();
  const [u1, u2] = await Promise.all([
    supabase.from("habits").update({ position: b.position, updated_at: now }).eq("user_id", user.id).eq("slug", a.slug),
    supabase.from("habits").update({ position: a.position, updated_at: now }).eq("user_id", user.id).eq("slug", b.slug),
  ]);
  if (u1.error || u2.error) return { ok: false, error: friendly((u1.error ?? u2.error)!.message) };

  revalidateAll();
  return { ok: true };
}

function friendly(message: string): string {
  if (/relation .*habits.* does not exist/i.test(message)) {
    return "The commitments table isn't set up yet. Run migration 0002 in Supabase (see DEPLOY.md).";
  }
  if (/column .*(schedule_days|target|unit|icon)|schema cache/i.test(message)) {
    return "Schedules, counts and icons need the latest database update. Run migration 0003 in Supabase (see DEPLOY.md).";
  }
  return message;
}
