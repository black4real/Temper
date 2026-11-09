import { Wordmark } from "@/components/app/wordmark";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh w-full max-w-[1040px] flex-col justify-between px-5 py-8 outline-hidden sm:px-8"
    >
      <Wordmark />
      <div className="flex flex-col gap-6 py-16">
        <h1 className="numeral max-w-[12ch] text-[clamp(48px,9vw,112px)]">Off the anvil.</h1>
        <div aria-hidden className="h-10 w-full max-w-[520px] rounded-[2px] steel opacity-60" />
        <p className="max-w-[46ch] text-muted-foreground">
          You&apos;re offline. Temper needs a connection to save today&apos;s record. Reconnect and
          this page picks back up.
        </p>
      </div>
      <span />
    </main>
  );
}
