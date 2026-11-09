"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsClient } from "@/lib/use-is-client";
import { createClient } from "@/lib/supabase/client";
import { computeDayNumber, dateForDay } from "@/lib/ghost-mode/day";
import {
  promptFor,
  randomCurveballs,
  randomTopic,
  stagePurpose,
  stageTitle,
  targetSeconds,
  formatDuration,
} from "@/lib/ghost-mode/speaking";
import { useSpeakingRecorder } from "@/lib/ghost-mode/use-speaking-recorder";
import { saveSpeakingSession } from "@/lib/ghost-mode/speaking-actions";

type Props = {
  userId: string;
  startDate: string;
  saveRecordings: boolean;
  currentStage: number;
  successesAtStage: number;
  totalSuccessful: number;
};

const EXT_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
};

export function SpeakingSession(props: Props) {
  const isClient = useIsClient();
  if (!isClient) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  return <SpeakingSessionClient {...props} />;
}

function SpeakingSessionClient({
  userId,
  startDate,
  saveRecordings,
  currentStage,
  successesAtStage,
  totalSuccessful,
}: Props) {
  const router = useRouter();
  const dayNumber = useMemo(() => computeDayNumber(startDate), [startDate]);
  const [stage, setStage] = useState(currentStage);
  const [shuffle, setShuffle] = useState<{ topic: string; curveballs: string[] } | null>(null);
  const [saving, startSaving] = useTransition();
  const recorder = useSpeakingRecorder();

  const base = useMemo(() => promptFor(stage, dayNumber), [stage, dayNumber]);
  const topic = shuffle?.topic ?? base.topic;
  const curveballs = shuffle?.curveballs ?? base.curveballs;
  const target = targetSeconds(stage);
  const metTarget = recorder.elapsed >= target;

  const isRecording = recorder.status === "recording" || recorder.status === "requesting";
  const isStopped = recorder.status === "stopped";
  const locked = isRecording || isStopped; // can't change stage/topic mid-session

  function changeStage(next: number) {
    if (locked) return;
    setStage(next);
    setShuffle(null);
  }

  function onShuffle() {
    if (locked) return;
    setShuffle({ topic: randomTopic(topic), curveballs: randomCurveballs(stage) });
  }

  function onSave() {
    const transcript = recorder.transcript.trim();
    startSaving(async () => {
      let recordingPath: string | null = null;

      if (saveRecordings && recorder.audioBlob && recorder.audioBlob.size > 0) {
        const ext = EXT_BY_MIME[recorder.audioMime.split(";")[0]] ?? "webm";
        const path = `${userId}/speaking_day${dayNumber}_${Date.now()}.${ext}`;
        const supabase = createClient();
        const { error } = await supabase.storage
          .from("recordings")
          .upload(path, recorder.audioBlob, {
            contentType: recorder.audioBlob.type || "audio/webm",
            upsert: false,
          });
        if (error) {
          toast.error("Couldn't upload the recording; saving the session without audio.");
        } else {
          recordingPath = path;
        }
      }

      const res = await saveSpeakingSession({
        dayNumber,
        dayDate: dateForDay(startDate, dayNumber),
        date: new Date().toISOString(),
        stage,
        topic,
        curveballs,
        targetDurationSeconds: target,
        actualDurationSeconds: recorder.elapsed,
        completedTarget: metTarget,
        transcript,
        recordingPath,
      });

      if (!res.ok) {
        toast.error(res.error || "Could not save the session.");
        return;
      }
      toast.success(
        metTarget ? "Session saved. Speaking marked complete for today." : "Session saved.",
      );
      recorder.reset();
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Stage summary */}
      <section className="rounded-[10px] border border-border bg-card p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">{stageTitle(stage)}</p>
            <p className="text-sm text-muted-foreground">{stagePurpose(stage)}</p>
          </div>
          <div className="text-right">
            <p className="tnum text-sm font-medium">{formatDuration(target)}</p>
            <p className="text-xs text-muted-foreground">target</p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="tnum">{successesAtStage} / 5 at this stage</span>
          <span aria-hidden>·</span>
          <span className="tnum">{totalSuccessful} total successful</span>
        </div>
      </section>

      {/* Stage selector */}
      <section className="flex flex-col gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Practice stage
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((s) => (
            <button
              key={s}
              type="button"
              disabled={locked}
              onClick={() => changeStage(s)}
              aria-pressed={stage === s}
              className={cn(
                "rounded-md border py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
                stage === s
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        {stage !== currentStage && (
          <p className="text-xs text-muted-foreground">
            Manual stage. Your earned stage is {currentStage}.
          </p>
        )}
      </section>

      {/* Prompt */}
      <section className="rounded-[10px] border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Topic
            </p>
            <p className="font-display text-2xl font-semibold tracking-tight">{topic}</p>
          </div>
          <Button variant="outline" size="sm" onClick={onShuffle} disabled={locked}>
            Shuffle
          </Button>
        </div>
        {curveballs.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Curveball{curveballs.length > 1 ? "s" : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {curveballs.map((c) => (
                <Badge key={c} variant="secondary" className="text-sm font-medium">
                  {c}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Transcription support banner */}
      {!recorder.transcriptionSupported && (
        <p className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          Live transcription isn&apos;t available in this browser (best in Chrome or Edge). You can
          still record and type your transcript after you finish.
        </p>
      )}

      {/* Recorder */}
      <Recorder
        recorder={recorder}
        target={target}
        metTarget={metTarget}
        saveRecordings={saveRecordings}
        saving={saving}
        onSave={onSave}
      />
    </div>
  );
}

function Recorder({
  recorder,
  target,
  metTarget,
  saveRecordings,
  saving,
  onSave,
}: {
  recorder: ReturnType<typeof useSpeakingRecorder>;
  target: number;
  metTarget: boolean;
  saveRecordings: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  const { status, elapsed, transcript, interim, error } = recorder;
  const pct = Math.min(100, (elapsed / target) * 100);

  return (
    <section className="flex flex-col gap-4 rounded-[10px] border border-border bg-card p-5">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {status === "idle" && (
        <div className="flex flex-col items-center gap-3 py-4">
          <Button
            size="lg"
            onClick={() => void recorder.start()}
            disabled={!recorder.recordingSupported}
            className="min-w-44"
          >
            Start speaking
          </Button>
          {!recorder.recordingSupported && (
            <p className="text-sm text-muted-foreground">Recording isn&apos;t supported here.</p>
          )}
        </div>
      )}

      {status === "requesting" && (
        <div className="flex justify-center py-4">
          <Button size="lg" disabled className="min-w-44">
            Requesting mic…
          </Button>
        </div>
      )}

      {status === "recording" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-ember" />
              <span className="text-sm font-medium">Recording</span>
            </div>
            <span className="tnum text-sm text-muted-foreground">
              {formatDuration(elapsed)} / {formatDuration(target)}
            </span>
          </div>
          <div className="h-[3px] w-full overflow-hidden rounded-full bg-border">
            <div
              className={cn("h-full rounded-full transition-[width] duration-500", metTarget ? "bg-foreground" : "bg-ember")}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="min-h-24 rounded-md border border-border bg-background p-3 text-sm leading-relaxed">
            {transcript || interim ? (
              <p>
                {transcript} <span className="text-muted-foreground">{interim}</span>
              </p>
            ) : (
              <p className="text-muted-foreground">
                {recorder.transcriptionSupported ? "Listening…" : "Recording… transcript can be added after."}
              </p>
            )}
          </div>
          <Button size="lg" variant="outline" onClick={recorder.stop}>
            Stop
          </Button>
        </div>
      )}

      {status === "stopped" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="tnum text-sm text-muted-foreground">
              Spoke {formatDuration(elapsed)} / {formatDuration(target)}
            </span>
            <Badge variant={metTarget ? "default" : "secondary"}>
              {metTarget ? "Target met" : "Below target"}
            </Badge>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="transcript" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Transcript
            </label>
            <textarea
              id="transcript"
              value={transcript}
              onChange={(e) => recorder.setTranscript(e.target.value)}
              rows={5}
              placeholder="Your transcript…"
              className="w-full resize-y rounded-md border border-input bg-background p-3 text-sm leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {recorder.audioUrl && (
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Recording preview {saveRecordings ? "" : "(not saved — retention is off)"}
              </p>
              <audio controls src={recorder.audioUrl} className="w-full" />
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={onSave} disabled={saving} className="flex-1">
              {saving ? "Saving…" : "Save session"}
            </Button>
            <Button variant="outline" onClick={recorder.reset} disabled={saving}>
              Discard
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
