"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsClient } from "@/lib/use-is-client";
import { useHeat } from "@/motion/heat";
import { TemperBar } from "@/components/temper/temper-bar";
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
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-10" aria-busy>
        <div className="h-64 rounded-[2px] bg-muted/60 lg:col-span-5" />
        <div className="h-80 rounded-[2px] bg-muted/40 lg:col-span-7" />
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
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
      {/* The brief: stage, topic, curveballs */}
      <div className="flex flex-col gap-10 lg:col-span-5">
        <section aria-labelledby="stage-heading" className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="stage-heading" className="text-base font-semibold">
              {stageTitle(stage)}
            </h2>
            <p className="font-data text-xs text-muted-foreground">target {formatDuration(target)}</p>
          </div>
          <p className="text-sm text-muted-foreground">{stagePurpose(stage)}</p>
          <div role="group" aria-label="Practice stage" className="grid grid-cols-4 border border-input">
            {[1, 2, 3, 4].map((s) => (
              <button
                key={s}
                type="button"
                disabled={locked}
                onClick={() => changeStage(s)}
                aria-pressed={stage === s}
                aria-label={`Stage ${s}`}
                className={cn(
                  "font-data relative h-11 text-sm outline-none transition-colors not-first:border-l not-first:border-input disabled:opacity-45",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                  stage === s ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="font-data text-xs text-muted-foreground">
            {successesAtStage} of 5 at this stage · {totalSuccessful} total
            {stage !== currentStage && ` · earned stage ${currentStage}`}
          </p>
        </section>

        <section aria-labelledby="topic-heading" className="flex flex-col gap-4 border-t border-border pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-2">
              <h2 id="topic-heading" className="text-sm text-muted-foreground">
                Topic
              </h2>
              <p className="font-display text-[clamp(26px,3.6vw,36px)] leading-[1.02] font-bold tracking-[-0.03em]">
                {topic}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onShuffle} disabled={locked} className="shrink-0">
              Shuffle
            </Button>
          </div>
          {curveballs.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">Curveball{curveballs.length > 1 ? "s" : ""}</p>
              <ul className="flex flex-col">
                {curveballs.map((c) => (
                  <li key={c} className="border-l-2 border-ember py-1 pl-3 text-[15px] font-medium">
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {!recorder.transcriptionSupported && (
          <p className="border-l-2 border-border pl-3 text-sm text-muted-foreground">
            Live transcription isn&apos;t available in this browser (it works best in Chrome or Edge).
            You can still record, then type your transcript when you finish.
          </p>
        )}
      </div>

      {/* The recorder */}
      <div className="lg:col-span-7">
        <Recorder
          recorder={recorder}
          target={target}
          metTarget={metTarget}
          saveRecordings={saveRecordings}
          saving={saving}
          onSave={onSave}
        />
      </div>
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
  const hostRef = useRef<HTMLElement>(null);
  const live = status === "recording" || status === "stopped";
  const ratio = live ? Math.min(1, elapsed / Math.max(1, target)) : 0;
  // Speaking heats its own bar toward the target, on the same driver as Today.
  useHeat(hostRef, ratio);

  return (
    <section
      ref={hostRef}
      aria-labelledby="recorder-heading"
      className="flex flex-col gap-6 border border-border bg-card/40 p-5 sm:p-8"
    >
      <h2 id="recorder-heading" className="sr-only">
        Recorder
      </h2>
      {error && <p className="border-l-2 border-destructive pl-3 text-sm text-destructive">{error}</p>}

      <div className="flex items-end justify-between gap-4">
        <p className="numeral text-[clamp(64px,10vw,112px)]" style={{ color: metTarget ? "var(--heat)" : undefined }}>
          <span className="sr-only">Elapsed </span>
          {formatDuration(elapsed)}
        </p>
        <p className="font-data pb-2 text-sm text-muted-foreground">/ {formatDuration(target)}</p>
      </div>

      <TemperBar
        ratio={ratio}
        sweepKey={metTarget ? 1 : 0}
        label="Speaking time"
        valueText={`${formatDuration(elapsed)} of ${formatDuration(target)}`}
      />

      {status === "idle" && (
        <div className="flex flex-col gap-3">
          <Button size="lg" onClick={() => void recorder.start()} disabled={!recorder.recordingSupported}>
            <Mic aria-hidden />
            Start speaking
          </Button>
          {!recorder.recordingSupported && (
            <p className="text-sm text-muted-foreground">This browser can&apos;t record audio.</p>
          )}
        </div>
      )}

      {status === "requesting" && (
        <Button size="lg" disabled>
          Waiting for the microphone
        </Button>
      )}

      {status === "recording" && (
        <div className="flex flex-col gap-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <span aria-hidden className="size-2 animate-pulse bg-ember" />
            Recording
          </p>
          <div className="min-h-32 border-l-2 border-border py-1 pl-4 text-[15px] leading-relaxed">
            {transcript || interim ? (
              <p>
                {transcript} <span className="text-muted-foreground">{interim}</span>
              </p>
            ) : (
              <p className="text-muted-foreground">
                {recorder.transcriptionSupported
                  ? "Listening. Your words appear here as you speak."
                  : "Recording. You can type the transcript when you stop."}
              </p>
            )}
          </div>
          <Button size="lg" variant="outline" onClick={recorder.stop}>
            Stop
          </Button>
        </div>
      )}

      {status === "stopped" && (
        <div className="flex flex-col gap-5">
          <p className="font-data text-sm">
            {metTarget ? "Target met" : "Below target"}
            <span className="text-muted-foreground">
              {" "}
              · spoke {formatDuration(elapsed)} of {formatDuration(target)}
            </span>
          </p>

          <div className="flex flex-col gap-2">
            <label htmlFor="transcript" className="text-sm font-medium">
              Transcript
            </label>
            <textarea
              id="transcript"
              value={transcript}
              onChange={(e) => recorder.setTranscript(e.target.value)}
              rows={6}
              placeholder="Type or correct what you said"
              className="w-full resize-y rounded-[2px] border border-input bg-background p-3 text-[15px] leading-relaxed outline-none focus-visible:border-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </div>

          {recorder.audioUrl && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                Recording preview
                {!saveRecordings && (
                  <span className="font-normal text-muted-foreground"> (not kept: saving recordings is off)</span>
                )}
              </p>
              <audio controls src={recorder.audioUrl} className="w-full" />
            </div>
          )}

          <div className="flex gap-2">
            <Button size="lg" onClick={onSave} disabled={saving} className="flex-1">
              {saving ? "Saving" : "Save session"}
            </Button>
            <Button size="lg" variant="outline" onClick={recorder.reset} disabled={saving}>
              Discard
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
