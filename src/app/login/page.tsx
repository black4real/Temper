import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth/auth-form";
import { TemperMark } from "@/components/app/wordmark";
import { Blade, type BladeBand } from "@/components/temper/blade";

export const metadata = { title: "Sign in", alternates: { canonical: "/login" } };

// An illustrative blade for the sign-in screen: worked days heating up over time, then the
// untouched future. Brand art, not anyone's record.
const DEMO_BANDS: BladeBand[] = Array.from({ length: 120 }, (_, i) => {
  const day = i + 1;
  if (i >= 72) return { day, index: 0, state: "future", label: "" };
  const wave = (Math.sin(i * 1.7) + Math.sin(i * 0.31)) * 0.5;
  const index = Math.max(1, Math.min(6, Math.round(1.5 + (i / 72) * 4 + wave * 1.4)));
  return { day, index, state: "past", label: "" };
});

export default async function LoginPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims?.sub) redirect("/");

  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto grid min-h-dvh w-full max-w-[1200px] grid-rows-[1fr_auto] px-5 py-8 outline-hidden sm:px-10 lg:grid-cols-12 lg:grid-rows-1 lg:gap-12 lg:py-12"
    >
      <section className="flex flex-col justify-between gap-10 lg:col-span-7">
        <div className="flex items-center gap-2.5">
          <TemperMark />
          <span className="text-sm text-muted-foreground">A 120 day system</span>
        </div>

        <div className="flex flex-col gap-6">
          <h1 className="font-display text-[clamp(60px,11vw,136px)] leading-[0.8] font-extrabold tracking-[-0.06em]">
            Temper
          </h1>
          <p className="max-w-[34ch] text-lg leading-snug text-muted-foreground sm:text-xl">
            Steel is tempered by heat, over and over. So are habits. Every day of work heats the bar,
            and the record keeps its color.
          </p>
        </div>

        <div className="hidden lg:block lg:h-[120px]">
          <Blade bands={DEMO_BANDS} decorative label="" idleText="" className="h-full" />
        </div>
      </section>

      <section className="flex flex-col justify-center gap-8 pt-12 lg:col-span-5 lg:border-l lg:border-border lg:pt-0 lg:pl-12">
        <AuthForm />
        <div className="lg:hidden">
          <Blade bands={DEMO_BANDS} decorative label="" idleText="" />
        </div>
      </section>
    </main>
  );
}
