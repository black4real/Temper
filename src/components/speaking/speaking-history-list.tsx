"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatDuration, stageTitle } from "@/lib/ghost-mode/speaking";
import { deleteSpeakingSession } from "@/lib/ghost-mode/speaking-actions";
import { speakingStats } from "@/lib/ghost-mode/speaking-stats";

export type HistoryItem = {
  id: string;
  dayNumber: number;
  date: string;
  stage: number;
  topic: string;
  curveballs: string[];
  targetDurationSeconds: number;
  actualDurationSeconds: number;
  completedTarget: boolean;
  transcript: string;
  audioUrl: string | null;
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function SpeakingHistoryList({ items }: { items: HistoryItem[] }) {
  return (
    <ul className="flex flex-col border-t border-border">
      {items.map((item) => (
        <li key={item.id}>
          <SessionCard item={item} />
        </li>
      ))}
    </ul>
  );
}

function SessionCard({ item }: { item: HistoryItem }) {
  const router = useRouter();
  const [deleting, startDelete] = useTransition();
  const [expanded, setExpanded] = useState(false);
  const [confirm, setConfirm] = useState(false);

  function onDelete() {
    startDelete(async () => {
      const res = await deleteSpeakingSession(item.id);
      if (!res.ok) {
        toast.error(res.error || "Could not delete the session.");
        return;
      }
      toast.success("Session deleted.");
      router.refresh();
    });
  }

  const stats = speakingStats(item.transcript, item.actualDurationSeconds);
  const long = item.transcript.length > 180;
  const shown = expanded || !long ? item.transcript : `${item.transcript.slice(0, 180)}…`;

  return (
    <article className="relative flex flex-col gap-3 border-b border-border py-6 pl-5">
      <span
        aria-hidden
        className="absolute top-6 bottom-6 left-0 w-[3px]"
        style={{ backgroundColor: item.completedTarget ? "var(--t6)" : "var(--t2)" }}
      />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-data text-xs text-muted-foreground">
            Day {item.dayNumber} · {formatDateTime(item.date)} · {stageTitle(item.stage)}
          </p>
          <h2 className="mt-1.5 font-display text-xl leading-tight font-bold tracking-[-0.02em]">{item.topic}</h2>
        </div>
        <p className="font-data shrink-0 pt-0.5 text-xs">
          {item.completedTarget ? "Target met" : "Below target"}
        </p>
      </div>

      <p className="font-data text-xs text-muted-foreground">
        {formatDuration(item.actualDurationSeconds)} of {formatDuration(item.targetDurationSeconds)}
        {item.curveballs.length > 0 && ` · ${item.curveballs.join(", ")}`}
      </p>

      {stats.words > 0 && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Pace</dt>
            <dd className="font-data">{stats.wpm !== null ? `${stats.wpm} wpm` : "too short"}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Fillers</dt>
            <dd className="font-data">{stats.fillers}</dd>
          </div>
          <div className="flex gap-1.5">
            <dt className="text-muted-foreground">Words</dt>
            <dd className="font-data">{stats.words}</dd>
          </div>
        </dl>
      )}

      {item.transcript ? (
        <div>
          <p className="max-w-[68ch] whitespace-pre-wrap text-[15px] leading-relaxed text-foreground/90">{shown}</p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-1.5 text-sm text-muted-foreground underline decoration-1 underline-offset-4 hover:text-foreground hover:decoration-2"
            >
              {expanded ? "Show less" : "Show the full transcript"}
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No transcript.</p>
      )}

      {item.audioUrl && <audio controls src={item.audioUrl} className="w-full max-w-[520px]" />}

      <div className="flex justify-end">
        {confirm ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Delete this session for good?</span>
            <Button variant="destructive" size="sm" onClick={onDelete} disabled={deleting}>
              {deleting ? "Deleting" : "Delete"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirm(false)} disabled={deleting}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirm(true)} className="text-muted-foreground">
            Delete
          </Button>
        )}
      </div>
    </article>
  );
}
