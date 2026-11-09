"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { HABITS, TOTAL_HABITS, type Habit } from "@/lib/ghost-mode/habits";
import { computeDayNumber, dateForDay, formatLongDate } from "@/lib/ghost-mode/day";
import { saveDayRecord } from "@/lib/ghost-mode/actions";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsClient } from "@/lib/use-is-client";

type TodayBoardProps = {
  startDate: string;
  initialRecords: Record<number, string[]>;
  layout?: "blocks" | "minimal";
};

export function TodayBoard(props: TodayBoardProps) {
  const isClient = useIsClient();

  if (!isClient) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        <Skeleton className="h-9 w-40" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: TOTAL_HABITS }).map((_, i) => (
            <Skeleton key={i} className="h-[60px] w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Rendered only on the client, so the device clock drives the day and there is no mismatch.
  return <TodayBoardClient {...props} />;
}

function TodayBoardClient({ startDate, initialRecords, layout = "blocks" }: TodayBoardProps) {
  const [dayNumber] = useState(() => computeDayNumber(startDate));
  const [completed, setCompleted] = useState<Set<string>>(
    () => new Set(initialRecords[computeDayNumber(startDate)] ?? []),
  );
  const [, startSaving] = useTransition();

  const dateISO = useMemo(() => dateForDay(startDate, dayNumber), [startDate, dayNumber]);
  const count = completed.size;
  const allDone = count >= TOTAL_HABITS;

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
    if (next.has(habit.id)) next.delete(habit.id);
    else next.add(habit.id);
    setCompleted(next); // optimistic
    persist(next, previous);
  }

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span aria-hidden className="size-2 rounded-full bg-ember" />
          <p className="tnum text-sm font-medium text-muted-foreground">
            Day {dayNumber} / 120
          </p>
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Today</h1>
        <p className="text-sm text-muted-foreground">{formatLongDate(dateISO)}</p>
      </header>

      <section aria-label="Today's commitments" className="flex flex-col gap-2">
        <h2 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Today&apos;s commitments
        </h2>
        <ul className={cn(layout === "blocks" ? "grid grid-cols-1 gap-2 sm:grid-cols-2" : "flex flex-col gap-2")}>
          {HABITS.map((habit) => (
            <li key={habit.id}>
              <CommitmentRow
                habit={habit}
                done={completed.has(habit.id)}
                onToggle={() => toggle(habit)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Completion" className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between">
          <p className={cn("tnum text-sm font-medium", allDone ? "text-foreground" : "text-muted-foreground")}>
            {count} / {TOTAL_HABITS} completed
          </p>
          {allDone && (
            <p className="text-sm font-medium text-foreground">Day {dayNumber} sealed</p>
          )}
        </div>
        <div className="h-[3px] w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ width: `${(count / TOTAL_HABITS) * 100}%` }}
            role="progressbar"
            aria-valuenow={count}
            aria-valuemin={0}
            aria-valuemax={TOTAL_HABITS}
            aria-label="Commitments completed"
          />
        </div>
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
      <Check done={done} />
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            "truncate text-[15px] font-medium transition-colors",
            done ? "text-foreground line-through decoration-muted-foreground/50" : "text-foreground",
          )}
        >
          {habit.title}
        </span>
        <span className="truncate text-[13px] text-muted-foreground">{habit.detail}</span>
      </span>
    </>
  );

  const base =
    "flex w-full items-center gap-3.5 rounded-[10px] border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0";
  const state = done
    ? "border-border bg-accent/40"
    : "border-border bg-card hover:bg-accent/40";

  if (habit.kind === "link" && habit.href) {
    return (
      <Link href={habit.href} className={cn(base, state)} aria-label={`${habit.title} — open practice`}>
        {inner}
        <span aria-hidden className="ml-auto text-muted-foreground">
          <ChevronRight />
        </span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      className={cn(base, state)}
    >
      {inner}
    </button>
  );
}

function Check({ done }: { done: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]",
        done ? "scale-100 border-foreground bg-foreground" : "border-muted-foreground/40 bg-transparent",
      )}
    >
      {done && (
        <svg viewBox="0 0 24 24" className="size-3 text-background" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
    </span>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
