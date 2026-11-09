"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { isScheduled, NOTE_MAX, type Habit } from "@/lib/ghost-mode/habits";
import { computeDayNumber, dateForDay, formatLongDate, TOTAL_DAYS } from "@/lib/ghost-mode/day";
import { saveDayRecord } from "@/lib/ghost-mode/actions";
import { TEMPER_NAMES, temperIndex } from "@/lib/ghost-mode/temper";
import { EMPTY_DAY, type DayEntry, type DayMap } from "@/lib/ghost-mode/records";
import { streaks, weekdayFor } from "@/lib/ghost-mode/stats";
import { useIsClient } from "@/lib/use-is-client";
import { useHeat } from "@/motion/heat";
import { TemperBar } from "@/components/temper/temper-bar";
import { HabitIcon } from "@/components/temper/habit-icon";

// The latest state of each day touched in this session. Pages are served from the prefetch
// cache for speed, so the server props can be a little older than your last tap; this keeps
// a revisit showing what you actually did. Cleared by a full reload.
const liveDays = new Map<string, DayEntry>();

type TodayBoardProps = {
  startDate: string;
  initialDays: DayMap;
  habits: Habit[];
  layout?: "blocks" | "minimal";
  /** Migration 0003 applied: counts and notes can be saved. */
  v3: boolean;
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

function TodayBoardClient({ startDate, initialDays, habits, layout = "blocks", v3 }: TodayBoardProps) {
  const [dayNumber] = useState(() => computeDayNumber(startDate));
  const liveKey = `${startDate}:${dayNumber}`;
  const [initial] = useState<DayEntry>(() => liveDays.get(liveKey) ?? initialDays[dayNumber] ?? EMPTY_DAY);
  const [ids, setIds] = useState<Set<string>>(() => new Set(initial.ids));
  const [counts, setCounts] = useState<Record<string, number>>(() => ({ ...initial.counts }));
  const [note, setNote] = useState(initial.note);
  const [noteState, setNoteState] = useState<"idle" | "saving" | "saved">("idle");
  const [sweepKey, setSweepKey] = useState(0);
  const [, startSaving] = useTransition();
  const hostRef = useRef<HTMLDivElement>(null);
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dateISO = useMemo(() => dateForDay(startDate, dayNumber), [startDate, dayNumber]);
  const weekday = useMemo(() => weekdayFor(startDate, dayNumber), [startDate, dayNumber]);
  const scheduled = useMemo(() => habits.filter((h) => isScheduled(h, weekday)), [habits, weekday]);
  const offToday = useMemo(() => habits.filter((h) => !isScheduled(h, weekday)), [habits, weekday]);

  const total = scheduled.length;
  const done = scheduled.reduce((n, h) => (ids.has(h.slug) ? n + 1 : n), 0);
  const ratio = total > 0 ? done / total : 0;
  const allDone = total > 0 && done >= total;
  const band = temperIndex(ratio);

  const streak = useMemo(
    () => streaks(habits, startDate, { ...initialDays, [dayNumber]: { ids: Array.from(ids), counts, note } }, dayNumber),
    [habits, startDate, initialDays, dayNumber, ids, counts, note],
  );

  // One driver: today's completion heats everything that carries the concept.
  useHeat(hostRef, ratio);

  function persist(
    next: { ids?: Set<string>; counts?: Record<string, number>; note?: string },
    revert: () => void,
    onSaved?: () => void,
  ) {
    startSaving(async () => {
      const res = await saveDayRecord({
        dayNumber,
        date: dateISO,
        completedHabitIds: next.ids ? Array.from(next.ids) : undefined,
        counts: v3 && next.counts ? next.counts : undefined,
        note: next.note,
      });
      if (!res.ok) {
        revert();
        toast.error(res.error || "Could not save. Try again.");
      } else {
        onSaved?.();
      }
    });
  }

  function commit(nextIds: Set<string>, nextCounts: Record<string, number>) {
    const prevIds = ids;
    const prevCounts = counts;
    setIds(nextIds);
    setCounts(nextCounts);
    liveDays.set(liveKey, { ids: Array.from(nextIds), counts: nextCounts, note });
    const nextDone = scheduled.reduce((n, h) => (nextIds.has(h.slug) ? n + 1 : n), 0);
    if (total > 0 && nextDone >= total && done < total) setSweepKey((k) => k + 1); // the day sets
    persist({ ids: nextIds, counts: nextCounts }, () => {
      setIds(prevIds);
      setCounts(prevCounts);
    });
  }

  function toggle(habit: Habit) {
    if (habit.kind !== "checkbox" || habit.target !== null) return;
    const next = new Set(ids);
    if (next.has(habit.slug)) next.delete(habit.slug);
    else next.add(habit.slug);
    commit(next, counts);
  }

  function step(habit: Habit, delta: number) {
    if (habit.target === null) return;
    const value = Math.max(0, Math.min(9999, (counts[habit.slug] ?? 0) + delta));
    const nextCounts = { ...counts, [habit.slug]: value };
    if (value === 0) delete nextCounts[habit.slug];
    const next = new Set(ids);
    if (value >= habit.target) next.add(habit.slug);
    else next.delete(habit.slug);
    commit(next, nextCounts);
  }

  function onNoteChange(value: string) {
    setNote(value);
    liveDays.set(liveKey, { ids: Array.from(ids), counts, note: value });
    setNoteState("saving");
    if (noteTimer.current) clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => {
      // Note only: checkmarks and counts are saved by their own taps, never from here.
      persist(
        { note: value },
        () => setNoteState("idle"),
        () => setNoteState("saved"),
      );
    }, 900);
  }

  return (
    <div ref={hostRef} className="flex flex-col gap-12">
      {/* Hero: the stamped day numeral, the streak, and today's bar */}
      <section aria-labelledby="today-heading" className="flex flex-col gap-6">
        <p className="text-sm text-muted-foreground">{formatLongDate(dateISO)}</p>
        <div className="flex items-end justify-between gap-6">
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
          <p className="flex flex-col items-end gap-1 pb-3 text-right">
            <span className="font-data text-[clamp(28px,4.5vw,48px)] leading-none font-medium tracking-[-0.04em]">
              {streak.current}
            </span>
            <span className="text-xs text-muted-foreground sm:text-sm">
              day streak<span className="hidden sm:inline"> · best {streak.best}</span>
            </span>
          </p>
        </div>

        <TemperBar
          ratio={ratio}
          ticks={total}
          sweepKey={sweepKey}
          label="Today's heat"
          valueText={`${done} of ${total} commitments done, ${TEMPER_NAMES[band]}`}
        />

        <div className="flex items-baseline justify-between gap-4">
          <p className="font-data text-sm">
            {total > 0 ? `${done} of ${total}` : "Rest day"}
          </p>
          <p
            aria-live="polite"
            className={cn("text-sm transition-colors", allDone ? "font-medium text-foreground" : "text-muted-foreground")}
          >
            {total === 0
              ? "Nothing is scheduled today."
              : allDone
                ? `Day ${dayNumber} is set. ${TEMPER_NAMES[band]}.`
                : TEMPER_NAMES[band]}
          </p>
        </div>
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

        {habits.length === 0 ? (
          <p className="border-t border-border py-6 text-sm text-muted-foreground">
            No commitments yet. Add your first one in Settings.
          </p>
        ) : (
          <ul className={cn("border-t border-border", layout === "blocks" && "sm:grid sm:grid-cols-2 sm:gap-x-10")}>
            {scheduled.map((habit) => (
              <li key={habit.slug}>
                <CommitmentRow
                  habit={habit}
                  done={ids.has(habit.slug)}
                  count={counts[habit.slug] ?? 0}
                  onToggle={() => toggle(habit)}
                  onStep={(d) => step(habit, d)}
                />
              </li>
            ))}
          </ul>
        )}

        {offToday.length > 0 && (
          <p className="pt-2 text-sm text-muted-foreground">
            Not scheduled today: {offToday.map((h) => h.title).join(", ")}.
          </p>
        )}
      </section>

      {/* One line about the day */}
      {v3 && (
        <section aria-labelledby="note-heading" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <label id="note-heading" htmlFor="day-note" className="text-base font-semibold">
              Note
            </label>
            <span aria-live="polite" className="font-data text-xs text-muted-foreground">
              {noteState === "saving" ? "saving" : noteState === "saved" ? "saved" : `${note.length}/${NOTE_MAX}`}
            </span>
          </div>
          <input
            id="day-note"
            type="text"
            value={note}
            maxLength={NOTE_MAX}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="One line about today"
            className="h-12 w-full border-0 border-b border-input bg-transparent px-0 text-[17px] outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-foreground"
          />
        </section>
      )}
    </div>
  );
}

function CommitmentRow({
  habit,
  done,
  count,
  onToggle,
  onStep,
}: {
  habit: Habit;
  done: boolean;
  count: number;
  onToggle: () => void;
  onStep: (delta: number) => void;
}) {
  const counted = habit.target !== null;
  const edge = (
    // The edge heats on hover/focus; once done it carries today's heat.
    <span
      aria-hidden
      className={cn(
        "absolute top-3 bottom-3 left-0 w-[3px] transition-[width,background-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "group-hover:w-[6px] group-focus-visible:w-[6px] group-focus-within:w-[6px]",
        done ? "" : "bg-border group-hover:bg-ember group-focus-visible:bg-ember group-focus-within:bg-ember",
      )}
      style={done ? { backgroundColor: "var(--heat)" } : undefined}
    />
  );
  const label = (
    <span className="flex min-w-0 flex-col">
      <span className="flex items-center gap-2">
        <HabitIcon name={habit.icon} className="text-muted-foreground" />
        <span
          className={cn(
            "truncate text-[17px] font-medium transition-colors",
            done && "text-muted-foreground line-through decoration-1",
          )}
        >
          {habit.title}
        </span>
      </span>
      {habit.detail && <span className="truncate text-[13px] text-muted-foreground">{habit.detail}</span>}
    </span>
  );

  const rowBase =
    "group relative flex w-full select-none items-center gap-4 border-b border-border py-4 pr-2 pl-5 text-left outline-none transition-colors duration-150 hover:bg-muted/40";

  if (counted) {
    const unit = habit.unit ? ` ${habit.unit}` : "";
    return (
      <div className={rowBase}>
        {edge}
        <Check done={done} />
        {label}
        <div className="ml-auto flex shrink-0 items-center gap-1" role="group" aria-label={`${habit.title} count`}>
          <StepButton label={`One less for ${habit.title}`} onClick={() => onStep(-1)} disabled={count === 0}>
            <Minus aria-hidden className="size-4" />
          </StepButton>
          <span className="font-data min-w-[4.5rem] text-center text-sm" aria-live="polite">
            {count}/{habit.target}
            {unit}
          </span>
          <StepButton label={`One more for ${habit.title}`} onClick={() => onStep(1)}>
            <Plus aria-hidden className="size-4" />
          </StepButton>
        </div>
      </div>
    );
  }

  const interactive = cn(
    rowBase,
    "cursor-pointer touch-manipulation focus-visible:bg-muted/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring active:bg-muted/70",
  );

  if (habit.kind === "link" && habit.href) {
    return (
      <Link href={habit.href} className={interactive} aria-label={`${habit.title}, ${done ? "done" : "not done"}, open practice`}>
        {edge}
        <Check done={done} link />
        {label}
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
    <button type="button" onClick={onToggle} aria-pressed={done} className={interactive}>
      {edge}
      <Check done={done} />
      {label}
    </button>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-10 touch-manipulation items-center justify-center border border-input text-foreground outline-none transition-[background-color,color,scale] duration-150 hover:bg-foreground hover:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-95 disabled:pointer-events-none disabled:opacity-35"
    >
      {children}
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
