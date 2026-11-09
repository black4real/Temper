"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { NOTE_MAX, type Habit } from "@/lib/ghost-mode/habits";
import { formatLongDate } from "@/lib/ghost-mode/day";
import { saveDayRecord } from "@/lib/ghost-mode/actions";
import { EMPTY_DAY, type DayEntry } from "@/lib/ghost-mode/records";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HabitIcon } from "@/components/temper/habit-icon";

/**
 * Fix the record: edit one past day's commitments, counts and note. Only the commitments that
 * were scheduled that weekday are listed. Saves through the same server action as Today, which
 * refuses future days.
 */
export function DaySheet({
  day,
  dateISO,
  scheduled,
  entry,
  v3,
  onClose,
  onSaved,
}: {
  day: number;
  dateISO: string;
  scheduled: Habit[];
  entry: DayEntry | undefined;
  v3: boolean;
  onClose: () => void;
  onSaved: (day: number, entry: DayEntry) => void;
}) {
  const start = entry ?? EMPTY_DAY;
  const [ids, setIds] = useState<Set<string>>(() => new Set(start.ids));
  const [counts, setCounts] = useState<Record<string, number>>(() => ({ ...start.counts }));
  const [note, setNote] = useState(start.note);
  const [saving, startSaving] = useTransition();

  function toggle(h: Habit) {
    const next = new Set(ids);
    if (next.has(h.slug)) next.delete(h.slug);
    else next.add(h.slug);
    setIds(next);
  }

  function step(h: Habit, delta: number) {
    if (h.target === null) return;
    const value = Math.max(0, (counts[h.slug] ?? 0) + delta);
    const nextCounts = { ...counts, [h.slug]: value };
    if (value === 0) delete nextCounts[h.slug];
    setCounts(nextCounts);
    const next = new Set(ids);
    if (value >= h.target) next.add(h.slug);
    else next.delete(h.slug);
    setIds(next);
  }

  function save() {
    startSaving(async () => {
      const res = await saveDayRecord({
        dayNumber: day,
        date: dateISO,
        completedHabitIds: Array.from(ids),
        counts: v3 ? counts : undefined,
        note: v3 ? note : undefined,
      });
      if (!res.ok) {
        toast.error(res.error || "Could not save that day.");
        return;
      }
      toast.success(`Day ${day} updated.`);
      onSaved(day, { ids: res.completedHabitIds, counts, note });
      onClose();
    });
  }

  const done = scheduled.filter((h) => ids.has(h.slug)).length;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Day {day}</DialogTitle>
          <DialogDescription>
            {formatLongDate(dateISO)} · {scheduled.length > 0 ? `${done} of ${scheduled.length} done` : "rest day"}
          </DialogDescription>
        </DialogHeader>

        {scheduled.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing was scheduled on this day.</p>
        ) : (
          <ul className="-mx-1 flex max-h-[50vh] flex-col overflow-y-auto border-t border-border">
            {scheduled.map((h) => {
              const isDone = ids.has(h.slug);
              if (h.target !== null) {
                const c = counts[h.slug] ?? 0;
                return (
                  <li key={h.slug} className="flex items-center gap-3 border-b border-border px-1 py-3">
                    <HabitIcon name={h.icon} className="text-muted-foreground" />
                    <span className={cn("min-w-0 flex-1 truncate font-medium", isDone && "text-muted-foreground line-through")}>
                      {h.title}
                    </span>
                    <button type="button" aria-label={`One less for ${h.title}`} onClick={() => step(h, -1)} disabled={c === 0} className="flex size-9 items-center justify-center border border-input hover:bg-foreground hover:text-background disabled:opacity-35">
                      <Minus aria-hidden className="size-4" />
                    </button>
                    <span className="font-data min-w-16 text-center text-sm">
                      {c}/{h.target}
                      {h.unit ? ` ${h.unit}` : ""}
                    </span>
                    <button type="button" aria-label={`One more for ${h.title}`} onClick={() => step(h, 1)} className="flex size-9 items-center justify-center border border-input hover:bg-foreground hover:text-background">
                      <Plus aria-hidden className="size-4" />
                    </button>
                  </li>
                );
              }
              return (
                <li key={h.slug}>
                  <button
                    type="button"
                    aria-pressed={isDone}
                    onClick={() => toggle(h)}
                    className="flex w-full items-center gap-3 border-b border-border px-1 py-3 text-left outline-hidden hover:bg-muted/40 focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-ring"
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-[2px] border",
                        isDone ? "border-foreground bg-foreground text-background" : "border-muted-foreground/50",
                      )}
                    >
                      {isDone && (
                        <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="square">
                          <path d="M4.5 12.5l5 5 10-11" />
                        </svg>
                      )}
                    </span>
                    <HabitIcon name={h.icon} className="text-muted-foreground" />
                    <span className={cn("min-w-0 flex-1 truncate font-medium", isDone && "text-muted-foreground line-through")}>
                      {h.title}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {v3 && (
          <div className="flex flex-col gap-2">
            <label htmlFor={`note-${day}`} className="text-sm font-medium">
              Note
            </label>
            <input
              id={`note-${day}`}
              type="text"
              value={note}
              maxLength={NOTE_MAX}
              onChange={(e) => setNote(e.target.value)}
              placeholder="One line about this day"
              className="h-10 w-full border-0 border-b border-input bg-transparent text-[15px] outline-hidden placeholder:text-muted-foreground focus-visible:border-foreground"
            />
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving" : "Save day"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
