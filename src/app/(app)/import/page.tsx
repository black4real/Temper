import Link from "next/link";
import { getProfile } from "@/lib/supabase/auth";
import { ImportFlow } from "@/components/settings/import-flow";
import { PageTitle } from "@/components/app/page-title";

export const metadata = { title: "Import data" };

export default async function ImportPage() {
  const { user, profile } = await getProfile();

  return (
    <main id="main" tabIndex={-1} className="outline-hidden mx-auto w-full max-w-[720px] flex-1 px-5 pt-8 pb-12 sm:px-8 sm:pt-12">
      <PageTitle
        title="Import"
        lede="Bring in progress from the Ghost Mode Mac app. The original app and its data are never changed. LeetCode progress and logs, recall rules and notification settings are left out."
        aside={
          <Link
            href="/settings"
            className="text-sm text-muted-foreground underline decoration-1 underline-offset-4 transition-colors hover:text-foreground hover:decoration-2"
          >
            Back to settings
          </Link>
        }
        className="mb-10"
      />
      <ImportFlow userId={user.id} saveRecordings={profile.save_recordings} />
    </main>
  );
}
