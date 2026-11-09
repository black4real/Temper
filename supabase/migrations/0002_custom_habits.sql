-- Ghost Mode web — custom commitments
-- Moves the daily commitments out of the app's source and into per-user rows, so each
-- user can add / rename / reorder / remove their own. The `slug` column matches the ids
-- already stored in day_records.completed_habit_ids, so existing completions keep counting.
-- Run this in the Supabase SQL editor (or `supabase db push`) after 0001_init.sql.

-- ---------------------------------------------------------------------------
-- habits: one row per commitment per user.
-- slug is the stable id referenced by day_records.completed_habit_ids.
-- is_system marks the protected "speaking" habit (editable name, not removable).
-- ---------------------------------------------------------------------------
create table if not exists public.habits (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  slug       text not null,
  position   int  not null default 0,
  title      text not null,
  detail     text not null default '',
  kind       text not null default 'checkbox' check (kind in ('checkbox','link')),
  href       text,
  is_system  boolean not null default false,
  archived   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);
create index if not exists habits_user_position_idx on public.habits (user_id, position);

alter table public.habits enable row level security;

drop policy if exists "habits_all_own" on public.habits;
create policy "habits_all_own" on public.habits
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Seed the default commitments for a given user (idempotent).
-- ---------------------------------------------------------------------------
create or replace function public.seed_default_habits(uid uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.habits (user_id, slug, position, title, detail, kind, href, is_system)
  values
    (uid, 'video_5shot', 0, '5-shot video', 'Cinematography practice', 'checkbox', null,        false),
    (uid, 'python_ai',   1, 'Python / AI',  '1 learning block',        'checkbox', null,        false),
    (uid, 'water',       2, 'Water',        '3–4 L',                   'checkbox', null,        false),
    (uid, 'sleep',       3, 'Sleep',        '8 hours',                 'checkbox', null,        false),
    (uid, 'writing',     4, 'Writing',      '1 page',                  'checkbox', null,        false),
    (uid, 'reading',     5, 'Reading',      '10 pages',                'checkbox', null,        false),
    (uid, 'speaking',    6, 'Speaking',     '5 minutes',               'link',     '/speaking', true),
    (uid, 'storytelling',7, 'Storytelling', '5 minutes',               'checkbox', null,        false)
  on conflict (user_id, slug) do nothing;
end;
$$;

-- Seed for every existing user who has no habits yet.
do $$
declare r record;
begin
  for r in select id from public.profiles loop
    perform public.seed_default_habits(r.id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Extend new-user setup to also seed the default commitments.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  perform public.seed_default_habits(new.id);
  return new;
end;
$$;
