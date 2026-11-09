import { requireUser } from "@/lib/supabase/auth";
import { getHabits } from "@/lib/ghost-mode/habits-data";

// Exports everything a user owns as a download. Audio recordings are not included (they
// live in private storage); their storage paths are listed so nothing is silently lost.
// The proxy already gates /api/*, and requireUser re-checks; RLS scopes every query.

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: Request) {
  const { supabase, user } = await requireUser();
  const format = new URL(request.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const stamp = new Date().toISOString().slice(0, 10);

  const [profileRes, { habits }, recordsRes, sessionsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    getHabits(user.id),
    supabase.from("day_records").select("*").eq("user_id", user.id).order("day_number"),
    supabase.from("speaking_sessions").select("*").eq("user_id", user.id).order("date"),
  ]);

  const records = (recordsRes.data ?? []) as Record<string, unknown>[];

  if (format === "csv") {
    // One row per recorded day; one column per current commitment (1 = done).
    const header = ["day", "date", ...habits.map((h) => h.title), "note"];
    const rows = records.map((r) => {
      const done = new Set((r.completed_habit_ids as string[] | null) ?? []);
      return [
        r.day_number,
        r.date,
        ...habits.map((h) => (done.has(h.slug) ? 1 : 0)),
        (r.note as string | null) ?? "",
      ];
    });
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="temper-record-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const payload = {
    app: "Temper",
    exportedAt: new Date().toISOString(),
    note: "Audio recordings are not included; recording_path lists where each one is stored.",
    profile: profileRes.data ?? null,
    habits,
    dayRecords: records,
    speakingSessions: sessionsRes.data ?? [],
  };

  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="temper-export-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
