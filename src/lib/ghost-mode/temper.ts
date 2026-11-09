// The temper scale. Polished steel takes a specific oxide color as it heats:
// bare → pale straw → straw → bronze → purple → violet → blue. Temper maps how complete a
// day was onto that scale, so the 120-day record reads like a tempered blade.

export const TEMPER_MAX = 6;

export const TEMPER_NAMES = [
  "Bare steel",
  "Pale straw",
  "Straw",
  "Bronze",
  "Purple",
  "Violet",
  "Tempered blue",
] as const;

/** Discrete band for a completion ratio: 0 = nothing done, 6 = everything done. */
export function temperIndex(ratio: number): number {
  if (!(ratio > 0)) return 0;
  if (ratio >= 1) return TEMPER_MAX;
  return Math.min(TEMPER_MAX - 1, 1 + Math.floor(ratio * 5));
}

/** CSS color reference for a band index (theme-aware via custom properties). */
export function temperColor(index: number): string {
  const i = Math.max(0, Math.min(TEMPER_MAX, Math.round(index)));
  return `var(--t${i})`;
}

/** Position along the continuous scale (0..6) used by the live heat driver. */
export function temperPosition(ratio: number): number {
  if (!(ratio > 0)) return 0;
  return 1 + Math.min(1, ratio) * 5;
}
