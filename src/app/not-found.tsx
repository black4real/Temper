import Link from "next/link";
import { Wordmark } from "@/components/app/wordmark";

export const metadata = { title: "Not found" };

/** 404: an unworked bar. Nothing has been forged at this address. */
export default function NotFound() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto flex min-h-dvh w-full max-w-[1040px] flex-col justify-between px-5 py-8 outline-hidden sm:px-8"
    >
      <Link href="/" className="self-start rounded-[2px]" aria-label="Temper home">
        <Wordmark />
      </Link>

      <div className="flex flex-col gap-8 py-16">
        <p className="font-data text-sm text-muted-foreground">404</p>
        <h1 className="numeral max-w-[12ch] text-[clamp(56px,11vw,140px)]">Not forged yet.</h1>
        <div aria-hidden className="relative h-12 w-full max-w-[640px] overflow-hidden rounded-[2px] steel" />
        <p className="max-w-[46ch] text-muted-foreground">
          This page was never worked. The bar is bare. Head back and put in today&apos;s heat.
        </p>
        <Link
          href="/"
          className="self-start border-b-2 border-ember pb-1 text-base font-medium transition-[padding] duration-300 hover:pr-3 focus-visible:pr-3"
        >
          Back to today
        </Link>
      </div>

      <p className="text-xs text-muted-foreground">Temper · a 120 day system</p>
    </main>
  );
}
