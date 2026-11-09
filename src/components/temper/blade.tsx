"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useSheen } from "@/motion/heat";
import { temperColor } from "@/lib/ghost-mode/temper";

export type BladeBand = {
  day: number;
  /** Temper band 0..6 for worked days; ignored for future days. */
  index: number;
  state: "past" | "today" | "future";
  /** Full readout text, e.g. "Day 37 · Mon 15 Dec · Bronze, 5 of 8". */
  label: string;
  /** Dimmed (e.g. a miss while filtering to one commitment). */
  dim?: boolean;
};

/**
 * The 120-day record drawn as one tempered blade: a band per day, colored by how complete
 * that day was. Desktop: a single row of 120. Phone: 12 rows of 10, so every band is a
 * comfortable tap target.
 *
 * Keyboard: one tab stop; arrow keys move between days (up/down jump a row), Home/End go
 * to the ends, Enter/Space selects when `onSelect` is given. A live readout names the day
 * under the pointer or focus.
 */
export function Blade({
  bands,
  onSelect,
  selectedDay,
  label,
  idleText,
  decorative = false,
  className,
}: {
  bands: BladeBand[];
  onSelect?: (day: number) => void;
  selectedDay?: number | null;
  label: string;
  idleText: string;
  decorative?: boolean;
  className?: string;
}) {
  const sheenRef = useRef<HTMLDivElement>(null);
  useSheen(sheenRef);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const todayIdx = Math.max(0, bands.findIndex((b) => b.state === "today"));
  const [focusIdx, setFocusIdx] = useState(todayIdx);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const readIdx = hoverIdx ?? null;
  const readout = readIdx !== null ? bands[readIdx]?.label : null;

  function move(next: number) {
    const i = Math.max(0, Math.min(bands.length - 1, next));
    setFocusIdx(i);
    setHoverIdx(i);
    buttons.current[i]?.focus();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const cols = window.matchMedia("(min-width: 640px)").matches ? bands.length : 10;
    const map: Record<string, number> = {
      ArrowRight: focusIdx + 1,
      ArrowLeft: focusIdx - 1,
      ArrowDown: focusIdx + cols,
      ArrowUp: focusIdx - cols,
      Home: 0,
      End: bands.length - 1,
    };
    if (e.key in map) {
      e.preventDefault();
      move(map[e.key]);
    }
  }

  if (decorative) {
    return (
      <div aria-hidden className={cn("relative grid grid-cols-10 gap-[3px] sm:grid-cols-[repeat(120,minmax(0,1fr))] sm:gap-px", className)}>
        {bands.map((b) => (
          <span
            key={b.day}
            className={cn("band h-6 sm:h-full", b.state === "future" && "opacity-40")}
            style={{ backgroundColor: temperColor(b.state === "future" ? 0 : b.index) }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <p aria-live="polite" className="font-data min-h-5 truncate text-xs text-muted-foreground sm:text-[13px]">
        {readout ?? idleText}
      </p>

      <div className="relative">
        <div
          role="group"
          aria-label={label}
          onKeyDown={onKeyDown}
          onMouseLeave={() => setHoverIdx(null)}
          className="grid grid-cols-10 gap-[3px] sm:h-[132px] sm:grid-cols-[repeat(120,minmax(0,1fr))] sm:gap-px"
        >
          {bands.map((b, i) => {
            const future = b.state === "future";
            const selectable = !!onSelect && !future;
            return (
              <button
                key={b.day}
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                tabIndex={i === focusIdx ? 0 : -1}
                aria-label={b.label}
                aria-pressed={selectable && selectedDay === b.day ? true : undefined}
                aria-disabled={!selectable ? true : undefined}
                onMouseEnter={() => setHoverIdx(i)}
                onFocus={() => {
                  setFocusIdx(i);
                  setHoverIdx(i);
                }}
                onBlur={() => setHoverIdx(null)}
                onClick={() => selectable && onSelect?.(b.day)}
                className={cn(
                  "band relative h-8 rounded-[1px] transition-[translate,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] sm:h-full",
                  "outline-hidden focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-ring",
                  "hover:-translate-y-1 focus-visible:-translate-y-1",
                  future && "opacity-40",
                  b.dim && "opacity-25",
                  selectable ? "cursor-pointer" : "cursor-default",
                  b.state === "today" && "outline-2 outline-solid -outline-offset-2 outline-ember",
                  selectedDay === b.day && "outline-2 outline-solid outline-offset-1 outline-foreground",
                )}
                style={{
                  backgroundColor: temperColor(future ? 0 : b.index),
                  animation: "heat-in 380ms cubic-bezier(0.22,1,0.36,1) both",
                  animationDelay: `${Math.min(i, 119) * 2}ms`,
                }}
              />
            );
          })}
        </div>
        {/* Idle sheen on the long desktop blade only; on the stacked phone grid it would read
            as a glass wedge. The phone keeps its idle sheen on Today's bar. */}
        <div ref={sheenRef} aria-hidden className="sheen hidden opacity-60 sm:block" />
      </div>

      <div aria-hidden className="font-data flex justify-between text-[11px] text-muted-foreground">
        <span>Day 1</span>
        <span className="sm:hidden">10 per row</span>
        <span>Day 120</span>
      </div>
    </div>
  );
}
