import Link from "next/link";
import { getProfile } from "@/lib/supabase/auth";
import { AppNavDesktop, AppNavMobile } from "@/components/app/app-nav";
import { AccountMenu } from "@/components/app/account-menu";
import { ThemeSync } from "@/components/app/theme-sync";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, profile } = await getProfile();

  return (
    <div className="flex min-h-dvh flex-col">
      <ThemeSync theme={profile.theme} />
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[960px] items-center justify-between gap-4 px-5">
          <Link href="/" className="flex items-center gap-2" aria-label="Ghost Mode home">
            <span aria-hidden className="size-4 rounded-[4px] bg-ember" />
            <span className="font-display text-sm font-semibold tracking-tight">Ghost Mode</span>
          </Link>
          <AppNavDesktop />
          <AccountMenu email={user.email ?? "Account"} />
        </div>
      </header>

      <div className="flex flex-1 flex-col pb-20 sm:pb-0">{children}</div>

      <AppNavMobile />
    </div>
  );
}
