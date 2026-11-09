import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <main
      id="main"
      tabIndex={-1}
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-12 outline-none"
    >
      {/* Ghosted 120-cell ledger, faint in the background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.05]"
      >
        <div className="grid grid-cols-12 gap-1">
          {Array.from({ length: 120 }).map((_, i) => (
            <div key={i} className="size-4 rounded-[3px] bg-foreground sm:size-5" />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3 text-center">
          <div aria-hidden className="size-10 rounded-[6px] bg-ember" />
          <h1 className="font-display text-3xl font-semibold tracking-tight">Ghost Mode</h1>
          <p className="max-w-xs text-sm text-muted-foreground">
            A 120-day system. Execute eight daily commitments; keep the record in sync across your
            devices.
          </p>
        </div>
        <AuthForm />
      </div>
    </main>
  );
}
