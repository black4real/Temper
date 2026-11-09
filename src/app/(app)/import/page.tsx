import Link from "next/link";
import { getProfile } from "@/lib/supabase/auth";
import { ImportFlow } from "@/components/settings/import-flow";

export const metadata = { title: "Import data" };

export default async function ImportPage() {
  const { user, profile } = await getProfile();

  return (
    <main id="main" tabIndex={-1} className="outline-none mx-auto w-full max-w-[640px] flex-1 px-5 py-8 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Import</h1>
        <Link
          href="/settings"
          className="text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Settings
        </Link>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        Import progress from the macOS Ghost Mode app. Your original app and its data are never
        changed. LeetCode progress and logs, recall rules, and notification settings are not imported.
      </p>
      <ImportFlow userId={user.id} saveRecordings={profile.save_recordings} />
    </main>
  );
}
