"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Mic, Rows3, SlidersHorizontal, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Today", icon: CalendarCheck },
  { href: "/speaking", label: "Speaking", icon: Mic },
  { href: "/analysis", label: "Record", icon: Rows3 },
  { href: "/settings", label: "Settings", icon: SlidersHorizontal },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Desktop: inline nav. Hover draws an underline from the left; the current page keeps a
 * heated (straw/bronze) underline so you always know where you are.
 */
export function AppNavDesktop() {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden sm:block">
      <ul className="flex items-center gap-7">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative block py-2 text-sm font-medium transition-colors duration-200",
                  "bg-no-repeat bg-[position:left_bottom] transition-[background-size,color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                  active
                    ? "text-foreground bg-[linear-gradient(var(--ember),var(--ember))] bg-[length:100%_2px]"
                    : "text-muted-foreground bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] hover:bg-[length:100%_1px] hover:text-foreground focus-visible:bg-[length:100%_1px] focus-visible:text-foreground",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Mobile: fixed bottom tab bar, composed for the thumb. The current tab carries a heat mark. */
export function AppNavMobile() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/92 backdrop-blur-md sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)", viewTransitionName: "site-tabbar" }}
    >
      <ul className="mx-auto flex max-w-[720px]">
        {ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:bg-muted",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-x-[30%] top-0 h-[2px] origin-center transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
                    active ? "scale-x-100 bg-ember" : "scale-x-0 bg-transparent",
                  )}
                />
                <Icon aria-hidden className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
