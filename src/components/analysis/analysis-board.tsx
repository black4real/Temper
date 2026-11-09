"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/use-is-client";
import { isScheduled, type Habit } from "@/lib/ghost-mode/habits";
import { computeDayNumber, dateForDay, parseLocalDate, TOTAL_DAYS } from "@/lib/ghost-mode/day";
import { TEMPER_NAMES, temperColor, temperIndex } from "@/lib/ghost-mode/temper";
import type { DayEntry, DayMap } from "@/lib/ghost-mode/records";
import { dayProgress, scheduledFor, streaks, weekdayFor } from "@/lib/ghost-mode/stats";
import { Blade, type BladeBand } from "@/components/temper/blade";
import { DaySheet } from "@/components/analysis/day-sheet";
import { RecordNav } from "@/components/analysis/record-nav";

type Props = {
  startDate: string;
  days: DayMap;
  habits: Habit[];
  v3: boolean;
  speakingStage: number;
  speakingSuccessesAtStage: number;
  speakingTotalSuccessful: number;
  averageWpm: number | null;
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
  days: serverDays,
  habits,
  v3,
  speakingStage,
  speakingSuccessesAtStage,
  speakingTotalSuccessful,
  averageWpm,
}: Props) {
  const router = useRouter();
  const currentDay = useMemo(() => computeDayNumber(startDate), [startDate]);
  const elapsed = Math.min(currentDay, TOTAL_DAYS);
  const [overrides, setOverrides] = useState<DayMap>({});
  const days = useMemo(() => ({ ...serverDays, ...overrides }), [serverDays, overrides]);
  const [focusSlug, setFocusSlug] = useState<string | null>(null);
  const [editing, setEditing] = useState<number | null>(null);

  const progress = useMemo(() => {
    const map = new Map<number, ReturnType<typeof dayProgress>>();
    for (let d = 1; d <= elapsed; d++) map.set(d, dayProgress(days[d], scheduledFor(habits, startDate, d)));
    return map;
  }, [days, elapsed, habits, startDate]);

  const metrics = useMemo(() => {
    let set = 0;
    let doneSum = 0;
    let possible = 0;
    for (const p of progress.values()) {
      if (p.rest) continue;
      doneSum += p.done;
      possible += p.total;
      if (p.done >= p.total) set += 1;
    }
    return { set, adherence: possible > 0 ? Math.round((doneSum / possible) * 100) : 0 };
  }, [progress]);

  const streak = useMemo(() => streaks(habits, startDate, days, currentDay), [habits, startDate, days, currentDay]);

  // Per commitment: hits over the days it was actually scheduled.
  const habitBreakdown = useMemo(
    () =>
      habits.map((habit) => {
        let done = 0;
        let base = 0;
        for (let d = 1; d <= elapsed; d++) {
          if (!isScheduled(habit, weekdayFor(startDate, d))) continue;
          base += 1;
          if (days[d]?.ids.includes(habit.slug)) done += 1;
        }
        return { habit, done, base, pct: base > 0 ? Math.round((done / base) * 100) : 0 };
      }),
    [habits, elapsed, startDate, days],
  );

  const focusHabit = focusSlug ? habits.find((h) => h.slug === focusSlug) ?? null : null;

  const bands: BladeBand[] = useMemo(
    () =>
      Array.from({ length: TOTAL_DAYS }, (_, i) => {
        const day = i + 1;
        const when = shortDate.format(parseLocalDate(dateForDay(startDate, day)));
        if (day > currentDay) {
          return { day, index: 0, state: "future" as const, label: `Day ${day} · ${when} · not worked yet` };
        }
        const state = day === currentDay ? ("today" as const) : ("past" as const);
        const suffix = day === currentDay ? " · today" : "";
        if (focusHabit) {
          const on = isScheduled(focusHabit, weekdayFor(startDate, day));
          const hit = !!days[day]?.ids.includes(focusHabit.slug);
          return {
            day,
            index: hit ? 6 : 0,
            state,
            dim: !hit,
            label: `Day ${day} · ${when} · ${focusHabit.title} ${!on ? "not scheduled" : hit ? "done" : "missed"}${suffix}`,
          };
        }
        const p = progress.get(day)!;
        const index = temperIndex(p.ratio);
        const note = days[day]?.note ? ` · “${days[day]!.note}”` : "";
        return {
          day,
          index,
          state,
          label: p.rest
            ? `Day ${day} · ${when} · rest day${suffix}`
            : `Day ${day} · ${when} · ${TEMPER_NAMES[index]}, ${p.done} of ${p.total}${suffix}${note}`,
        };
      }),
    [startDate, currentDay, days, focusHabit, progress],
  );

  function onSaved(day: number, entry: DayEntry) {
    setOverrides((o) => ({ ...o, [day]: entry }));
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-14">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-[clamp(44px,8vw,88px)] leading-[0.86] font-extrabold tracking-[-0.045em]">
            Record
          </h1>
          <p className="max-w-[52ch] text-[15px] text-muted-foreground">
            Every day you work leaves its color in the blade. Bare steel is a missed day; blue is a day
            where everything scheduled got done. Select a past day to fix it.
          </p>
        </div>
        <RecordNav current="record" />
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
          onSelect={(day) => setEditing(day)}
          selectedDay={editing}
          label="120 day record. Use the arrow keys to move between days, Enter to edit one."
          idleText={
            focusHabit
              ? `${focusHabit.title}: blue where you did it, bare where you didn't.`
              : "Select a day to read it or fix it."
          }
        />
        <TemperScale />
      </section>

      {/* Stamped figures */}
      <section aria-label="Overview">
        <dl className="grid grid-cols-2 border-y border-border sm:grid-cols-4">
          <Figure label="Streak" value={`${streak.current}`} sub={`best ${streak.best} days`} />
          <Figure label="Adherence" value={`${metrics.adherence}%`} sub="of scheduled commitments" />
          <Figure label="Days set" value={`${metrics.set}`} sub={`of ${elapsed} so far`} />
          <Figure
            label="Speaking"
            value={`Stage ${speakingStage}`}
            sub={`${speakingSuccessesAtStage} of 5 here · ${speakingTotalSuccessful} total${averageWpm ? ` · ${averageWpm} wpm` : ""}`}
          />
        </dl>
      </section>

      {/* Each commitment */}
      <section aria-labelledby="each-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="each-heading" className="text-base font-semibold">
            Each commitment
          </h2>
          <p className="text-sm text-muted-foreground">
            Counted over the days it was scheduled. Select one to see only its days on the blade.
          </p>
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
                    "group flex w-full flex-col gap-2.5 border-b border-border py-4 text-left outline-hidden transition-colors",
                    "hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-ring",
                    active && "bg-muted/50",
                  )}
                >
                  <span className="flex items-baseline justify-between gap-3 px-1">
                    <span className="truncate font-medium">{habit.title}</span>
                    <span className="font-data shrink-0 text-xs text-muted-foreground">
                      {done}/{base} · {pct}%
                    </span>
                  </span>
                  <span className="relative mx-1 h-[3px] overflow-hidden bg-border transition-[height] duration-300 group-hover:h-[6px] group-focus-visible:h-[6px]">
                    <span
                      className="absolute inset-y-0 left-0 transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{ width: `${pct}%`, backgroundColor: temperColor(Math.max(1, temperIndex(pct / 100))) }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {editing !== null && (
        <DaySheet
          key={editing}
          day={editing}
          dateISO={dateForDay(startDate, editing)}
          scheduled={scheduledFor(habits, startDate, editing)}
          entry={days[editing]}
          v3={v3}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}
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
