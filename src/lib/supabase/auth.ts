import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  start_date: string;
  theme: "system" | "light" | "dark";
  habit_layout: "blocks" | "minimal";
  save_recordings: boolean;
};

/**
 * Returns the current authenticated user or redirects to /login.
 * Use at the top of protected server components / layouts.
 *
 * Wrapped in React's cache(): the (app) layout and the page both need the user, and without
 * this every page turn verified the session twice. cache() dedupes within one request only,
 * so nothing is shared between requests or users.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  // Verified JWT claims (see the note in lib/supabase/middleware.ts on why getClaims).
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  const user = {
    id: claims.sub as string,
    email: (typeof claims.email === "string" ? claims.email : null) as string | null,
  };
  return { supabase, user };
});

/**
 * Returns the current user's profile row, creating a sensible default object if the row
 * is not present yet (the DB trigger normally creates it on sign-up). Deduped per request
 * like requireUser, so the layout and page share one profile query.
 */
export const getProfile = cache(
  async (): Promise<{ user: Awaited<ReturnType<typeof requireUser>>["user"]; profile: Profile }> => {
    const { supabase, user } = await requireUser();
    const { data } = await supabase
      .from("profiles")
      .select("id, start_date, theme, habit_layout, save_recordings")
      .eq("id", user.id)
      .maybeSingle();

    const profile: Profile =
      (data as Profile | null) ?? {
        id: user.id,
        start_date: new Date().toISOString().slice(0, 10),
        theme: "system",
        habit_layout: "blocks",
        save_recordings: false,
      };

    return { user, profile };
  },
);
