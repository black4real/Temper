// The eight daily commitments. LeetCode, notifications, and recall rules are excluded.

export type Habit = {
  id: string;
  number: number;
  title: string;
  detail: string;
  /** Speaking has its own practice screen; its completion is managed by sessions. */
  kind: "checkbox" | "link";
  href?: string;
};

export const HABITS: Habit[] = [
  { id: "video_5shot", number: 1, title: "5-shot video", detail: "Cinematography practice", kind: "checkbox" },
  { id: "python_ai", number: 2, title: "Python / AI", detail: "1 learning block", kind: "checkbox" },
  { id: "water", number: 3, title: "Water", detail: "3–4 L", kind: "checkbox" },
  { id: "sleep", number: 4, title: "Sleep", detail: "8 hours", kind: "checkbox" },
  { id: "writing", number: 5, title: "Writing", detail: "1 page", kind: "checkbox" },
  { id: "reading", number: 6, title: "Reading", detail: "10 pages", kind: "checkbox" },
  { id: "speaking", number: 7, title: "Speaking", detail: "5 minutes", kind: "link", href: "/speaking" },
  { id: "storytelling", number: 8, title: "Storytelling", detail: "5 minutes", kind: "checkbox" },
];

export const TOTAL_HABITS = HABITS.length; // 8
export const SPEAKING_ID = "speaking";

const HABIT_IDS = new Set(HABITS.map((h) => h.id));
export function isValidHabitId(id: string): boolean {
  return HABIT_IDS.has(id);
}

/** Keep only recognised habit ids, de-duplicated — used to sanitise any client input. */
export function sanitizeHabitIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => HABIT_IDS.has(id))));
}
