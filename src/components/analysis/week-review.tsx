"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsClient } from "@/lib/use-is-client";
import { isScheduled, type Habit } from "@/lib/ghost-mode/habits";
import { computeDayNumber, dateForDay, parseLocalDate, TOTAL_DAYS } from "@/lib/ghost-mode/day";
import { TEMPER_NAMES, temperColor, temperIndex } from "@/lib/ghost-mode/temper";
import type { DayMap } from "@/lib/ghost-mode/records";
import { dayProgress, scheduledFor, weekdayFor } from "@/lib/ghost-mode/stats";
import { RecordNav } from "@/components/analysis/record-nav";
import { HabitIcon } from "@/components/temper/habit-icon";

type Props = {
  startDate: string;
  days: DayMap;
  habits: Habit[];
  spokenSeconds: Record<number, number>;
};

const WEEKS = Math.ceil(TOTAL_DAYS / 7);
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const rangeFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });

export function WeekReview(props: Props) {
  const isClient = useIsClient();
  if (!isClient) {
    return (
      <div className="flex flex-col gap-10" aria-busy>
        <div className="h-[clamp(44px,8vw,88px)] w-56 rounded-[2px] bg-muted" />
        <div className="h-40 w-full rounded-[2px] bg-muted/60" />
      </div>
    );
  }
  return <WeekReviewClient {...props} />;
}

function WeekReviewClient({ startDate, days, habits, spokenSeconds }: Props) {
  const currentDay = useMemo(() => computeDayNumber(startDate), [startDate]);
  const currentWeek = Math.floor((Math.min(currentDay, TOTAL_DAYS) - 1) / 7);
  // Default to the last complete week; in the first week, show the week in progress.
  const [week, setWeek] = useState(() => Math.max(0, currentWeek - 1));

  const first = week * 7 + 1;
  const dayNums = Array.from({ length: 7 }, (_, i) => first + i).filter((d) => d <= TOTAL_DAYS);
  const last = dayNums[dayNums.length - 1];

  const perDay = dayNums.map((d) => {
    const future = d > currentDay;
    const p = dayProgress(days[d], scheduledFor(habits, startDate, d));
    return { day: d, future, p, date: parseLocalDate(dateForDay(startDate, d)) };
  });

  const worked = perDay.filter((x) => !x.future && !x.p.rest);
  const set = worked.filter((x) => x.p.done >= x.p.total).length;
  const doneSum = worked.reduce((n, x) => n + x.p.done, 0);
  const possible = worked.reduce((n, x) => n + x.p.total, 0);
  const adherence = possible > 0 ? Math.round((doneSum / possible) * 100) : 0;
  const minutes = Math.round(dayNums.reduce((n, d) => n + (spokenSeconds[d] ?? 0), 0) / 60);

  const rows = habits.map((h) => {
    const cells = perDay.map((x) => {
      const on = isScheduled(h, weekdayFor(startDate, x.day));
      const hit = !!days[x.day]?.ids.includes(h.slug);
      return { day: x.day, state: x.future ? "future" : !on ? "off" : hit ? "hit" : "miss" } as const;
    });
    const base = cells.filter((c) => c.state === "hit" || c.state === "miss").length;
    const hits = cells.filter((c) => c.state === "hit").length;
    return { habit: h, cells, base, hits, pct: base > 0 ? hits / base : -1 };
  });

  const rated = rows.filter((r) => r.base > 0);
  const strongest = rated.length ? rated.reduce((a, b) => (b.pct > a.pct || (b.pct === a.pct && b.hits > a.hits) ? b : a)) : null;
  const weakest = rated.filter((r) => r.pct < 1);
  const slipped = weakest.length ? weakest.reduce((a, b) => (b.pct < a.pct ? b : a)) : null;

  const notes = perDay.filter((x) => days[x.day]?.note);

  return (
    <div className="flex flex-col gap-14">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-[clamp(44px,8vw,88px)] leading-[0.86] font-extrabold tracking-[-0.045em]">
            Week {week + 1}
          </h1>
          <p className="font-data text-sm text-muted-foreground">
            Days {first} to {last} · {rangeFmt.format(perDay[0].date)} to {rangeFmt.format(perDay[perDay.length - 1].date)}
            {week === currentWeek && " · in progress"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex border border-input" role="group" aria-label="Choose week">
            <button
              type="button"
              aria-label="Previous week"
              disabled={week === 0}
              onClick={() => setWeek((w) => Math.max(0, w - 1))}
              className="flex size-10 items-center justify-center outline-none hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-35"
            >
              <ChevronLeft aria-hidden className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next week"
              disabled={week >= Math.min(currentWeek, WEEKS - 1)}
              onClick={() => setWeek((w) => Math.min(currentWeek, w + 1))}
              className="flex size-10 items-center justify-center border-l border-input outline-none hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-35"
            >
              <ChevronRight aria-hidden className="size-4" />
            </button>
          </div>
          <RecordNav current="week" />
        </div>
      </header>

      {/* The week as seven bands */}
      <section aria-labelledby="week-bands" className="flex flex-col gap-3">
        <h2 id="week-bands" className="sr-only">
          Days of week {week + 1}
        </h2>
        <ol className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {perDay.map(({ day, future, p, date }) => {
            const index = future ? 0 : temperIndex(p.ratio);
            return (
              <li key={day} className="flex flex-col gap-2">
                <div
                  className={cn("band h-28 rounded-[1px] sm:h-40", future && "opacity-40")}
                  style={{ backgroundColor: temperColor(index), animation: "heat-in 380ms cubic-bezier(0.22,1,0.36,1) both" }}
                  role="img"
                  aria-label={`Day ${day}, ${dayFmt.format(date)}: ${future ? "not worked yet" : p.rest ? "rest day" : `${TEMPER_NAMES[index]}, ${p.done} of ${p.total}`}`}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-medium sm:text-sm">{dayFmt.format(date)}</span>
                  <span className="font-data text-[11px] text-muted-foreground">
                    {future ? "·" : p.rest ? "rest" : `${p.done}/${p.total}`}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Figures */}
      <section aria-label="Week overview">
        <dl className="grid grid-cols-3 border-y border-border">
          <WeekFigure label="Days set" value={`${set}`} sub={`of ${worked.length} worked`} />
          <WeekFigure label="Adherence" value={`${adherence}%`} sub="of scheduled" />
          <WeekFigure label="Speaking" value={`${minutes}`} sub="minutes spoken" />
        </dl>
        {(strongest || slipped) && (
          <p className="mt-5 max-w-[64ch] text-[15px]">
            {strongest && (
              <>
                Strongest: <strong className="font-semibold">{strongest.habit.title}</strong>, {strongest.hits} of {strongest.base}.{" "}
              </>
            )}
            {slipped && (
              <>
                Slipped most: <strong className="font-semibold">{slipped.habit.title}</strong>, {slipped.hits} of {slipped.base}.
              </>
            )}
          </p>
        )}
      </section>

      {/* Commitment × day grid */}
      <section aria-labelledby="grid-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="grid-heading" className="text-base font-semibold">
            Each commitment this week
          </h2>
          <p className="text-sm text-muted-foreground">Blue is done, bare is missed, a dot means it wasn&apos;t scheduled.</p>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="py-2 text-left font-normal text-muted-foreground">
                <span className="sr-only">Commitment</span>
              </th>
              {perDay.map(({ day, date }) => (
                <th key={day} scope="col" className="w-9 py-2 text-center text-xs font-normal text-muted-foreground sm:w-12">
                  {dayFmt.format(date).slice(0, 2)}
                </th>
              ))}
              <th scope="col" className="w-14 py-2 text-right text-xs font-normal text-muted-foreground">
                Done
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ habit, cells, base, hits }) => (
              <tr key={habit.slug} className="border-b border-border">
                <th scope="row" className="max-w-0 py-3 pr-3 text-left font-medium">
                  <span className="flex items-center gap-2">
                    <HabitIcon name={habit.icon} className="text-muted-foreground" />
                    <span className="truncate">{habit.title}</span>
                  </span>
                </th>
                {cells.map((c) => (
                  <td key={c.day} className="py-3 text-center">
                    {c.state === "off" || c.state === "future" ? (
                      <span aria-label={c.state === "off" ? "not scheduled" : "not yet"} className="font-data text-muted-foreground/60">
                        ·
                      </span>
                    ) : (
                      <span
                        role="img"
                        aria-label={c.state === "hit" ? "done" : "missed"}
                        className="band mx-auto block size-5 rounded-[1px] sm:size-6"
                        style={{ backgroundColor: c.state === "hit" ? "var(--t6)" : "var(--t0)" }}
                      />
                    )}
                  </td>
                ))}
                <td className="font-data py-3 text-right text-xs text-muted-foreground">
                  {base > 0 ? `${hits}/${base}` : "·"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Notes */}
      <section aria-labelledby="notes-heading" className="flex flex-col gap-3">
        <h2 id="notes-heading" className="text-base font-semibold">
          Notes
        </h2>
        {notes.length === 0 ? (
          <p className="border-t border-border pt-4 text-sm text-muted-foreground">
            No notes this week. Add one line a day on the Today screen.
          </p>
        ) : (
          <ul className="border-t border-border">
            {notes.map(({ day, date }) => (
              <li key={day} className="grid grid-cols-[5rem_1fr] gap-4 border-b border-border py-3 sm:grid-cols-[7rem_1fr]">
                <span className="font-data text-xs text-muted-foreground">
                  Day {day} · {dayFmt.format(date)}
                </span>
                <p className="text-[15px]">{days[day]?.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function WeekFigure({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex flex-col gap-1 border-border px-1 py-5 not-first:border-l not-first:pl-4 sm:not-first:pl-5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-data text-[clamp(22px,3.4vw,34px)] leading-none font-medium tracking-[-0.03em]">{value}</dd>
      <dd className="text-xs text-muted-foreground">{sub}</dd>
    </div>
  );
}
