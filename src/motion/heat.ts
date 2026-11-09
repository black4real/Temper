"use client";

// The heat driver: one variable (how complete today is, 0..1) mapped to every visual that
// carries the concept, so they always agree. It writes `--heat` on a host element, and the
// bar, the numeral tint and the "now" marks all read that one property.
//
// Tweens run on GSAP's ticker (no rAF loops of our own), pause off screen, and do nothing
// under reduced motion beyond setting the final color. GSAP is imported lazily inside the
// effects so it never sits in the initial JavaScript of any page.

import { useEffect, useRef, type RefObject } from "react";
import { TEMPER_MAX, temperPosition } from "@/lib/ghost-mode/temper";

type Gsap = typeof import("gsap").gsap;
let gsapPromise: Promise<Gsap> | null = null;
function loadGsap(): Promise<Gsap> {
  gsapPromise ??= import("gsap").then((m) => m.gsap);
  return gsapPromise;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readRamp(): string[] {
  const cs = getComputedStyle(document.documentElement);
  return Array.from({ length: TEMPER_MAX + 1 }, (_, i) => cs.getPropertyValue(`--t${i}`).trim());
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Color at a continuous position on the ramp (0..6), mixed between neighbouring bands. */
function colorAt(ramp: string[], position: number): string {
  const lo = Math.max(0, Math.min(TEMPER_MAX, Math.floor(position)));
  const hi = Math.min(TEMPER_MAX, lo + 1);
  const t = position - lo;
  const a = hexToRgb(ramp[lo] ?? "");
  const b = hexToRgb(ramp[hi] ?? "");
  if (!a || !b) return ramp[lo] || "";
  const mix = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

/** Re-runs `fn` whenever the theme class on <html> changes (the ramp is theme-dependent). */
function onThemeChange(fn: () => void): () => void {
  const mo = new MutationObserver(fn);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}

/**
 * Heats `ref` toward `ratio`: tweens the position along the temper ramp and writes the
 * resulting color to `--heat`. Read `var(--heat)` in CSS.
 */
export function useHeat(ref: RefObject<HTMLElement | null>, ratio: number) {
  const pos = useRef({ v: temperPosition(ratio) });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const target = temperPosition(ratio);
    const apply = () => el.style.setProperty("--heat", colorAt(readRamp(), pos.current.v));

    const stop = onThemeChange(apply);
    apply();
    if (prefersReducedMotion()) {
      pos.current.v = target;
      apply();
      return stop;
    }

    let cancelled = false;
    let kill: (() => void) | null = null;
    loadGsap().then((gsap) => {
      if (cancelled) return;
      const tween = gsap.to(pos.current, { v: target, duration: 0.7, ease: "expo.out", onUpdate: apply });
      kill = () => tween.kill();
    });
    return () => {
      cancelled = true;
      kill?.();
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

    let cancelled = false;
    let cleanup: (() => void) | null = null;
    loadGsap().then((gsap) => {
      if (cancelled) return;
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
      cleanup = () => {
        tween.kill();
        io.disconnect();
      };
    });
    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [ref]);
}
