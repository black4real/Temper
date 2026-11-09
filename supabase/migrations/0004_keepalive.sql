-- Temper: keepalive. Supabase's free tier pauses a project after 7 days without API traffic.
-- Scheduled jobs (Vercel cron + a GitHub Actions backup) call keepalive_ping() so there is
-- always recent traffic. Invisible to the app: no frontend reads it, no user data touched.
-- Safe to re-run. Run in the Supabase SQL editor after 0001 to 0003.

create table if not exists public.keepalive (
  id     bigserial primary key,
  ts     timestamptz not null default now(),
  source text not null default 'unknown'
);

-- RLS on with no policies: nobody can read or write the table directly through the API.
-- The only way in is the function below.
alter table public.keepalive enable row level security;

-- Records one ping. Because the anon key is public, the function protects itself:
--   * at most one row per 10 minutes, whoever calls, so bursts can't grow the table
--   * keeps only the newest 200 rows
-- The call itself is the API traffic that keeps the project awake, so a skipped insert
-- still does its job.
create or replace function public.keepalive_ping(src text default 'unknown')
returns timestamptz
language plpgsql
security definer set search_path = public
as $$
declare
  last_ts timestamptz;
begin
  select max(ts) into last_ts from public.keepalive;
  if last_ts is null or last_ts < now() - interval '10 minutes' then
    insert into public.keepalive (source) values (left(coalesce(nullif(src, ''), 'unknown'), 32));
  end if;
  delete from public.keepalive
  where id not in (select id from public.keepalive order by id desc limit 200);
  return now();
end;
$$;

revoke all on function public.keepalive_ping(text) from public;
grant execute on function public.keepalive_ping(text) to anon, authenticated;

-- First row, so you can see it working right away.
select public.keepalive_ping('migration');
