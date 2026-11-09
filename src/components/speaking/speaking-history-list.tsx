"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDuration, stageTitle } from "@/lib/ghost-mode/speaking";
import { deleteSpeakingSession } from "@/lib/ghost-mode/speaking-actions";

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
    <ul className="flex flex-col gap-3">
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

  const long = item.transcript.length > 180;
  const shown = expanded || !long ? item.transcript : `${item.transcript.slice(0, 180)}…`;

  return (
    <div className="rounded-[10px] border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="tnum text-xs text-muted-foreground">
            Day {item.dayNumber} · {formatDateTime(item.date)} · {stageTitle(item.stage)}
          </p>
          <p className="mt-0.5 font-display text-lg font-semibold tracking-tight">{item.topic}</p>
        </div>
        <Badge variant={item.completedTarget ? "default" : "secondary"} className="shrink-0">
          {item.completedTarget ? "Target met" : "Below target"}
        </Badge>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="tnum">
          {formatDuration(item.actualDurationSeconds)} / {formatDuration(item.targetDurationSeconds)}
        </span>
        {item.curveballs.map((c) => (
          <Badge key={c} variant="outline" className="font-normal">
            {c}
          </Badge>
        ))}
      </div>

      {item.transcript ? (
        <div className="mt-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{shown}</p>
          {long && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-1 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No transcript.</p>
      )}

      {item.audioUrl && (
        <div className="mt-3">
          <audio controls src={item.audioUrl} className="w-full" />
        </div>
      )}

      <div className="mt-3 flex justify-end">
        {confirm ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Delete this session?</span>
            <Button variant="destructive" size="sm" onClick={onDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
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
    </div>
  );
}
