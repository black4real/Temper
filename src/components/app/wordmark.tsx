import { cn } from "@/lib/utils";

/** The Temper mark: one short bar of the six oxide bands, bare to blue. Decorative. */
export function TemperMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("inline-flex h-3 w-6 gap-px", className)}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <span key={i} className="band h-full flex-1" style={{ backgroundColor: `var(--t${i})` }} />
      ))}
    </span>
  );
}

/** Mark + name. The name is real text so it reads and indexes as "Temper". */
export function Wordmark({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <TemperMark className={markClassName} />
      <span className="font-display text-[15px] font-extrabold tracking-[-0.03em]">Temper</span>
    </span>
  );
}
