"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { useSheen } from "@/motion/heat";

/**
 * The bar on the anvil. A brushed-steel track; the worked part is filled with the current
 * heat color (`var(--heat)`, written by `useHeat` on an ancestor so the numeral and labels
 * share one driver). Optional ticks mark each commitment. `sweepKey` > 0 plays the one-off
 * "set" sweep (bump it from the event that completes the day).
 */
export function TemperBar({
  ratio,
  ticks = 0,
  sweepKey = 0,
  label,
  valueText,
  className,
}: {
  ratio: number;
  ticks?: number;
  sweepKey?: number;
  label: string;
  valueText: string;
  className?: string;
}) {
  const sheenRef = useRef<HTMLDivElement>(null);
  useSheen(sheenRef);
  const pct = Math.max(0, Math.min(1, ratio)) * 100;

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={valueText}
      className={cn("steel relative h-14 w-full overflow-hidden rounded-[2px] sm:h-16", className)}
    >
      <div
        className="band absolute inset-y-0 left-0 transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ width: `${pct}%`, backgroundColor: "var(--heat)" }}
      />
      {ticks > 1 && (
        <div aria-hidden className="absolute inset-0 flex">
          {Array.from({ length: ticks }, (_, i) => (
            <span key={i} className={cn("flex-1", i > 0 && "border-l border-background/40")} />
          ))}
        </div>
      )}
      <div ref={sheenRef} aria-hidden className="sheen" />
      {sweepKey > 0 && <span key={sweepKey} aria-hidden className="set-sweep absolute inset-0 overflow-hidden" />}
    </div>
  );
}
