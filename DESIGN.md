# Ghost Mode — Design System (awwwards process)

> Design guidance only. Scope and features are governed by the project brief, not by this file.
> The brief: preserve the 120-day system, 9 commitments, speaking (record + live transcript),
> analysis, settings. Exclude LeetCode, notifications, recall rules.

## Phase 0 — Brief

- **Subject:** a personal 120-day discipline system ("Ghost Mode"). Execute 9 daily commitments
  until they become routine; reflect on the record.
- **Audience:** first the owner; later, other disciplined individuals. Single-user accounts.
- **Job:** make daily execution frictionless and make the accumulated record feel earned.
- **Constraints:** responsive, installable PWA, accessible, reduced-motion, readable. Practical
  over spectacular — this is a tool used daily, not a launch microsite. The theatre is scaled
  down: no loader, no WebGL. Craft goes into type, grid, state transitions, and one signature.

## Phase 1 — Concept Card (chosen)

Three territories considered:
1. **Proof of discipline (ledger).** The program is one permanent field of 120 marks. (chosen)
2. **The ghost / future self.** Past is solid ink, today is sharp, the future is faint. Good,
   but risks being decorative; folded into the chosen concept as the "ghosted future" rule.
3. **Breath/metronome.** Discipline as rhythm. Too abstract for a daily utility; kept only as
   the idle-motion detail.

```
Idea:        Every day you execute, you strike a permanent mark into a 120-cell ledger.
             The record is the hero; today is just the live edge of it.
Metaphor:    An ink ledger / contact sheet of a life. Marks are struck, never undone lightly.
Signature:   The 120-cell grid is a single driver. One "clock" drives (a) today's fill as you
             check commitments and (b) a slow idle breath across the whole field at rest.
             Checking the last of 9 commitments "seals" the day cell with an ink-settle motion.
Emotion:     Quiet focus. Ink on paper. Nothing shouts; the filled grid does the talking.
Motion verb: "strike and settle" — marks appear with a quick strike, then settle like ink.
Screenshot:  The Analysis grid: 120 cells, most filled solid, today outlined and half-filled,
             the future faint — a portrait of accumulated discipline.
```

**Genericness test:** a generic model would build a card-grid habit tracker with colored
streaks and emoji. We reject that: monochrome ink, a single accent used only for "today", a
ledger grid as the organizing idea, mono numerals as a design element, and one sealed-day motion.

## Phase 2 — Art direction system

### Palette (by role, light + dark)
Monochrome ink-on-paper with one restrained accent. Pure #000/#fff avoided in favor of warm ink.

| Role    | Light      | Dark       | Use |
|---------|------------|------------|-----|
| ground  | `#F7F6F2`  | `#0E0E10`  | page background (warm paper / near-black) |
| ink     | `#141414`  | `#F2F1EC`  | primary text, filled marks |
| muted   | `#6E6C66`  | `#9A988F`  | secondary text, meta |
| line    | `#E2E0D9`  | `#262628`  | hairlines, borders, empty cells |
| accent  | `#C2410C`  | `#F97316`  | TODAY only + primary action focus (burnt ember) |
| curtain | `#141414`  | `#0E0E10`  | transition overlay |

Accent is scarce on purpose: it marks "now" (today's cell, the active commitment edge) and
nothing else. Completed = solid ink, not accent.

### Type
- **Display / numerals:** `Space Grotesk` (Google) — day numbers, headings, the "Day N / 120".
  Tracking negative on large sizes; tabular numerals for the ledger.
- **Body / UI:** `Inter` (Google) — 16–18px, 1.5 leading. Small meta/caption 12–13px (AA checked).
- Mono accents (durations, counts) use Space Grotesk tabular figures to avoid a third family.
- Fluid scale via `clamp()`. Display is an active element (large, tight, optically aligned).

### Grid & rhythm
- Content column max ~720px for execution screens; Analysis grid spans wider.
- 12-col mental grid; generous vertical rhythm that varies by section (not uniform fade-ups).
- Alignment rule: everything hangs to a left ink margin; numerals right-align in the ledger.

### Shape & motion language
- **Radius:** one rule — 10px on cards/controls, 3px on grid cells. Nothing fully rounded.
- **Eases:** one family. `--ease: cubic-bezier(0.22, 1, 0.36, 1)` (expo-out). Durations
  120–160ms for controls, 280–360ms for day-seal, 600ms+ for page/idle.
- **Idle:** the Analysis grid breathes — filled cells shift opacity ±4% on a slow sine, one
  shared clock, paused off-screen and under reduced-motion (written here as the decision).
- **Signature:** sealing a day (9/9) runs an ink-settle on that day's cell + a one-line
  confirmation. Checking any commitment runs a quick "strike" on its mark.

### Composition plan (sections, each a different layout family)
- **Auth:** single centered ink mark + form; the ledger faint in the background (ghosted).
- **Main / Today:** left-aligned header (Day N/120, date), a list/grid of 9 commitments, a thin
  completion bar, the "seal" state at 9/9. Speaking row links out to its screen.
- **Speaking:** full-width stage/topic/curveball header; a large record control as the focal
  point; live transcript area; fallback banner when unsupported.
- **Analysis:** metrics row, per-habit consistency bars, then the 120-cell ledger (the hero).
- **Settings / Import:** quiet forms, grouped sections, clear destructive-action styling.
- **404 / offline:** a single ghosted cell and a way back.

### Motion / usability hard rules (adopted from the skill)
- Animate transform/opacity/clip-path only; one GSAP-less approach is fine here (CSS + a single
  rAF driver for the grid idle, or GSAP if added). Reduced-motion: no idle, no scrub, all
  content visible, instant state changes.
- Every interactive element has hover + focus-visible + active in the system. Primary targets
  (check a commitment, record, save) answer in the "strike/settle" verb, not a color swap alone.
- Visible focus ring (accent), skip link, AA contrast in both themes and every grid state.
- Phone layout composed for 390px: commitments stack, ledger reflows to a tighter cell grid,
  tap targets ≥ 24px, no horizontal overflow.

## Decisions log
- Idle motion: ON for Analysis grid only; OFF under reduced-motion (recorded per skill rule).
- No loader, no WebGL (daily utility, not a showcase) — craft lives in type/grid/state.
- Accent reserved strictly for "now" + primary focus; completion is ink, never accent.
