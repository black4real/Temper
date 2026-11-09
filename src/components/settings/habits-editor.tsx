"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALL_DAYS,
  DETAIL_MAX,
  HABIT_ICONS,
  MAX_HABITS,
  TARGET_MAX,
  TITLE_MAX,
  UNIT_MAX,
  describeSchedule,
  type Habit,
} from "@/lib/ghost-mode/habits";
import {
  createHabit,
  updateHabit,
  deleteHabit,
  moveHabit,
  seedDefaultHabits,
  type ActionResult,
  type HabitExtras,
} from "@/lib/ghost-mode/habits-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HabitIcon, ICON_COMPONENTS } from "@/components/temper/habit-icon";

type FormValues = {
  title: string;
  detail: string;
  icon: string | null;
  scheduleDays: number[];
  counted: boolean;
  target: string;
  unit: string;
};

export function HabitsEditor({ habits, editable, v3 }: { habits: Habit[]; editable: boolean; v3: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState<string | null>(null); // slug being edited, or "new"

  function run(action: () => Promise<ActionResult>, okMsg?: string, after?: () => void) {
    start(async () => {
      const res = await action();
      if (!res.ok) {
        toast.error(res.error || "Something went wrong.");
        return;
      }
      if (okMsg) toast.success(okMsg);
      after?.();
      router.refresh();
    });
  }

  function extrasFrom(v: FormValues, isLink: boolean): HabitExtras {
    if (!v3) return {};
    return {
      icon: v.icon,
      scheduleDays: v.scheduleDays,
      target: !isLink && v.counted ? Number(v.target) : null,
      unit: !isLink && v.counted ? v.unit : null,
    };
  }

  return (
    <section id="commitments" aria-labelledby="commitments-heading" className="flex scroll-mt-24 flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h2 id="commitments-heading" className="font-display text-2xl font-extrabold tracking-[-0.03em]">
            Commitments
          </h2>
          <p className="max-w-[56ch] text-sm text-muted-foreground">
            Your daily checklist. Set which days each one applies to, give it a count if you track an
            amount, and reorder them. Speaking stays because it runs the practice screen.
          </p>
        </div>
        {editable && (
          <span className="font-data shrink-0 text-xs text-muted-foreground">
            {habits.length}/{MAX_HABITS}
          </span>
        )}
      </div>

      {!editable ? (
        <div className="flex flex-col items-start gap-3 border-l-2 border-ember py-1 pl-4">
          <p className="text-sm text-muted-foreground">
            Customizing commitments needs the database update in migration 0002. Once it&apos;s applied
            in Supabase, load your starting set here.
          </p>
          <Button variant="outline" disabled={pending} onClick={() => run(seedDefaultHabits, "Commitments ready")}>
            Load default commitments
          </Button>
        </div>
      ) : (
        <>
          {!v3 && (
            <p className="border-l-2 border-ember py-1 pl-4 text-sm text-muted-foreground">
              Schedules, counts, icons and daily notes unlock after migration 0003 runs in Supabase (see
              DEPLOY.md). Names and order work now.
            </p>
          )}

          <ul className="flex flex-col border-t border-border">
            {habits.map((habit, i) => (
              <li key={habit.slug} className="border-b border-border">
                <div className="flex items-center gap-3 py-3">
                  <div className="flex shrink-0 flex-col">
                    <IconButton label={`Move ${habit.title} up`} disabled={i === 0 || pending} onClick={() => run(() => moveHabit({ slug: habit.slug, direction: "up" }))}>
                      <ChevronUp aria-hidden className="size-4" />
                    </IconButton>
                    <IconButton label={`Move ${habit.title} down`} disabled={i === habits.length - 1 || pending} onClick={() => run(() => moveHabit({ slug: habit.slug, direction: "down" }))}>
                      <ChevronDown aria-hidden className="size-4" />
                    </IconButton>
                  </div>
                  <span className="flex size-8 shrink-0 items-center justify-center border border-border text-muted-foreground">
                    <HabitIcon name={habit.icon} />
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{habit.title}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {[
                        habit.detail,
                        v3 ? describeSchedule(habit.scheduleDays) : null,
                        habit.target !== null ? `target ${habit.target}${habit.unit ? ` ${habit.unit}` : ""}` : null,
                        habit.isSystem ? "required" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${open === habit.slug ? "Close" : "Edit"} ${habit.title}`}
                    aria-expanded={open === habit.slug}
                    onClick={() => setOpen(open === habit.slug ? null : habit.slug)}
                  >
                    {open === habit.slug ? "Close" : "Edit"}
                  </Button>
                </div>

                {open === habit.slug && (
                  <HabitForm
                    key={habit.slug}
                    initial={{
                      title: habit.title,
                      detail: habit.detail,
                      icon: habit.icon,
                      scheduleDays: habit.scheduleDays,
                      counted: habit.target !== null,
                      target: habit.target !== null ? String(habit.target) : "",
                      unit: habit.unit ?? "",
                    }}
                    v3={v3}
                    isLink={habit.kind === "link"}
                    pending={pending}
                    submitLabel="Save changes"
                    onCancel={() => setOpen(null)}
                    onSubmit={(v) =>
                      run(
                        () => updateHabit({ slug: habit.slug, title: v.title, detail: v.detail, ...extrasFrom(v, habit.kind === "link") }),
                        "Saved",
                        () => setOpen(null),
                      )
                    }
                    onDelete={habit.isSystem ? undefined : () => run(() => deleteHabit({ slug: habit.slug }), "Removed", () => setOpen(null))}
                  />
                )}
              </li>
            ))}
          </ul>

          {habits.length >= MAX_HABITS ? (
            <p className="text-sm text-muted-foreground">
              You&apos;ve reached the maximum of {MAX_HABITS} commitments. Remove one to add another.
            </p>
          ) : open === "new" ? (
            <div className="border border-dashed border-input px-4">
              <HabitForm
                initial={{ title: "", detail: "", icon: null, scheduleDays: ALL_DAYS, counted: false, target: "", unit: "" }}
                v3={v3}
                isLink={false}
                pending={pending}
                submitLabel="Add commitment"
                onCancel={() => setOpen(null)}
                onSubmit={(v) =>
                  run(() => createHabit({ title: v.title, detail: v.detail, ...extrasFrom(v, false) }), "Added", () => setOpen(null))
                }
              />
            </div>
          ) : (
            <Button variant="outline" className="self-start" onClick={() => setOpen("new")} disabled={pending}>
              Add a commitment
            </Button>
          )}
        </>
      )}
    </section>
  );
}

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function HabitForm({
  initial,
  v3,
  isLink,
  pending,
  submitLabel,
  onSubmit,
  onCancel,
  onDelete,
}: {
  initial: FormValues;
  v3: boolean;
  isLink: boolean;
  pending: boolean;
  submitLabel: string;
  onSubmit: (v: FormValues) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const uid = useId();
  const [v, setV] = useState<FormValues>(initial);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = <K extends keyof FormValues>(k: K, value: FormValues[K]) => setV((s) => ({ ...s, [k]: value }));

  const targetNum = Number(v.target);
  const targetOk = !v.counted || (Number.isInteger(targetNum) && targetNum >= 1 && targetNum <= TARGET_MAX);
  const valid = v.title.trim().length > 0 && v.scheduleDays.length > 0 && targetOk;

  function toggleDay(d: number) {
    const has = v.scheduleDays.includes(d);
    set("scheduleDays", has ? v.scheduleDays.filter((x) => x !== d) : [...v.scheduleDays, d].sort());
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit({ ...v, title: v.title.trim(), detail: v.detail.trim(), unit: v.unit.trim() });
      }}
      className="flex flex-col gap-6 pt-2 pb-6 sm:pl-[4.75rem]"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor={`${uid}-t`}>
          <Input id={`${uid}-t`} value={v.title} maxLength={TITLE_MAX} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Stretch" required />
        </Field>
        <Field label="Detail (optional)" htmlFor={`${uid}-d`}>
          <Input id={`${uid}-d`} value={v.detail} maxLength={DETAIL_MAX} onChange={(e) => set("detail", e.target.value)} placeholder="e.g. 10 minutes" />
        </Field>
      </div>

      {v3 && (
        <>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Days</legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEK_ORDER.map((d) => {
                const on = v.scheduleDays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    aria-label={DAY_NAMES[d]}
                    onClick={() => toggleDay(d)}
                    className={cn(
                      "flex size-10 items-center justify-center border text-sm font-medium outline-hidden transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
                      on ? "border-foreground bg-foreground text-background" : "border-input text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {DAY_NAMES[d][0]}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              {v.scheduleDays.length === 0 ? "Pick at least one day." : describeSchedule(v.scheduleDays)}
            </p>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Icon</legend>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Icon">
              <IconChoice label="No icon" selected={v.icon === null} onClick={() => set("icon", null)}>
                <span className="text-xs">None</span>
              </IconChoice>
              {HABIT_ICONS.map((name) => {
                const Icon = ICON_COMPONENTS[name];
                return (
                  <IconChoice key={name} label={name.replace(/-/g, " ")} selected={v.icon === name} onClick={() => set("icon", name)}>
                    <Icon aria-hidden className="size-4" strokeWidth={1.75} />
                  </IconChoice>
                );
              })}
            </div>
          </fieldset>

          {!isLink && (
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2 text-sm font-medium">Count</legend>
              <label className="flex items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={v.counted}
                  onChange={(e) => set("counted", e.target.checked)}
                  className="size-4 accent-[var(--foreground)]"
                />
                Track an amount instead of a single check
              </label>
              {v.counted && (
                <div className="flex flex-wrap items-end gap-3">
                  <Field label="Target" htmlFor={`${uid}-g`}>
                    <Input id={`${uid}-g`} type="number" inputMode="numeric" min={1} max={TARGET_MAX} value={v.target} onChange={(e) => set("target", e.target.value)} className="w-28" placeholder="4" />
                  </Field>
                  <Field label="Unit (optional)" htmlFor={`${uid}-u`}>
                    <Input id={`${uid}-u`} value={v.unit} maxLength={UNIT_MAX} onChange={(e) => set("unit", e.target.value)} className="w-32" placeholder="L, pages" />
                  </Field>
                  {!targetOk && <p className="pb-2 text-xs text-destructive">Use a whole number from 1 to {TARGET_MAX}.</p>}
                </div>
              )}
            </fieldset>
          )}
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button type="submit" disabled={pending || !valid}>
            {submitLabel}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
        </div>
        {onDelete &&
          (confirmDelete ? (
            <div className="flex items-center gap-2">
              <Button type="button" variant="destructive" size="sm" disabled={pending} onClick={onDelete}>
                Remove for good
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Keep
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setConfirmDelete(true)}>
              Remove
            </Button>
          ))}
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function IconChoice({
  label,
  selected,
  onClick,
  children,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-10 min-w-10 items-center justify-center border px-2 outline-hidden transition-colors",
        "focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected ? "border-foreground bg-foreground text-background" : "border-input text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function IconButton({
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
      className="flex size-7 items-center justify-center rounded-[2px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
