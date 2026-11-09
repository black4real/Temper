import { cn } from "@/lib/utils";

/**
 * Page heading in the display voice (Archivo expanded, tight). One h1 per page.
 * `aside` sits on the right on desktop (a secondary link or switch), below on phone.
 */
export function PageTitle({
  title,
  lede,
  aside,
  className,
}: {
  title: string;
  lede?: string;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex flex-col gap-3">
        <h1 className="font-display text-[clamp(44px,8vw,88px)] leading-[0.86] font-extrabold tracking-[-0.045em]">
          {title}
        </h1>
        {lede && <p className="max-w-[52ch] text-[15px] text-muted-foreground">{lede}</p>}
      </div>
      {aside && <div className="shrink-0 pb-1">{aside}</div>}
    </header>
  );
}
