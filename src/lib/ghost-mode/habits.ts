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
  /** Weekdays this commitment applies to: 0 = Sunday … 6 = Saturday. */
  scheduleDays: number[];
  /** Counted commitment: done when the day's count reaches this. Null for a plain check. */
  target: number | null;
  /** Unit for a counted commitment, e.g. "L" or "pages". */
  unit: string | null;
  /** Icon name from HABIT_ICONS, or null. */
  icon: string | null;
};

export const SPEAKING_ID = "speaking";

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

/** Curated icon names offered in the editor (rendered with lucide in HabitIcon). */
export const HABIT_ICONS = [
  "clapperboard", "code", "droplet", "moon", "pen-line", "book-open", "mic", "message-circle",
  "dumbbell", "footprints", "bike", "apple", "salad", "brain", "music", "camera",
  "languages", "sun", "bed", "heart-pulse", "wallet", "sprout", "leaf", "timer",
] as const;

const base = { href: null, isSystem: false, scheduleDays: ALL_DAYS, target: null, unit: null } as const;

/** The default commitments seeded for a new account (and the fallback before migration). */
export const DEFAULT_HABITS: Habit[] = [
  { ...base, slug: "video_5shot", position: 0, title: "5-shot video", detail: "Cinematography practice", kind: "checkbox", icon: "clapperboard" },
  { ...base, slug: "python_ai", position: 1, title: "Python / AI", detail: "1 learning block", kind: "checkbox", icon: "code" },
  { ...base, slug: "water", position: 2, title: "Water", detail: "3 to 4 L", kind: "checkbox", icon: "droplet" },
  { ...base, slug: "sleep", position: 3, title: "Sleep", detail: "8 hours", kind: "checkbox", icon: "moon" },
  { ...base, slug: "writing", position: 4, title: "Writing", detail: "1 page", kind: "checkbox", icon: "pen-line" },
  { ...base, slug: "reading", position: 5, title: "Reading", detail: "10 pages", kind: "checkbox", icon: "book-open" },
  { ...base, slug: SPEAKING_ID, position: 6, title: "Speaking", detail: "5 minutes", kind: "link", href: "/speaking", isSystem: true, icon: "mic" },
  { ...base, slug: "storytelling", position: 7, title: "Storytelling", detail: "5 minutes", kind: "checkbox", icon: "message-circle" },
];

export const UNIT_MAX = 12;
export const TARGET_MAX = 999;
export const NOTE_MAX = 280;

/** Is this commitment scheduled on the given weekday (0 = Sunday)? */
export function isScheduled(habit: Habit, weekday: number): boolean {
  return habit.scheduleDays.length === 0 || habit.scheduleDays.includes(weekday);
}

const DAY_LETTERS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
/** "Every day", "Weekdays", "Weekends", or "Mon, Wed, Fri". */
export function describeSchedule(days: number[]): string {
  const set = new Set(days);
  if (set.size === 0 || set.size === 7) return "Every day";
  if (set.size === 5 && [1, 2, 3, 4, 5].every((d) => set.has(d))) return "Weekdays";
  if (set.size === 2 && set.has(0) && set.has(6)) return "Weekends";
  return [1, 2, 3, 4, 5, 6, 0].filter((d) => set.has(d)).map((d) => DAY_LETTERS[d]).join(", ");
}

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
