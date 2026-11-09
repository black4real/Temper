// Pure, schedule-aware statistics shared by Today, Record and the weekly review.
// A day's "total" is the number of commitments scheduled on that weekday, so a Mon/Wed/Fri
// habit doesn't count against a Tuesday. Days with nothing scheduled are rest days: they
// neither extend nor break a streak.

import { dateForDay, parseLocalDate } from "@/lib/ghost-mode/day";
import { isScheduled, type Habit } from "@/lib/ghost-mode/habits";
import { EMPTY_DAY, type DayMap, type DayEntry } from "@/lib/ghost-mode/records";

export function weekdayFor(startDate: string, day: number): number {
  return parseLocalDate(dateForDay(startDate, day)).getDay();
}

export function scheduledFor(habits: Habit[], startDate: string, day: number): Habit[] {
  const weekday = weekdayFor(startDate, day);
  return habits.filter((h) => isScheduled(h, weekday));
}

export type DayProgress = { done: number; total: number; ratio: number; rest: boolean };

export function dayProgress(entry: DayEntry | undefined, scheduled: Habit[]): DayProgress {
  const ids = new Set((entry ?? EMPTY_DAY).ids);
  const total = scheduled.length;
  const done = scheduled.reduce((n, h) => (ids.has(h.slug) ? n + 1 : n), 0);
  return { done, total, ratio: total > 0 ? done / total : 0, rest: total === 0 };
}

export function progressForDay(habits: Habit[], startDate: string, map: DayMap, day: number): DayProgress {
  return dayProgress(map[day], scheduledFor(habits, startDate, day));
}

/**
 * Current and best streak of complete days up to `currentDay`. Today only counts once it is
 * complete; an unfinished today doesn't break the current streak.
 */
export function streaks(
  habits: Habit[],
  startDate: string,
  map: DayMap,
  currentDay: number,
): { current: number; best: number } {
  const complete = (d: number): boolean | "rest" => {
    const p = progressForDay(habits, startDate, map, d);
    if (p.rest) return "rest";
    return p.done >= p.total;
  };

  let best = 0;
  let run = 0;
  for (let d = 1; d <= currentDay; d++) {
    const c = complete(d);
    if (c === "rest") continue;
    if (c) {
      run += 1;
      best = Math.max(best, run);
    } else if (d !== currentDay) {
      run = 0;
    }
  }

  let current = 0;
  for (let d = currentDay; d >= 1; d--) {
    const c = complete(d);
    if (c === "rest") continue;
    if (c) current += 1;
    else if (d === currentDay) continue; // today still in progress
    else break;
  }

  return { current, best };
}

/** Done state for a counted commitment, given the day's count. */
export function countMeetsTarget(habit: Habit, count: number | undefined): boolean {
  return habit.target !== null && (count ?? 0) >= habit.target;
}
