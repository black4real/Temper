"use client";

import { useEffect } from "react";
import { applyTheme, type Theme } from "@/lib/theme";

/** Applies the user's saved theme on load so it follows them across devices. */
export function ThemeSync({ theme }: { theme: Theme }) {
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
  return null;
}
