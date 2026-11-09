/**
 * Shown immediately on every page turn inside the app, so navigation never hangs on the
 * old page while the server works. Shaped like the Temper layout (numeral, bar, rows) so
 * the real page settles into place instead of jumping.
 */
export default function Loading() {
  return (
    <main
      className="mx-auto w-full max-w-[1040px] flex-1 px-5 pt-8 pb-10 sm:px-8 sm:pt-12"
      aria-busy
      aria-label="Loading"
    >
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-5">
          <div className="h-3 w-40 rounded-[2px] bg-muted" />
          <div className="h-[clamp(64px,12vw,150px)] w-[min(60%,420px)] rounded-[2px] bg-muted/80" />
          <div className="relative h-14 w-full overflow-hidden rounded-[2px] steel opacity-70" />
        </div>
        <div className="flex flex-col border-t border-border">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border py-5">
              <div className="size-6 rounded-[2px] bg-muted" />
              <div className="h-4 rounded-[2px] bg-muted" style={{ width: `${30 + ((i * 17) % 35)}%` }} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
