"use server";

/**
 * Gate for new account creation. The expected code is read ONLY from the
 * server-only ACCESS_CODE env var — it is never NEXT_PUBLIC_* (so it is not in
 * the browser bundle) and is never hard-coded here (so it is not in the public
 * commit history). Set ACCESS_CODE in .env.local for local dev and in your
 * hosting env (e.g. Vercel → Settings → Environment Variables) for production.
 *
 * If ACCESS_CODE is unset, signups are blocked rather than silently allowed.
 */
export async function verifyAccessCode(code: string): Promise<{ ok: boolean }> {
  const expected = (process.env.ACCESS_CODE ?? "").trim();
  if (!expected) return { ok: false };
  const given = typeof code === "string" ? code.trim() : "";
  return { ok: given.length > 0 && given === expected };
}
