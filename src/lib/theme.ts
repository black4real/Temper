export type Theme = "system" | "light" | "dark";

/** Applies a theme to <html> and remembers it for the no-flash init script. Client-only. */
export function applyTheme(theme: Theme) {
  try {
    localStorage.setItem("gm-theme", theme);
  } catch {
    /* ignore */
  }
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);
  document.documentElement.classList.toggle("dark", dark);
}
