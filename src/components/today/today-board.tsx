"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { type Habit } from "@/lib/ghost-mode/habits";
import { computeDayNumber, dateForDay, formatLongDate, TOTAL_DAYS } from "@/lib/ghost-mode/day";
import { saveDayRecord } from "@/lib/ghost-mode/actions";
import { TEMPER_NAMES, temperIndex } from "@/lib/ghost-mode/temper";
import { useIsClient } from "@/lib/use-is-client";
import { useHeat } from "@/motion/heat";
import { TemperBar } from "@/components/temper/temper-bar";

type TodayBoardProps = {
  startDate: string;
  initialRecords: Record<number, string[]>;
  habits: Habit[];
  layout?: "blocks" | "minimal";
};

export function TodayBoard(props: TodayBoardProps) {
  const isClient = useIsClient();

  if (!isClient) {
    // The day comes from the device clock, so the real board renders on the client only.
    return (
      <div className="flex flex-col gap-10" aria-busy>
        <div className="flex flex-col gap-5">
          <div className="h-3 w-40 rounded-[2px] bg-muted" />
          <div className="h-[clamp(72px,14vw,176px)] w-[min(55%,380px)] rounded-[2px] bg-muted/80" />
          <div className="steel h-14 w-full rounded-[2px] opacity-70 sm:h-16" />
        </div>
      </div>
    );
  }

  return <TodayBoardClient {...props} />;
}

function TodayBoardClient({ startDate, initialRecords, habits, layout = "blocks" }: TodayBoardProps) {
  const [dayNumber] = useState(() => computeDayNumber(startDate));
  const [completed, setCompleted] = useState<Set<string>>(
    () => new Set(initialRecords[computeDayNumber(startDate)] ?? []),
  );
  const [sweepKey, setSweepKey] = useState(0);
  const [, startSaving] = useTransition();
  const hostRef = useRef<HTMLDivElement>(null);

  const dateISO = useMemo(() => dateForDay(startDate, dayNumber), [startDate, dayNumber]);
  const total = habits.length;
  // Count only completions that belong to a current commitment (ignore stale/removed ones).
  const count = useMemo(
    () => habits.reduce((n, h) => (completed.has(h.slug) ? n + 1 : n), 0),
    [habits, completed],
  );
  const ratio = total > 0 ? count / total : 0;
  const allDone = total > 0 && count >= total;
  const band = temperIndex(ratio);

  // One driver: today's completion heats everything that carries the concept.
  useHeat(hostRef, ratio);

  function persist(next: Set<string>, previous: Set<string>) {
    startSaving(async () => {
      const res = await saveDayRecord({
        dayNumber,
        date: dateISO,
        completedHabitIds: Array.from(next),
      });
      if (!res.ok) {
        setCompleted(previous); // revert
        toast.error(res.error || "Could not save. Try again.");
      }
    });
  }

  function toggle(habit: Habit) {
    if (habit.kind !== "checkbox") return;
    const previous = new Set(completed);
    const next = new Set(completed);
    if (next.has(habit.slug)) next.delete(habit.slug);
    else next.add(habit.slug);
    setCompleted(next); // optimistic
    const nextCount = habits.reduce((n, h) => (next.has(h.slug) ? n + 1 : n), 0);
    if (total > 0 && nextCount >= total && count < total) setSweepKey((k) => k + 1); // the day sets
    persist(next, previous);
  }

  const outOfRange = dayNumber > TOTAL_DAYS;

  return (
    <div ref={hostRef} className="flex flex-col gap-12">
      {/* Hero: the stamped day numeral and today's bar */}
      <section aria-labelledby="today-heading" className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">{formatLongDate(dateISO)}</p>
        <h1 id="today-heading" className="flex items-end gap-3">
          <span
            aria-hidden
            className="numeral text-[clamp(88px,17vw,200px)] transition-colors duration-700"
            style={{ color: allDone ? "var(--heat)" : undefined }}
          >
            {String(dayNumber).padStart(3, "0")}
          </span>
          <span aria-hidden className="font-data pb-[0.6em] text-sm text-muted-foreground sm:text-base">
            / {TOTAL_DAYS}
          </span>
          <span className="sr-only">
            Day {dayNumber} of {TOTAL_DAYS}
          </span>
        </h1>

        <TemperBar
          ratio={ratio}
          ticks={total}
          sweepKey={sweepKey}
          label="Today's heat"
          valueText={`${count} of ${total} commitments done, ${TEMPER_NAMES[band]}`}
        />

        <div className="flex items-baseline justify-between gap-4">
          <p className="font-data text-sm">
            {count} of {total}
          </p>
          <p
            aria-live="polite"
            className={cn("text-sm transition-colors", allDone ? "font-medium text-foreground" : "text-muted-foreground")}
          >
            {allDone ? `Day ${dayNumber} is set. ${TEMPER_NAMES[band]}.` : TEMPER_NAMES[band]}
          </p>
        </div>
        {outOfRange && (
          <p className="text-sm text-muted-foreground">
            Your 120 days are complete. Set a new start date in Settings to begin another cycle.
          </p>
        )}
      </section>

      {/* Commitments on a rule system */}
      <section aria-labelledby="commitments-heading" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="commitments-heading" className="text-base font-semibold">
            Commitments
          </h2>
          <Link
            href="/settings#commitments"
            className="text-sm text-muted-foreground underline decoration-1 underline-offset-4 transition-colors hover:text-foreground hover:decoration-2"
          >
            Edit
          </Link>
        </div>

        {total === 0 ? (
          <p className="border-t border-border py-6 text-sm text-muted-foreground">
            No commitments yet. Add your first one in Settings.
          </p>
        ) : (
          <ul
            className={cn(
              "border-t border-border",
              layout === "blocks" && "sm:grid sm:grid-cols-2 sm:gap-x-10",
            )}
          >
            {habits.map((habit) => (
              <li key={habit.slug}>
                <CommitmentRow
                  habit={habit}
                  done={completed.has(habit.slug)}
                  onToggle={() => toggle(habit)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function CommitmentRow({
  habit,
  done,
  onToggle,
}: {
  habit: Habit;
  done: boolean;
  onToggle: () => void;
}) {
  const inner = (
    <>
      {/* The edge heats on hover/focus; once done it carries today's heat. */}
      <span
        aria-hidden
        className={cn(
          "absolute top-3 bottom-3 left-0 w-[3px] transition-[width,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          "group-hover:w-[6px] group-focus-visible:w-[6px]",
          done ? "" : "bg-border group-hover:bg-ember group-focus-visible:bg-ember",
        )}
        style={done ? { backgroundColor: "var(--heat)" } : undefined}
      />
      <Check done={done} link={habit.kind === "link"} />
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            "truncate text-[17px] font-medium transition-colors",
            done && "text-muted-foreground line-through decoration-1",
          )}
        >
          {habit.title}
        </span>
        {habit.detail && <span className="truncate text-[13px] text-muted-foreground">{habit.detail}</span>}
      </span>
    </>
  );

  const base =
    "group relative flex w-full cursor-pointer touch-manipulation select-none items-center gap-4 border-b border-border py-4 pr-2 pl-5 text-left outline-none transition-colors duration-150 hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:bg-muted/70";

  if (habit.kind === "link" && habit.href) {
    return (
      <Link href={habit.href} className={base} aria-label={`${habit.title}, ${done ? "done" : "not done"}, open practice`}>
        {inner}
        <span className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground transition-colors group-hover:text-foreground">
          Practice
          <svg viewBox="0 0 24 24" className="size-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </Link>
    );
  }

  return (
    <button type="button" onClick={onToggle} aria-pressed={done} className={base}>
      {inner}
    </button>
  );
}

/** A stamped square. Setting it presses the check in with a short settle. */
function Check({ done, link }: { done: boolean; link?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-[2px] border transition-[background-color,border-color,scale] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        done ? "scale-100 border-foreground bg-foreground" : "border-muted-foreground/50 bg-transparent group-active:scale-90",
        link && !done && "border-dashed",
      )}
    >
      {done && (
        <svg
          viewBox="0 0 24 24"
          className="size-4 text-background"
          style={{ animation: "heat-in 260ms cubic-bezier(0.22,1,0.36,1) both" }}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.25"
          strokeLinecap="square"
          strokeLinejoin="miter"
        >
          <path d="M4.5 12.5l5 5 10-11" />
        </svg>
      )}
    </span>
  );
}
