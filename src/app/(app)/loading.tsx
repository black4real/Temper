import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shown immediately on every navigation within the app shell. Without this, a page turn
 * blocks on the server (auth check + queries) while the old page stays on screen, which
 * reads as a long, unresponsive delay. With it, the new page appears instantly.
 */
export default function Loading() {
  return (
    <main
      className="mx-auto w-full max-w-[720px] flex-1 px-5 py-8 sm:py-10"
      aria-busy
      aria-label="Loading"
    >
      <div className="flex flex-col gap-7">
        <header className="flex flex-col gap-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-56" />
        </header>

        <div className="flex flex-col gap-2">
          <Skeleton className="mb-1 h-3 w-32" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[62px] w-full" />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-[3px] w-full" />
        </div>
      </div>
    </main>
  );
}
