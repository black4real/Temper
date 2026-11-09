import Link from "next/link";
import { cn } from "@/lib/utils";

/** Switch between the two record views. Real links, the current one marked. */
export function RecordNav({ current }: { current: "record" | "week" }) {
  const items = [
    { key: "record", href: "/analysis", label: "All 120 days" },
    { key: "week", href: "/analysis/week", label: "Week" },
  ] as const;
  return (
    <nav aria-label="Record views" className="inline-flex border border-input">
      {items.map((item) => {
        const active = item.key === current;
        return (
          <Link
            key={item.key}
            href={item.href}
            prefetch
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-10 items-center px-4 text-sm font-medium outline-hidden transition-colors not-first:border-l not-first:border-input",
              "focus-visible:outline-2 focus-visible:outline-solid focus-visible:-outline-offset-2 focus-visible:outline-ring",
              active ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
