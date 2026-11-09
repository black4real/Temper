"use client";

// The heat driver: one variable (how complete today is, 0..1) mapped to every visual that
// carries the concept, so they always agree. It writes `--heat` on a host element, and the
// bar, the numeral tint and the "now" marks all read that one property.
//
// Everything runs through GSAP's ticker (no rAF loops of our own), pauses off screen, and
// does nothing under reduced motion beyond setting the final color.

import { useEffect, useRef, type RefObject } from "react";
import gsap from "gsap";
import { TEMPER_MAX, temperPosition } from "@/lib/ghost-mode/temper";

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readRamp(): string[] {
  const cs = getComputedStyle(document.documentElement);
  return Array.from({ length: TEMPER_MAX + 1 }, (_, i) => cs.getPropertyValue(`--t${i}`).trim());
}

/** Color at a continuous position on the ramp (0..6), interpolated between neighbours. */
function colorAt(ramp: string[], position: number): string {
  const lo = Math.max(0, Math.min(TEMPER_MAX, Math.floor(position)));
  const hi = Math.min(TEMPER_MAX, lo + 1);
  const t = position - lo;
  if (!ramp[lo] || !ramp[hi]) return ramp[lo] || "";
  return gsap.utils.interpolate(ramp[lo], ramp[hi], t) as string;
}

/** Re-runs `fn` whenever the theme class on <html> changes (the ramp is theme-dependent). */
function onThemeChange(fn: () => void): () => void {
  const mo = new MutationObserver(fn);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}

/**
 * Heats `ref` toward `ratio`: tweens the position along the temper ramp and writes the
 * resulting color to `--heat`. Returns nothing; read `var(--heat)` in CSS.
 */
export function useHeat(ref: RefObject<HTMLElement | null>, ratio: number) {
  const pos = useRef({ v: temperPosition(ratio) });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = temperPosition(ratio);
    const apply = () => el.style.setProperty("--heat", colorAt(readRamp(), pos.current.v));

    const stop = onThemeChange(apply);
    if (prefersReducedMotion()) {
      pos.current.v = target;
      apply();
      return stop;
    }
    apply();
    const tween = gsap.to(pos.current, { v: target, duration: 0.7, ease: "expo.out", onUpdate: apply });
    return () => {
      tween.kill();
      stop();
    };
  }, [ref, ratio]);
}

/**
 * Idle state: a narrow light drifts slowly across the polished steel while the visitor does
 * nothing. Writes `--sheen-x` (percent of the sheen's own width) on `ref`.
 */
export function useSheen(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    const state = { x: -30 };
    const tween = gsap.to(state, {
      x: 640,
      duration: 6.5,
      ease: "sine.inOut",
      repeat: -1,
      repeatDelay: 4.5,
      onUpdate: () => el.style.setProperty("--sheen-x", String(state.x)),
    });
    const io = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) tween.resume();
      else tween.pause();
    });
    io.observe(el);
    return () => {
      tween.kill();
      io.disconnect();
    };
  }, [ref]);
}
