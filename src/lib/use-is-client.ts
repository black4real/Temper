"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/** SSR-safe flag: false during server render and hydration, true once on the client. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
