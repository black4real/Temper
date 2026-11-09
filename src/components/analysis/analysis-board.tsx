"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/use-is-client";
import { HABITS, TOTAL_HABITS, sanitizeHabitIds } from "@/lib/ghost-mode/habits";
import { computeDayNumber, dateForDay, formatLongDate, TOTAL_DAYS } from "@/lib/ghost-mode/day";
import { Skeleton } from "@/components/ui/skeleton";

type Props = {
  startDate: string;
  records: Record<number, string[]>;
  speakingStage: number;
  speakingSuccessesAtStage: number;
  speakingTotalSuccessful: number;
};

type CellState = "future" | "completed" | "current" | "partial";

export function AnalysisBoard(props: Props) {
  const isClient = useIsClient();
  if (!isClient) {
    return (
      <div className="flex flex-col gap-6" aria-busy>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
    );
  }
  return <AnalysisBoardClient {...props} />;
}

function countFor(records: Record<number, string[]>, day: number): number {
  return sanitizeHabitIds(records[day] ?? []).length;
}

function AnalysisBoardClient({
  startDate,
  records,
  speakingStage,
  speakingSuccessesAtStage,
  speakingTotalSuccessful,
}: Props) {
  const currentDay = useMemo(() => computeDayNumber(startDate), [startDate]);
  const elapsed = Math.min(currentDay, TOTAL_DAYS);
  const [hovered, setHovered] = useState<number | null>(null);

  const metrics = useMemo(() => {
    let completedDays = 0;
    let totalCompleted = 0;
    for (let d = 1; d <= elapsed; d++) {
      const c = countFor(records, d);
      totalCompleted += c;
      if (c >= TOTAL_HABITS) completedDays += 1;
    }
    const possible = Math.max(1, elapsed) * TOTAL_HABITS;
    const adherence = Math.round((totalCompleted / possible) * 100);
    return { completedDays, totalCompleted, possible, adherence };
  }, [records, elapsed]);

  const habitBreakdown = useMemo(() => {
    const base = Math.max(1, elapsed);
    return HABITS.map((habit) => {
      let done = 0;
      for (let d = 1; d <= elapsed; d++) {
        if (sanitizeHabitIds(records[d] ?? []).includes(habit.id)) done += 1;
      }
      return { habit, done, base, pct: Math.round((done / base) * 100) };
    });
  }, [records, elapsed]);

  function stateFor(day: number): { state: CellState; count: number } {
    if (day > currentDay) return { state: "future", count: 0 };
    const count = countFor(records, day);
    if (count >= TOTAL_HABITS) return { state: "completed", count };
    if (day === currentDay) return { state: "current", count };
    return { state: "partial", count };
  }

  const hoveredLabel = hovered
    ? `Day ${hovered} · ${formatLongDate(dateForDay(startDate, hovered))} · ${labelFor(stateFor(hovered))}`
    : null;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Analysis</h1>
        <p className="text-sm text-muted-foreground">120-day system execution & reflection</p>
      </header>

      {/* Metrics */}
      <section aria-label="System overview" className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-border bg-border sm:grid-cols-4">
        <Metric label="Current day" value={`${currentDay}`} sub="of 120" />
        <Metric label="Adherence" value={`${metrics.adherence}%`} sub={`${metrics.totalCompleted} / ${metrics.possible}`} />
        <Metric label="Completed days" value={`${metrics.completedDays} / ${elapsed}`} sub="all 9 done" />
        <Metric
          label="Speaking"
          value={`Stage ${speakingStage}`}
          sub={`${speakingSuccessesAtStage}/5 · ${speakingTotalSuccessful} total`}
        />
      </section>

      {/* Habit consistency */}
      <section aria-label="Habit consistency" className="flex flex-col gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Habit consistency
        </h2>
        <ul className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {habitBreakdown.map(({ habit, done, base, pct }) => (
            <li key={habit.id} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">{habit.title}</span>
                <span className="tnum shrink-0 text-xs text-muted-foreground">
                  {done}/{base} ({pct}%)
                </span>
              </div>
              <div className="h-[2px] w-full overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-foreground/75" style={{ width: `${pct}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 120-day ledger */}
      <section aria-label="120-day history" className="flex flex-col gap-3">
        <div className="flex min-h-5 items-baseline justify-between gap-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            120-day ledger
          </h2>
          <p className="tnum truncate text-xs text-muted-foreground" aria-live="polite">
            {hoveredLabel ?? "Hover a day for detail"}
          </p>
        </div>

        <div
          className="grid grid-cols-[repeat(12,1fr)] gap-1.5"
          onMouseLeave={() => setHovered(null)}
        >
          {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((day) => {
            const { state, count } = stateFor(day);
            return (
              <div
                key={day}
                onMouseEnter={() => setHovered(day)}
                title={`Day ${day} · ${labelFor({ state, count })}`}
                aria-hidden
                style={state === "completed" ? ({ "--i": (day - 1) % 12 } as React.CSSProperties) : undefined}
                className={cn(
                  "aspect-square rounded-[3px] transition-colors",
                  state === "completed" && "gm-breath bg-foreground",
                  state === "current" && "border-[1.5px] border-ember bg-ember/15",
                  state === "partial" && (count > 0 ? "bg-foreground/25" : "bg-foreground/[0.08]"),
                  state === "future" && "bg-foreground/[0.05]",
                  hovered === day && "ring-2 ring-ember ring-offset-0",
                )}
              />
            );
          })}
        </div>

        {/* Legend */}
        <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <LegendSwatch className="bg-foreground" label="Completed (9/9)" />
          <LegendSwatch className="bg-foreground/25" label="Partial" />
          <LegendSwatch className="border-[1.5px] border-ember bg-ember/15" label="Today" />
          <LegendSwatch className="bg-foreground/[0.05]" label="Upcoming" />
        </ul>
      </section>
    </div>
  );
}

function labelFor({ state, count }: { state: CellState; count: number }): string {
  switch (state) {
    case "completed": return "Completed (9/9)";
    case "current": return `Today (${count}/9)`;
    case "partial": return count > 0 ? `Partial (${count}/9)` : "Missed";
    case "future": return "Upcoming";
  }
}

function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-card p-3.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="tnum mt-0.5 font-display text-xl font-semibold tracking-tight">{value}</p>
      <p className="tnum mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}

function LegendSwatch({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span aria-hidden className={cn("size-2.5 rounded-[2px]", className)} />
      {label}
    </li>
  );
}
