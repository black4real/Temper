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
 */
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

/**
 * Returns the current user's profile row, creating a sensible default object if the row
 * is not present yet (the DB trigger normally creates it on sign-up).
 */
export async function getProfile(): Promise<{ user: Awaited<ReturnType<typeof requireUser>>["user"]; profile: Profile }> {
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
}
