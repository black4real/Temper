export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center outline-none"
    >
      <div
        aria-hidden
        className="size-12 rounded-sm border-2 border-dashed border-border"
      />
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        You&apos;re offline
      </h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        Ghost Mode needs a connection to sync your progress. Reconnect and this page
        will pick back up.
      </p>
    </main>
  );
}
