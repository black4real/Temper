// Daily commitments. Each user owns their own set (stored in the `habits` table);
// the list below is the default seeded for every new account. LeetCode, notifications,
// and recall rules are excluded. Speaking is a protected "system" habit — it drives the
// /speaking practice screen and its completion is managed by sessions, so it can be
// renamed but not removed, and its kind/href stay fixed.

export type HabitKind = "checkbox" | "link";

export type Habit = {
  /** Stable identifier stored in day_records.completed_habit_ids. Never changes once created. */
  slug: string;
  position: number;
  title: string;
  detail: string;
  kind: HabitKind;
  href?: string | null;
  /** Protected habit (speaking): editable title/detail, but cannot be deleted. */
  isSystem: boolean;
};

export const SPEAKING_ID = "speaking";

/** The default commitments seeded for a new account (and the fallback before migration). */
export const DEFAULT_HABITS: Habit[] = [
  { slug: "video_5shot", position: 0, title: "5-shot video", detail: "Cinematography practice", kind: "checkbox", href: null, isSystem: false },
  { slug: "python_ai", position: 1, title: "Python / AI", detail: "1 learning block", kind: "checkbox", href: null, isSystem: false },
  { slug: "water", position: 2, title: "Water", detail: "3–4 L", kind: "checkbox", href: null, isSystem: false },
  { slug: "sleep", position: 3, title: "Sleep", detail: "8 hours", kind: "checkbox", href: null, isSystem: false },
  { slug: "writing", position: 4, title: "Writing", detail: "1 page", kind: "checkbox", href: null, isSystem: false },
  { slug: "reading", position: 5, title: "Reading", detail: "10 pages", kind: "checkbox", href: null, isSystem: false },
  { slug: SPEAKING_ID, position: 6, title: "Speaking", detail: "5 minutes", kind: "link", href: "/speaking", isSystem: true },
  { slug: "storytelling", position: 7, title: "Storytelling", detail: "5 minutes", kind: "checkbox", href: null, isSystem: false },
];

/** Reasonable guard so a user can't create an unbounded number of commitments. */
export const MAX_HABITS = 24;

export const TITLE_MAX = 60;
export const DETAIL_MAX = 80;

/** Keep only ids present in `allowed`, de-duplicated — used to sanitise any stored/imported set. */
export function sanitizeHabitIds(ids: string[], allowed: Iterable<string>): string[] {
  const set = allowed instanceof Set ? allowed : new Set(allowed);
  return Array.from(new Set(ids.filter((id) => typeof id === "string" && set.has(id))));
}

/** Derive a stable, url/db-safe slug from a title. Caller ensures per-user uniqueness. */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
  return base || "habit";
}
