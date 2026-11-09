// Keepalive: keeps the free-tier Supabase project from pausing after 7 idle days.
// Called daily by Vercel cron (vercel.json) and as a backup by GitHub Actions
// (.github/workflows/supabase-keepalive.yml).
//
// One run makes three independent requests, in parallel, each retried up to 3 times:
//   1. rpc  : keepalive_ping() inserts a row into the hidden keepalive table (migration 0004)
//   2. rest : a plain read through the REST API (RLS returns nothing, but it is real traffic)
//   3. auth : the Auth service health check
// Any one succeeding counts as activity, so a single failing step never breaks the run.
// Only the public anon key is used; the table is unreadable and the ping self-limits.

export const dynamic = "force-dynamic";

type Step = { name: string; ok: boolean; status?: number; attempts: number; error?: string };

async function withRetry(name: string, run: () => Promise<Response>): Promise<Step> {
  let last: Step = { name, ok: false, attempts: 0 };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await run();
      last = { name, ok: res.ok, status: res.status, attempts: attempt };
      if (res.ok) return last;
    } catch (e) {
      last = { name, ok: false, attempts: attempt, error: e instanceof Error ? e.message : String(e) };
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1500));
  }
  return last;
}

export async function GET(request: Request) {
  // Vercel sends "Authorization: Bearer <CRON_SECRET>" to cron jobs when CRON_SECRET is set.
  // If it's set, require it. If not, the endpoint stays open, which is harmless: the ping
  // writes at most one row per 10 minutes and keeps the table at 200 rows.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Response.json({ ok: false, error: "supabase env missing" }, { status: 500 });

  const source = (new URL(request.url).searchParams.get("source") || "vercel-cron").replace(/[^a-z0-9-]/gi, "").slice(0, 32);
  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const timeout = () => AbortSignal.timeout(10_000);

  const steps = await Promise.all([
    withRetry("rpc", () =>
      fetch(`${url}/rest/v1/rpc/keepalive_ping`, {
        method: "POST",
        headers,
        body: JSON.stringify({ src: source }),
        signal: timeout(),
        cache: "no-store",
      }),
    ),
    withRetry("rest", () =>
      fetch(`${url}/rest/v1/keepalive?select=id&limit=1`, { headers, signal: timeout(), cache: "no-store" }),
    ),
    withRetry("auth", () =>
      fetch(`${url}/auth/v1/health`, { headers: { apikey: key }, signal: timeout(), cache: "no-store" }),
    ),
  ]);

  const ok = steps.some((s) => s.ok);
  return Response.json(
    { ok, at: new Date().toISOString(), source, steps },
    { status: ok ? 200 : 502, headers: { "Cache-Control": "no-store" } },
  );
}
