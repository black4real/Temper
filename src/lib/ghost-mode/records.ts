// One shape for a day's record on the client: which commitments are done, counts for counted
// commitments, and the day's note. Built from day_records rows selected with "*", so it works
// whether or not migration 0003 (counts, note) has been applied.

export type DayEntry = {
  ids: string[];
  counts: Record<string, number>;
  note: string;
};

export type DayMap = Record<number, DayEntry>;

export const EMPTY_DAY: DayEntry = { ids: [], counts: {}, note: "" };

function toCounts(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) out[k] = Math.trunc(n);
  }
  return out;
}

export function rowsToDayMap(rows: Record<string, unknown>[] | null | undefined): DayMap {
  const map: DayMap = {};
  for (const row of rows ?? []) {
    const day = Number(row.day_number);
    if (!Number.isFinite(day)) continue;
    map[day] = {
      ids: Array.isArray(row.completed_habit_ids) ? (row.completed_habit_ids as string[]) : [],
      counts: toCounts(row.counts),
      note: typeof row.note === "string" ? row.note : "",
    };
  }
  return map;
}

/** True when the rows came from a schema that has the 0003 columns. */
export function rowsHaveV3(rows: Record<string, unknown>[] | null | undefined): boolean | null {
  const first = rows?.[0];
  if (!first) return null; // unknown: no rows yet
  return "counts" in first && "note" in first;
}
