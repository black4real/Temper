"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_HABITS,
  MAX_HABITS,
  TITLE_MAX,
  DETAIL_MAX,
  slugify,
} from "@/lib/ghost-mode/habits";

export type ActionResult = { ok: true } | { ok: false; error: string };

async function auth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/analysis");
  revalidatePath("/settings");
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

export async function createHabit(input: { title: string; detail: string }): Promise<ActionResult> {
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

  const { error } = await supabase.from("habits").insert({
    user_id: user.id,
    slug,
    position: nextPosition,
    title,
    detail,
    kind: "checkbox",
    href: null,
    is_system: false,
  });

  if (error) return { ok: false, error: friendly(error.message) };
  revalidateAll();
  return { ok: true };
}

export async function updateHabit(input: {
  slug: string;
  title: string;
  detail: string;
}): Promise<ActionResult> {
  const { supabase, user } = await auth();
  if (!user) return { ok: false, error: "Not signed in." };

  const title = cleanTitle(input.title);
  const detail = cleanDetail(input.detail);
  if (!title) return { ok: false, error: "Give the commitment a name." };

  // Title/detail are editable for any habit (including the system one); slug/kind/href are not.
  const { error } = await supabase
    .from("habits")
    .update({ title, detail, updated_at: new Date().toISOString() })
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
  if (/relation .*habits.* does not exist/i.test(message) || /schema cache/i.test(message)) {
    return "The commitments table isn't set up yet — run the latest database migration (see DEPLOY.md).";
  }
  return message;
}
