"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { applyTheme, type Theme } from "@/lib/theme";
import { computeDayNumber, toLocalISODate } from "@/lib/ghost-mode/day";
import { updateProfile, resetToday, resetAll } from "@/lib/ghost-mode/settings-actions";
import type { Profile } from "@/lib/supabase/auth";

export function SettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [startDate, setStartDate] = useState(profile.start_date);
  const [theme, setTheme] = useState<Theme>(profile.theme);
  const [layout, setLayout] = useState<"blocks" | "minimal">(profile.habit_layout);
  const [saveRecordings, setSaveRecordings] = useState(profile.save_recordings);

  function save(patch: Parameters<typeof updateProfile>[0], revert: () => void) {
    startSaving(async () => {
      const res = await updateProfile(patch);
      if (!res.ok) {
        revert();
        toast.error(res.error || "Could not save.");
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Start date */}
      <Section title="System start date" desc="Day 1 of your 120-day cycle.">
        <Input
          type="date"
          aria-label="System start date"
          value={startDate}
          max="2100-12-31"
          onChange={(e) => {
            const prev = startDate;
            setStartDate(e.target.value);
            if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) {
              save({ start_date: e.target.value }, () => setStartDate(prev));
            }
          }}
          className="w-full max-w-56"
        />
      </Section>

      {/* Theme */}
      <Section title="Theme">
        <Segmented
          options={[
            { value: "system", label: "System" },
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          value={theme}
          onChange={(v) => {
            const prev = theme;
            const next = v as Theme;
            setTheme(next);
            applyTheme(next);
            save({ theme: next }, () => {
              setTheme(prev);
              applyTheme(prev);
            });
          }}
        />
      </Section>

      {/* Habit layout */}
      <Section title="Habit layout" desc="How today's commitments are arranged.">
        <Segmented
          options={[
            { value: "blocks", label: "Blocks" },
            { value: "minimal", label: "Minimal" },
          ]}
          value={layout}
          onChange={(v) => {
            const prev = layout;
            const next = v as "blocks" | "minimal";
            setLayout(next);
            save({ habit_layout: next }, () => setLayout(prev));
          }}
        />
      </Section>

      {/* Save recordings */}
      <Section title="Speaking" desc="Retain audio recordings. Transcripts are always saved.">
        <div className="flex items-center justify-between rounded-[10px] border border-border bg-card px-4 py-3">
          <Label htmlFor="save-recordings" className="text-sm font-medium">
            Save recordings
          </Label>
          <Switch
            id="save-recordings"
            checked={saveRecordings}
            onCheckedChange={(v) => {
              const prev = saveRecordings;
              setSaveRecordings(v);
              save({ save_recordings: v }, () => setSaveRecordings(prev));
            }}
          />
        </div>
      </Section>

      {/* Data import */}
      <Section title="Data" desc="Bring in progress exported from the macOS app.">
        <Button variant="outline" nativeButton={false} render={<Link href="/import" />}>
          Import data
        </Button>
      </Section>

      {/* Danger zone */}
      <ResetControls startDate={startDate} disabled={saving} onDone={() => router.refresh()} />
    </div>
  );
}

function ResetControls({
  startDate,
  disabled,
  onDone,
}: {
  startDate: string;
  disabled: boolean;
  onDone: () => void;
}) {
  const [busy, startBusy] = useTransition();
  const [confirmToday, setConfirmToday] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);

  function doResetToday() {
    const day = computeDayNumber(startDate);
    startBusy(async () => {
      const res = await resetToday(day);
      setConfirmToday(false);
      if (!res.ok) toast.error(res.error || "Could not reset.");
      else {
        toast.success("Today's progress reset.");
        onDone();
      }
    });
  }

  function doResetAll() {
    startBusy(async () => {
      const res = await resetAll(toLocalISODate(new Date()));
      setConfirmAll(false);
      if (!res.ok) toast.error(res.error || "Could not reset.");
      else {
        toast.success("All data reset.");
        onDone();
      }
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        Reset
      </h2>

      <div className="flex items-center justify-between gap-3 rounded-[10px] border border-border bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium">Reset today&apos;s progress</p>
          <p className="text-xs text-muted-foreground">Clears today&apos;s nine checkboxes.</p>
        </div>
        {confirmToday ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="destructive" onClick={doResetToday} disabled={busy}>
              Confirm
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmToday(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => setConfirmToday(true)} disabled={disabled || busy}>
            Reset today
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 rounded-[10px] border border-destructive/30 bg-destructive/[0.03] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-destructive">Reset all data</p>
            <p className="text-xs text-muted-foreground">
              Erases all records, speaking sessions and recordings, and restarts from today.
            </p>
          </div>
          {!confirmAll && (
            <Button size="sm" variant="destructive" onClick={() => setConfirmAll(true)} disabled={disabled || busy}>
              Reset all
            </Button>
          )}
        </div>
        {confirmAll && (
          <div className="flex items-center justify-between gap-3 rounded-md bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">
              This cannot be undone. Everything will be permanently deleted.
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <Button size="sm" variant="destructive" onClick={doResetAll} disabled={busy}>
                {busy ? "Resetting…" : "Delete everything"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmAll(false)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2.5">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
      {children}
    </section>
  );
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-card p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={cn(
            "rounded-[6px] px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            value === opt.value ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
