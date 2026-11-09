// The nine daily commitments. Ids/titles mirror the original macOS app so imported data maps
// cleanly. LeetCode is kept as a plain checkbox only (no problem logging). Notifications and
// recall rules are intentionally excluded from the web app.

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
  { id: "leetcode", number: 2, title: "LeetCode", detail: "1 question", kind: "checkbox" },
  { id: "python_ai", number: 3, title: "Python / AI", detail: "1 learning block", kind: "checkbox" },
  { id: "water", number: 4, title: "Water", detail: "3–4 L", kind: "checkbox" },
  { id: "sleep", number: 5, title: "Sleep", detail: "8 hours", kind: "checkbox" },
  { id: "writing", number: 6, title: "Writing", detail: "1 page", kind: "checkbox" },
  { id: "reading", number: 7, title: "Reading", detail: "10 pages", kind: "checkbox" },
  { id: "speaking", number: 8, title: "Speaking", detail: "5 minutes", kind: "link", href: "/speaking" },
  { id: "storytelling", number: 9, title: "Storytelling", detail: "5 minutes", kind: "checkbox" },
];

export const TOTAL_HABITS = HABITS.length; // 9
export const SPEAKING_ID = "speaking";

const HABIT_IDS = new Set(HABITS.map((h) => h.id));
export function isValidHabitId(id: string): boolean {
  return HABIT_IDS.has(id);
}

/** Keep only recognised habit ids, de-duplicated — used to sanitise any client input. */
export function sanitizeHabitIds(ids: string[]): string[] {
  return Array.from(new Set(ids.filter((id) => HABIT_IDS.has(id))));
}
