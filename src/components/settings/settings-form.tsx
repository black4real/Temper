"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
    <div className="flex flex-col border-t border-border">
      <Row title="Start date" desc="Day 1 of your 120 days. Changing it shifts which day today is.">
        <Input
          type="date"
          aria-label="Start date"
          value={startDate}
          max="2100-12-31"
          onChange={(e) => {
            const prev = startDate;
            setStartDate(e.target.value);
            if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) {
              save({ start_date: e.target.value }, () => setStartDate(prev));
            }
          }}
          className="w-full max-w-60"
        />
      </Row>

      <Row title="Theme" desc="Blued steel at night, brushed steel by day.">
        <Segmented
          label="Theme"
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
      </Row>

      <Row title="Today layout" desc="Two columns of commitments on wide screens, or one list.">
        <Segmented
          label="Today layout"
          options={[
            { value: "blocks", label: "Two columns" },
            { value: "minimal", label: "One list" },
          ]}
          value={layout}
          onChange={(v) => {
            const prev = layout;
            const next = v as "blocks" | "minimal";
            setLayout(next);
            save({ habit_layout: next }, () => setLayout(prev));
          }}
        />
      </Row>

      <Row title="Keep recordings" desc="Store the audio of each speaking session. Transcripts are always kept.">
        <label htmlFor="save-recordings" className="flex items-center gap-3 text-sm">
          <Switch
            id="save-recordings"
            checked={saveRecordings}
            onCheckedChange={(v) => {
              const prev = saveRecordings;
              setSaveRecordings(v);
              save({ save_recordings: v }, () => setSaveRecordings(prev));
            }}
          />
          {saveRecordings ? "On" : "Off"}
        </label>
      </Row>

      <Row title="Your data" desc="Download everything you've recorded, or bring in an export from the Mac app.">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" nativeButton={false} render={<a href="/api/export?format=json" download />}>
            Download JSON
          </Button>
          <Button variant="outline" nativeButton={false} render={<a href="/api/export?format=csv" download />}>
            Download CSV
          </Button>
          <Button variant="ghost" nativeButton={false} render={<Link href="/import" />}>
            Import from the Mac app
          </Button>
        </div>
      </Row>

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
    <>
      <Row title="Reset today" desc="Clears today's checkmarks. Other days stay as they are.">
        {confirmToday ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="destructive" onClick={doResetToday} disabled={busy}>
              Clear today
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
      </Row>

      <Row
        title="Reset everything"
        desc="Erases every record, speaking session and recording, and starts again from today."
        danger
      >
        {confirmAll ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-destructive">This can&apos;t be undone. Everything is deleted for good.</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="destructive" onClick={doResetAll} disabled={busy}>
                {busy ? "Deleting" : "Delete everything"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmAll(false)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="destructive" onClick={() => setConfirmAll(true)} disabled={disabled || busy}>
            Reset everything
          </Button>
        )}
      </Row>
    </>
  );
}

/** Spec-sheet row: what it is on the left, the control on the right. */
function Row({
  title,
  desc,
  danger,
  children,
}: {
  title: string;
  desc?: string;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-b border-border py-7 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] sm:gap-10">
      <div>
        <h2 className={cn("text-base font-semibold", danger && "text-destructive")}>{title}</h2>
        {desc && <p className="mt-1 max-w-[40ch] text-sm text-muted-foreground">{desc}</p>}
      </div>
      <div className="flex items-start">{children}</div>
    </section>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex border border-input">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
          className={cn(
            "h-10 px-4 text-sm font-medium outline-hidden transition-colors not-first:border-l not-first:border-input",
            "focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-ring",
            value === opt.value ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
