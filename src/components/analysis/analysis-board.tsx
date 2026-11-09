"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/use-is-client";
import { sanitizeHabitIds, type Habit } from "@/lib/ghost-mode/habits";
import { computeDayNumber, dateForDay, parseLocalDate, TOTAL_DAYS } from "@/lib/ghost-mode/day";
import { TEMPER_NAMES, temperColor, temperIndex } from "@/lib/ghost-mode/temper";
import { Blade, type BladeBand } from "@/components/temper/blade";

type Props = {
  startDate: string;
  records: Record<number, string[]>;
  habits: Habit[];
  speakingStage: number;
  speakingSuccessesAtStage: number;
  speakingTotalSuccessful: number;
};

export function AnalysisBoard(props: Props) {
  const isClient = useIsClient();
  if (!isClient) {
    return (
      <div className="flex flex-col gap-10" aria-busy>
        <div className="h-[clamp(44px,8vw,88px)] w-56 rounded-[2px] bg-muted" />
        <div className="steel h-[132px] w-full rounded-[2px] opacity-60" />
        <div className="h-24 w-full rounded-[2px] bg-muted/60" />
      </div>
    );
  }
  return <AnalysisBoardClient {...props} />;
}

const shortDate = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });

function AnalysisBoardClient({
  startDate,
  records,
  habits,
  speakingStage,
  speakingSuccessesAtStage,
  speakingTotalSuccessful,
}: Props) {
  const currentDay = useMemo(() => computeDayNumber(startDate), [startDate]);
  const elapsed = Math.min(currentDay, TOTAL_DAYS);
  const total = habits.length;
  const slugSet = useMemo(() => new Set(habits.map((h) => h.slug)), [habits]);
  const [focusSlug, setFocusSlug] = useState<string | null>(null);

  const doneOn = useMemo(() => {
    const map = new Map<number, string[]>();
    for (let d = 1; d <= elapsed; d++) map.set(d, sanitizeHabitIds(records[d] ?? [], slugSet));
    return map;
  }, [records, elapsed, slugSet]);

  const metrics = useMemo(() => {
    let completedDays = 0;
    let totalCompleted = 0;
    for (let d = 1; d <= elapsed; d++) {
      const c = doneOn.get(d)?.length ?? 0;
      totalCompleted += c;
      if (total > 0 && c >= total) completedDays += 1;
    }
    const possible = Math.max(1, elapsed) * Math.max(1, total);
    return { completedDays, adherence: Math.round((totalCompleted / possible) * 100) };
  }, [doneOn, elapsed, total]);

  const habitBreakdown = useMemo(() => {
    const base = Math.max(1, elapsed);
    return habits.map((habit) => {
      let done = 0;
      for (let d = 1; d <= elapsed; d++) if (doneOn.get(d)?.includes(habit.slug)) done += 1;
      return { habit, done, base, pct: Math.round((done / base) * 100) };
    });
  }, [doneOn, elapsed, habits]);

  const focusHabit = focusSlug ? habits.find((h) => h.slug === focusSlug) ?? null : null;

  const bands: BladeBand[] = useMemo(
    () =>
      Array.from({ length: TOTAL_DAYS }, (_, i) => {
        const day = i + 1;
        const when = shortDate.format(parseLocalDate(dateForDay(startDate, day)));
        if (day > currentDay) {
          return { day, index: 0, state: "future" as const, label: `Day ${day} · ${when} · not worked yet` };
        }
        const ids = doneOn.get(day) ?? [];
        const state = day === currentDay ? ("today" as const) : ("past" as const);
        if (focusHabit) {
          const hit = ids.includes(focusHabit.slug);
          return {
            day,
            index: hit ? 6 : 0,
            state,
            dim: !hit,
            label: `Day ${day} · ${when} · ${focusHabit.title} ${hit ? "done" : "missed"}`,
          };
        }
        const index = temperIndex(total > 0 ? ids.length / total : 0);
        return {
          day,
          index,
          state,
          label: `Day ${day} · ${when} · ${TEMPER_NAMES[index]}, ${ids.length} of ${total}${day === currentDay ? " · today" : ""}`,
        };
      }),
    [startDate, currentDay, doneOn, total, focusHabit],
  );

  return (
    <div className="flex flex-col gap-14">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-[clamp(44px,8vw,88px)] leading-[0.86] font-extrabold tracking-[-0.045em]">
            Record
          </h1>
          <p className="max-w-[52ch] text-[15px] text-muted-foreground">
            Every day you work leaves its color in the blade. Bare steel is a missed day; blue is a day
            where everything got done.
          </p>
        </div>
      </header>

      {/* The blade */}
      <section aria-labelledby="blade-heading" className="flex flex-col gap-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="blade-heading" className="text-base font-semibold">
            {focusHabit ? focusHabit.title : "All 120 days"}
          </h2>
          {focusHabit && (
            <button
              type="button"
              onClick={() => setFocusSlug(null)}
              className="text-sm text-muted-foreground underline decoration-1 underline-offset-4 hover:text-foreground hover:decoration-2"
            >
              Show all commitments
            </button>
          )}
        </div>
        <Blade
          bands={bands}
          label="120 day record. Use the arrow keys to move between days."
          idleText={
            focusHabit
              ? `${focusHabit.title}: blue where you did it, bare where you didn't.`
              : "Select a day to read it."
          }
        />
        <TemperScale />
      </section>

      {/* Stamped figures */}
      <section aria-label="Overview">
        <dl className="grid grid-cols-2 border-y border-border sm:grid-cols-4">
          <Figure label="Day" value={`${Math.min(currentDay, TOTAL_DAYS)}`} sub={`of ${TOTAL_DAYS}`} />
          <Figure label="Adherence" value={`${metrics.adherence}%`} sub="of all commitments" />
          <Figure label="Days set" value={`${metrics.completedDays}`} sub={`of ${elapsed} so far`} />
          <Figure
            label="Speaking"
            value={`Stage ${speakingStage}`}
            sub={`${speakingSuccessesAtStage} of 5 here · ${speakingTotalSuccessful} total`}
          />
        </dl>
      </section>

      {/* Each commitment */}
      <section aria-labelledby="each-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="each-heading" className="text-base font-semibold">
            Each commitment
          </h2>
          <p className="text-sm text-muted-foreground">Select one to see only its days on the blade.</p>
        </div>
        <ul className="border-t border-border sm:grid sm:grid-cols-2 sm:gap-x-10">
          {habitBreakdown.map(({ habit, done, base, pct }) => {
            const active = focusSlug === habit.slug;
            return (
              <li key={habit.slug}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFocusSlug(active ? null : habit.slug)}
                  className={cn(
                    "group flex w-full flex-col gap-2.5 border-b border-border py-4 text-left outline-none transition-colors",
                    "hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                    active && "bg-muted/50",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-3 px-1">
                    <span className="truncate font-medium">{habit.title}</span>
                    <span className="font-data shrink-0 text-xs text-muted-foreground">
                      {done}/{base} · {pct}%
                    </span>
                  </span>
                  <span className="relative mx-1 h-[3px] overflow-hidden bg-border">
                    <span
                      className="absolute inset-y-0 left-0 origin-left transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:h-full"
                      style={{ width: `${pct}%`, backgroundColor: temperColor(Math.max(1, temperIndex(pct / 100))) }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

function Figure({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1 border-border px-1 py-5 odd:pr-4 even:border-l even:pl-4 sm:border-l sm:px-5 sm:first:border-l-0 sm:first:pl-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-data text-[clamp(22px,3.4vw,34px)] leading-none font-medium tracking-[-0.03em]">{value}</dd>
      <dd className="text-xs text-muted-foreground">{sub}</dd>
    </div>
  );
}

/** Legend: the seven temper colors, named. */
function TemperScale() {
  return (
    <ul aria-label="Temper scale" className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
      {TEMPER_NAMES.map((name, i) => (
        <li key={name} className="flex items-center gap-1.5">
          <span aria-hidden className="band size-3 rounded-[1px]" style={{ backgroundColor: temperColor(i) }} />
          {name}
        </li>
      ))}
    </ul>
  );
}
