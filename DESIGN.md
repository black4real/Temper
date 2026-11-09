# Temper: design system (awwwards process)

> Design guidance only. Scope comes from the project brief and the approved plan.
> Product: a personal 120 day discipline system. Daily commitments (user defined), speaking
> practice with recording and live transcript, a record of every day, settings, import.
> Excluded by brief: LeetCode, notifications, recall rules.

## Phase 0: Brief

- **Subject:** Temper, a 120 day system for doing your daily commitments until they set.
- **Audience:** the owner first; later, other disciplined people on invite.
- **Job:** make the daily check-in frictionless and make the accumulated record feel earned.
- **Constraints:** a daily tool, opened many times a day, on phone and web. Fast page turns
  matter more than spectacle (it was the first complaint). Installable PWA, accessible,
  reduced motion, both themes designed.

## Phase 1: Concept

Three territories:

| | A. Temper colors (name + material) | B. Long exposure (old name, Ghost Mode) | C. Tally ledger (formal) |
|---|---|---|---|
| Idea | Each day of work heats the bar; the oxide color it takes is the record | Each day is one exposure stacked on the frame; consistent days come out sharp | 120 tally marks struck one by one |
| Anchor | The product is called Temper; polished steel really does record its heat as color | The old name "Ghost Mode" | None specific |
| Originality / fit / feasibility / portability | 5 / 5 / 4 / 1 | 3 / 3 / 3 / 3 | 2 / 3 / 5 / 5 |

Chosen: **A**. It only works because of the name and the real metallurgy.
It is not the skill's "fire that cools down" example: no flames, no cooling, and the color is an
index of completion, not a temperature that decays.

```
Idea:        Discipline is tempered like steel. Each day of work heats the bar, and the color
             it takes is a permanent record of how far you pushed that day.
Metaphor:    A steel bar on the anvil; the 120 day record is the finished blade.
Signature:   Today's bar heats one oxide color per commitment checked. At N/N the day sets:
             a sheen sweeps across and the band locks into the blade.
Emotion:     Quiet, workshop precise, earned.
Motion verb: heat and set. Color warms in with a slight rise, then sets firmly. No bounce.
Screenshot:  Record page: a long blade of 120 bands from bare steel to deep blue.
```

## Phase 2: Art direction

### Palette by role

| Role | Light (brushed steel) | Dark (blued steel, hero) |
|---|---|---|
| ground | `#EEF0F2` | `#0D0E10` |
| ink | `#121417` | `#ECEDEF` |
| muted (AA on ground) | `#565C64` | `#8B9097` |
| line | `#D3D7DC` | `#23262B` |
| bare steel band | `#CFD3D8` | `#25292F` |
| focus ring | `#2F5FB8` | `#7AA3EE` |
| "now" marker (`--ember`) | `#9A6326` bronze | `#D6B062` straw |

**The temper ramp is the accent** (`--t0` … `--t6`): bare, pale straw, straw, bronze, purple,
violet, tempered blue. A day's completion ratio maps to a band (`temperIndex`): 0 is bare, any
progress is 1 to 5, and only a fully completed day reaches 6 (blue).

The purple to blue end of the ramp touches the "AI gradient" tell. It is kept because it is the
real oxide sequence, and it is never drawn as a gradient, glow or blob: always hard-edged bands
with the brushed grain on top.

### Type

- **Archivo** (Google, variable width + weight) does everything. Expanded width (`font-stretch:
  125%`, `.font-display`) at 800 for numerals and headings; normal width 400 to 600 for text.
  Display tracking `-0.045em`, leading `0.82` on the numeral.
- **Martian Mono** (`.font-data`) only for figures and data: counts, dates, streaks. Never for
  labels in general (template tell).
- Body 16 px / 1.5. Small UI 12 to 14 px, AA checked. Sentence case. No eyebrow labels.

### Grid, shape, surfaces

- Content column: 1040 px max on Today and Record, 720 px on forms. 20 px gutters on phone,
  32 px on desktop. Everything hangs from the left edge of the column.
- **One radius: 2 px** (machined edges). No soft rounded cards anywhere.
- Steel surfaces use `.steel` (fine horizontal grain + top light). Bands use `.band`.
- Commitments sit on a rule system (hairlines between full width rows), not in boxes.

### Composition plan

```
Today                                   Record (/analysis)
┌──────────────────────────────────┐    ┌──────────────────────────────────┐
│ Monday 9 November · 4 day streak │    │ Record            [Record|Week] │
│ 042                (huge numeral)│    │ ███████▒▒▒▒░░░░  120 band blade  │
│ ████████▒▒▒▒░░░░░░  today's bar  │    │ readout: Day 37 · Bronze · 5/8   │
│ 5 of 8 · Bronze                  │    │ adherence  completed  best streak│
├──────────────────────────────────┤    │ per commitment hit rates (select │
│ ▣ 5 shot video        done       │    │ one to filter the blade)         │
│ ▢ Water   2/4 L         [-] [+]  │    └──────────────────────────────────┘
│ ▢ Speaking            open  →    │
├──────────────────────────────────┤    Speaking                Settings / forms
│ note: one line about today       │    record control is the   quiet sections on
└──────────────────────────────────┘    focal point; transcript the 2px system,
                                        panel beside it         720 px column
Login: wordmark large, blade ghosted behind, form on the right (stacks on phone).
404 "Not forged yet.": a bare bar. Offline "Off the anvil.".
```

### Motion language

- One easing family: `cubic-bezier(0.22, 1, 0.36, 1)` (expo out). 120 to 300 ms for controls,
  600 to 900 ms for the set sweep and heat tween.
- **Driver:** `src/motion/heat.ts`. One variable (today's completion) → `--heat`, read by the
  bar fill, the numeral tint and the current state label. Tweened on GSAP's ticker.
- **Idle:** a narrow sheen drifts across the steel bar every ~11 s (`useSheen`), paused off
  screen, absent under reduced motion. That is the concept breathing, not decoration.
- **Set:** at N/N a single bright sweep runs across the bar (`.set-sweep`), once.
- **Page turns:** React `<ViewTransition>`. Header and tab bar are fixed references; content
  leaves in 120 ms and arrives with an 8 px rise. Instant under reduced motion.
- **Hover/focus, one treatment per role:**
  - commitment rows: the left edge heats to the ramp color of the row's state, check marks set
  - solid buttons: a heat band spreads along the bottom edge
  - outline buttons: ink floods in from the left
  - nav: underline draws in; the current page keeps a heated underline (mobile: heat mark on
    the tab)
  - utility links: color only

### Decisions log

- No loader, no WebGL, no Lenis smooth scroll: a daily tool, and speed was the first complaint.
  Craft lives in type, the bar, the blade and state changes.
- GSAP core only (driver + idle sheen). Hover treatments are CSS.
- Both themes stay because the app already offers a theme setting; dark is the reference.
- Dynamic `theme-color` from the heat driver was dropped: it fights the per-scheme meta tags.
