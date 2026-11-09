"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { parseGhostModeExport, type ParseResult } from "@/lib/ghost-mode/import-parse";
import { importGhostModeData, type ImportResult } from "@/lib/ghost-mode/import-actions";

export function ImportFlow({
  userId,
  saveRecordings,
}: {
  userId: string;
  saveRecordings: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [setStart, setSetStart] = useState(true);
  const [audioFiles, setAudioFiles] = useState<Map<string, File>>(new Map());
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importing, startImport] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    setResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setParsed(parseGhostModeExport(json));
    } catch {
      setParsed({ ok: false, error: "Couldn't read this file as JSON." });
    }
  }

  function onAudio(e: React.ChangeEvent<HTMLInputElement>) {
    const map = new Map<string, File>();
    for (const f of Array.from(e.target.files ?? [])) map.set(f.name, f);
    setAudioFiles(map);
  }

  function onImport() {
    if (!parsed || !parsed.ok) return;
    const { payload, summary } = parsed;

    startImport(async () => {
      const sessions = payload.sessions.map((s) => ({ ...s }));

      // Upload any matched audio files (only when retention is on).
      if (saveRecordings && audioFiles.size > 0) {
        const supabase = createClient();
        for (const s of sessions) {
          const name = s.recordingFileName;
          if (!name) continue;
          const file = audioFiles.get(name);
          if (!file) continue;
          const path = `${userId}/${name}`;
          const { error } = await supabase.storage
            .from("recordings")
            .upload(path, file, { contentType: file.type || "audio/m4a", upsert: true });
          if (!error) s.recordingPath = path;
        }
      }

      const res = await importGhostModeData({
        setStartDate: setStart ? summary.startDate : null,
        records: payload.records,
        sessions,
      });
      setResult(res);
      if (res.ok) {
        toast.success("Import complete.");
      } else {
        toast.error(res.error || "Import failed.");
      }
    });
  }

  const matchedAudio =
    parsed && parsed.ok
      ? parsed.summary.recordingFileNames.filter((n) => audioFiles.has(n)).length
      : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Step 1: choose file */}
      <section className="flex flex-col gap-3 rounded-[10px] border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold">1 · Choose your export</h2>
          <p className="text-xs text-muted-foreground">
            The <code>data.json</code> exported from the macOS app. Nothing is imported until you
            review the summary and confirm.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          aria-label="Choose Ghost Mode export file"
          onChange={onFile}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent"
        />
      </section>

      {parsed && !parsed.ok && (
        <p className="rounded-md border border-destructive/30 bg-destructive/[0.04] p-3 text-sm text-destructive">
          {parsed.error}
        </p>
      )}

      {/* Step 2: preview */}
      {parsed && parsed.ok && !result && (
        <>
          <section className="flex flex-col gap-4 rounded-[10px] border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">2 · Review</h2>

            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Day records" value={parsed.summary.recordCount} />
              <Stat label="With progress" value={parsed.summary.recordsWithProgress} />
              <Stat label="Speaking sessions" value={parsed.summary.sessionCount} />
              <Stat label="With transcript" value={parsed.summary.sessionsWithTranscript} />
            </dl>

            {parsed.summary.startDate && (
              <label className="flex items-center gap-2.5 rounded-md border border-border bg-background p-3 text-sm">
                <input
                  type="checkbox"
                  checked={setStart}
                  onChange={(e) => setSetStart(e.target.checked)}
                  className="size-4 accent-[var(--ember)]"
                />
                Set my start date to the imported date ({parsed.summary.startDate}) to keep day
                alignment.
              </label>
            )}

            {/* Excluded */}
            <div className="flex flex-col gap-1.5 rounded-md border border-border bg-background p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Not imported
              </p>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                <li>LeetCode problem log{parsed.summary.excluded.leetCodeEntries > 0 ? ` (${parsed.summary.excluded.leetCodeEntries} entries dropped)` : ""} — the LeetCode checkbox is still kept.</li>
                {parsed.summary.excluded.hadRecallRules && <li>Recall rules and schedule</li>}
                {parsed.summary.excluded.hadNotifications && <li>Notification settings</li>}
              </ul>
            </div>

            {/* Audio */}
            {parsed.summary.recordingFileNames.length > 0 && (
              <div className="flex flex-col gap-2 rounded-md border border-border bg-background p-3">
                <p className="text-sm font-medium">
                  Recordings referenced: {parsed.summary.recordingFileNames.length}
                </p>
                {saveRecordings ? (
                  <>
                    <p className="text-xs text-muted-foreground">
                      Select the matching <code>.m4a</code> files to import audio. Transcripts import
                      regardless.
                    </p>
                    <input
                      ref={audioRef}
                      type="file"
                      accept="audio/*,.m4a"
                      multiple
                      aria-label="Choose recording files"
                      onChange={onAudio}
                      className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-accent"
                    />
                    {audioFiles.size > 0 && (
                      <Badge variant="secondary" className="w-fit">
                        {matchedAudio} of {parsed.summary.recordingFileNames.length} matched
                      </Badge>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Audio import is off because &quot;Save recordings&quot; is disabled in Settings.
                    Turn it on first to import audio. Transcripts still import.
                  </p>
                )}
              </div>
            )}
          </section>

          <div className="flex gap-2">
            <Button onClick={onImport} disabled={importing} className="flex-1">
              {importing ? "Importing…" : "Import"}
            </Button>
            <Button
              variant="outline"
              disabled={importing}
              onClick={() => {
                setParsed(null);
                setAudioFiles(new Map());
                if (fileRef.current) fileRef.current.value = "";
              }}
            >
              Clear
            </Button>
          </div>
        </>
      )}

      {/* Step 3: result */}
      {result && result.ok && (
        <section className="flex flex-col gap-3 rounded-[10px] border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Import complete</h2>
          <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
            <li>{result.importedRecords} day records imported</li>
            <li>{result.importedSessions} speaking sessions imported</li>
            {result.skippedSessions > 0 && <li>{result.skippedSessions} duplicate sessions skipped</li>}
          </ul>
          <div className="flex gap-2">
            <Button nativeButton={false} render={<Link href="/" />}>
              Go to Today
            </Button>
            <Button variant="outline" nativeButton={false} render={<Link href="/analysis" />}>
              View Analysis
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dd className="tnum font-display text-xl font-semibold">{value}</dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}
