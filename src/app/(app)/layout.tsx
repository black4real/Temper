import { ViewTransition } from "react";
import Link from "next/link";
import { getProfile } from "@/lib/supabase/auth";
import { AppNavDesktop, AppNavMobile } from "@/components/app/app-nav";
import { AccountMenu } from "@/components/app/account-menu";
import { ThemeSync } from "@/components/app/theme-sync";
import { Wordmark } from "@/components/app/wordmark";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const { user, profile } = await getProfile();

  return (
    <div className="flex min-h-dvh flex-col">
      <ThemeSync theme={profile.theme} />
      {/* The header is the fixed reference during page transitions: it never animates. */}
      <header
        className="sticky top-0 z-40 border-b border-border bg-background/88 backdrop-blur-md"
        style={{ viewTransitionName: "site-header" }}
      >
        <div className="mx-auto flex h-16 w-full max-w-[1040px] items-center justify-between gap-6 px-5 sm:px-8">
          <Link
            href="/"
            prefetch
            aria-label="Temper, today"
            className="-mx-1 rounded-[2px] px-1 py-1 transition-opacity hover:opacity-80"
          >
            <Wordmark />
          </Link>
          <div className="flex items-center gap-6">
            <AppNavDesktop />
            <AccountMenu email={user.email ?? "Account"} />
          </div>
        </div>
      </header>

      {/* Content leaves fast and arrives with the heat-in rise (see globals.css .page). */}
      <ViewTransition default="page">
        <div className="flex flex-1 flex-col pb-24 sm:pb-0">{children}</div>
      </ViewTransition>

      <AppNavMobile />
    </div>
  );
}
