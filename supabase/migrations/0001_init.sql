-- Ghost Mode web — initial schema
-- Every user-owned row carries user_id and is protected by row-level security so each
-- authenticated user can only read/write their own data. Run this in the Supabase SQL editor
-- (or `supabase db push`) against a fresh project.

-- ---------------------------------------------------------------------------
-- profiles: one row per user; app-level settings + the 120-day start date.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  start_date     date        not null default (now() at time zone 'utc')::date,
  theme          text        not null default 'system' check (theme in ('system','light','dark')),
  habit_layout   text        not null default 'blocks' check (habit_layout in ('blocks','minimal')),
  save_recordings boolean     not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- day_records: completion state per day of the 120-day cycle.
-- completed_habit_ids holds habit string ids (e.g. 'water','speaking').
-- ---------------------------------------------------------------------------
create table if not exists public.day_records (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  day_number          int  not null check (day_number between 1 and 120),
  date                date not null,
  completed_habit_ids text[] not null default '{}',
  updated_at          timestamptz not null default now(),
  unique (user_id, day_number)
);
create index if not exists day_records_user_idx on public.day_records (user_id);

-- ---------------------------------------------------------------------------
-- speaking_sessions: one row per completed/attempted speaking session.
-- transcript is always retained; recording_path is set only when audio was
-- uploaded (user's save_recordings on).
-- ---------------------------------------------------------------------------
create table if not exists public.speaking_sessions (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references auth.users (id) on delete cascade,
  day_number              int  not null check (day_number between 1 and 120),
  date                    timestamptz not null,
  stage                   int  not null check (stage between 1 and 4),
  topic                   text not null default '',
  curveballs              text[] not null default '{}',
  target_duration_seconds int  not null default 0,
  actual_duration_seconds int  not null default 0,
  completed_target        boolean not null default false,
  transcript              text not null default '',
  recording_path          text,            -- path in the 'recordings' storage bucket, or null
  legacy_id               text,            -- original app session id, for import de-duplication
  created_at              timestamptz not null default now(),
  unique (user_id, legacy_id)
);
create index if not exists speaking_sessions_user_idx on public.speaking_sessions (user_id, day_number);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.day_records       enable row level security;
alter table public.speaking_sessions enable row level security;

-- profiles: a user sees and edits only their own row.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- generic owner policies for the two data tables
drop policy if exists "day_records_all_own" on public.day_records;
create policy "day_records_all_own" on public.day_records
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "speaking_sessions_all_own" on public.speaking_sessions;
create policy "speaking_sessions_all_own" on public.speaking_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user is created.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Private storage bucket for speaking recordings, scoped per user by path:
--   recordings/<user_id>/<file>
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

drop policy if exists "recordings_read_own" on storage.objects;
create policy "recordings_read_own" on storage.objects
  for select using (
    bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "recordings_insert_own" on storage.objects;
create policy "recordings_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text
  );
drop policy if exists "recordings_delete_own" on storage.objects;
create policy "recordings_delete_own" on storage.objects
  for delete using (
    bucket_id = 'recordings' and (storage.foldername(name))[1] = auth.uid()::text
  );
