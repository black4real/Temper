// Parses the macOS Ghost Mode export (StorageData JSON) into an import payload, and summarises
// what will be imported vs. intentionally dropped (LeetCode, recall rules, notifications).
// Pure + client-safe. The server action re-validates everything before writing.

import type { ImportPayload } from "@/lib/ghost-mode/import-actions";
import { sanitizeHabitIds } from "@/lib/ghost-mode/habits";

export type ParseSummary = {
  startDate: string | null;
  recordCount: number;
  recordsWithProgress: number;
  sessionCount: number;
  sessionsWithTranscript: number;
  recordingFileNames: string[]; // referenced audio files (import only if provided + retention on)
  excluded: {
    leetCodeEntries: number;
    hadRecallRules: boolean;
    hadNotifications: boolean;
  };
};

export type ParseResult =
  | { ok: true; summary: ParseSummary; payload: ImportPayload }
  | { ok: false; error: string };

function toISODate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const t = Date.parse(value);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function legacyIdFor(dayNumber: number, dateISO: string): string {
  const t = Date.parse(dateISO);
  const secs = Number.isNaN(t) ? 0 : Math.floor(t / 1000);
  return `${dayNumber}_${secs}`;
}

export function parseGhostModeExport(raw: unknown): ParseResult {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "This file isn't a Ghost Mode export (expected a JSON object)." };
  }
  const data = raw as Record<string, unknown>;

  const hasRecords = Array.isArray(data.records);
  const hasSessions = Array.isArray(data.speakingSessions);
  if (!hasRecords && !hasSessions) {
    return { ok: false, error: "No records or speaking sessions found in this file." };
  }

  // --- Records (LeetCode completion marks and problem logs are not imported) ---
  const rawRecords = (hasRecords ? (data.records as unknown[]) : []) as Record<string, unknown>[];
  const records: ImportPayload["records"] = [];
  for (const r of rawRecords) {
    const dayNumber = Number(r.dayNumber);
    const date = toISODate(r.date);
    if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > 120 || !date) continue;
    const ids = Array.isArray(r.completedHabitIds)
      ? sanitizeHabitIds((r.completedHabitIds as unknown[]).map(String))
      : [];
    records.push({ dayNumber: Math.trunc(dayNumber), date, completedHabitIds: ids });
  }

  // --- Speaking sessions (transcripts preserved; recordingFileName tracked for optional audio) ---
  const rawSessions = (hasSessions ? (data.speakingSessions as unknown[]) : []) as Record<string, unknown>[];
  const sessions: ImportPayload["sessions"] = [];
  const recordingFileNames: string[] = [];
  for (const s of rawSessions) {
    const dayNumber = Number(s.dayNumber);
    const dateISO = typeof s.date === "string" ? s.date : null;
    const dayDate = toISODate(s.date);
    if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > 120 || !dateISO || !dayDate) continue;
    const stage = Math.min(4, Math.max(1, Number(s.stage) || 1));
    const fileName = typeof s.recordingFileName === "string" ? s.recordingFileName : null;
    if (fileName) recordingFileNames.push(fileName);
    sessions.push({
      dayNumber: Math.trunc(dayNumber),
      date: dateISO,
      dayDate,
      stage,
      topic: typeof s.topic === "string" ? s.topic : "",
      curveballs: Array.isArray(s.curveballs) ? (s.curveballs as unknown[]).map(String) : [],
      targetDurationSeconds: Number(s.targetDurationSeconds) || 0,
      actualDurationSeconds: Number(s.actualDurationSeconds) || 0,
      completedTarget: !!s.completedTarget,
      transcript: typeof s.transcript === "string" ? s.transcript : "",
      legacyId: legacyIdFor(Math.trunc(dayNumber), dateISO),
      recordingPath: null, // filled in after any audio upload
      recordingFileName: fileName,
    });
  }

  const summary: ParseSummary = {
    startDate: toISODate(data.startDate),
    recordCount: records.length,
    recordsWithProgress: records.filter((r) => r.completedHabitIds.length > 0).length,
    sessionCount: sessions.length,
    sessionsWithTranscript: sessions.filter((s) => s.transcript.trim().length > 0).length,
    recordingFileNames,
    excluded: {
      leetCodeEntries: Array.isArray(data.leetCodeEntries) ? (data.leetCodeEntries as unknown[]).length : 0,
      hadRecallRules:
        Array.isArray(data.activeRecallRuleIds) || Array.isArray(data.recallSchedule),
      hadNotifications:
        data.waterNotificationsEnabled !== undefined || data.moveNotificationsEnabled !== undefined,
    },
  };

  return {
    ok: true,
    summary,
    payload: { setStartDate: null, records, sessions },
  };
}
