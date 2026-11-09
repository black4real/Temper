"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Habit } from "@/lib/ghost-mode/habits";
import { MAX_HABITS, TITLE_MAX, DETAIL_MAX } from "@/lib/ghost-mode/habits";
import {
  createHabit,
  updateHabit,
  deleteHabit,
  moveHabit,
  seedDefaultHabits,
  type ActionResult,
} from "@/lib/ghost-mode/habits-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function HabitsEditor({ habits, editable }: { habits: Habit[]; editable: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function run(action: () => Promise<ActionResult>, okMsg?: string) {
    start(async () => {
      const res = await action();
      if (!res.ok) {
        toast.error(res.error || "Something went wrong.");
        return;
      }
      if (okMsg) toast.success(okMsg);
      router.refresh();
    });
  }

  return (
    <section
      id="commitments"
      className="flex scroll-mt-20 flex-col gap-4 rounded-[10px] border border-border bg-card p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-sm font-semibold">Commitments</h2>
          <p className="text-xs text-muted-foreground">
            Your daily checklist. Rename, reorder, add or remove — Speaking stays because it drives
            the practice screen.
          </p>
        </div>
        {editable && (
          <span className="tnum shrink-0 text-xs text-muted-foreground">
            {habits.length}/{MAX_HABITS}
          </span>
        )}
      </div>

      {!editable ? (
        <div className="flex flex-col items-start gap-3 rounded-[8px] border border-border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Customizing commitments needs the latest database update (migration 0002). Once it&apos;s
            applied in Supabase, load your starting set here.
          </p>
          <Button
            variant="outline"
            disabled={pending}
            onClick={() => run(seedDefaultHabits, "Commitments ready")}
          >
            Load default commitments
          </Button>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-2.5">
            {habits.map((habit, i) => (
              <HabitRow
                key={habit.slug}
                habit={habit}
                isFirst={i === 0}
                isLast={i === habits.length - 1}
                pending={pending}
                onMove={(direction) => run(() => moveHabit({ slug: habit.slug, direction }))}
                onSave={(title, detail) =>
                  run(() => updateHabit({ slug: habit.slug, title, detail }), "Saved")
                }
                onDelete={() => run(() => deleteHabit({ slug: habit.slug }), "Removed")}
              />
            ))}
          </ul>

          <AddHabit
            pending={pending}
            disabled={habits.length >= MAX_HABITS}
            onAdd={(title, detail) => run(() => createHabit({ title, detail }), "Added")}
          />
        </>
      )}
    </section>
  );
}

function HabitRow({
  habit,
  isFirst,
  isLast,
  pending,
  onMove,
  onSave,
  onDelete,
}: {
  habit: Habit;
  isFirst: boolean;
  isLast: boolean;
  pending: boolean;
  onMove: (direction: "up" | "down") => void;
  onSave: (title: string, detail: string) => void;
  onDelete: () => void;
}) {
  const [title, setTitle] = useState(habit.title);
  const [detail, setDetail] = useState(habit.detail);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dirty = title.trim() !== habit.title || detail.trim() !== habit.detail;

  return (
    <li className="flex flex-col gap-2 rounded-[8px] border border-border bg-background p-3">
      <div className="flex items-center gap-2">
        <div className="flex shrink-0 flex-col">
          <ArrowButton label="Move up" disabled={isFirst || pending} onClick={() => onMove("up")}>
            <path d="m18 15-6-6-6 6" />
          </ArrowButton>
          <ArrowButton label="Move down" disabled={isLast || pending} onClick={() => onMove("down")}>
            <path d="m6 9 6 6 6-6" />
          </ArrowButton>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Input
            aria-label={`${habit.title} name`}
            value={title}
            maxLength={TITLE_MAX}
            disabled={pending}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Input
            aria-label={`${habit.title} detail`}
            value={detail}
            maxLength={DETAIL_MAX}
            disabled={pending}
            placeholder="Short detail (optional)"
            onChange={(e) => setDetail(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {habit.isSystem ? (
            <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
              Required
            </span>
          ) : confirmDelete ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                disabled={pending}
                onClick={() => {
                  setConfirmDelete(false);
                  onDelete();
                }}
              >
                Confirm remove
              </Button>
              <Button variant="ghost" size="sm" disabled={pending} onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={pending}
              onClick={() => setConfirmDelete(true)}
            >
              Remove
            </Button>
          )}
        </div>

        {dirty && (
          <Button
            size="sm"
            disabled={pending || !title.trim()}
            onClick={() => onSave(title.trim(), detail.trim())}
          >
            Save
          </Button>
        )}
      </div>
    </li>
  );
}

function AddHabit({
  pending,
  disabled,
  onAdd,
}: {
  pending: boolean;
  disabled: boolean;
  onAdd: (title: string, detail: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim(), detail.trim());
    setTitle("");
    setDetail("");
  }

  if (disabled) {
    return (
      <p className="text-xs text-muted-foreground">
        You&apos;ve reached the maximum of {MAX_HABITS} commitments. Remove one to add another.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-[8px] border border-dashed border-border p-3">
      <Label htmlFor="new-habit-title" className="text-xs font-medium text-muted-foreground">
        Add a commitment
      </Label>
      <Input
        id="new-habit-title"
        value={title}
        maxLength={TITLE_MAX}
        disabled={pending}
        placeholder="Name (e.g. Stretch)"
        onChange={(e) => setTitle(e.target.value)}
      />
      <Input
        aria-label="New commitment detail"
        value={detail}
        maxLength={DETAIL_MAX}
        disabled={pending}
        placeholder="Short detail (optional)"
        onChange={(e) => setDetail(e.target.value)}
      />
      <Button type="submit" size="sm" disabled={pending || !title.trim()} className="self-start">
        Add commitment
      </Button>
    </form>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-6 items-center justify-center rounded-[4px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30"
    >
      <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
