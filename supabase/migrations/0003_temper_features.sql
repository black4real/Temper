-- Temper: schedules, counted commitments, icons, and daily notes.
-- Additive and safe to re-run. Run in the Supabase SQL editor after 0001 and 0002.

-- ---------------------------------------------------------------------------
-- habits: which weekdays a commitment applies to (0 = Sunday … 6 = Saturday),
-- an optional numeric target with a unit (e.g. 4 L), and an icon name.
-- ---------------------------------------------------------------------------
alter table public.habits
  add column if not exists schedule_days smallint[] not null default '{0,1,2,3,4,5,6}';
alter table public.habits
  add column if not exists target int;
alter table public.habits
  add column if not exists unit text;
alter table public.habits
  add column if not exists icon text;

alter table public.habits drop constraint if exists habits_target_range;
alter table public.habits
  add constraint habits_target_range check (target is null or (target between 1 and 999));
alter table public.habits drop constraint if exists habits_unit_len;
alter table public.habits
  add constraint habits_unit_len check (unit is null or char_length(unit) <= 12);
alter table public.habits drop constraint if exists habits_schedule_valid;
alter table public.habits
  add constraint habits_schedule_valid check (
    cardinality(schedule_days) between 1 and 7
    and schedule_days <@ array[0,1,2,3,4,5,6]::smallint[]
  );

-- ---------------------------------------------------------------------------
-- day_records: per-commitment counts for counted commitments, and a one-line note.
-- completed_habit_ids stays the source of truth for "done"; counts sit alongside it.
-- ---------------------------------------------------------------------------
alter table public.day_records
  add column if not exists counts jsonb not null default '{}'::jsonb;
alter table public.day_records
  add column if not exists note text;
alter table public.day_records drop constraint if exists day_records_note_len;
alter table public.day_records
  add constraint day_records_note_len check (note is null or char_length(note) <= 280);

-- ---------------------------------------------------------------------------
-- Existing default rows: give them icons and drop the en dash from the water detail.
-- Only touches rows that still hold the untouched defaults; user edits are left alone.
-- ---------------------------------------------------------------------------
update public.habits set icon = 'clapperboard'   where slug = 'video_5shot'  and icon is null;
update public.habits set icon = 'code'           where slug = 'python_ai'    and icon is null;
update public.habits set icon = 'droplet'        where slug = 'water'        and icon is null;
update public.habits set icon = 'moon'           where slug = 'sleep'        and icon is null;
update public.habits set icon = 'pen-line'       where slug = 'writing'      and icon is null;
update public.habits set icon = 'book-open'      where slug = 'reading'      and icon is null;
update public.habits set icon = 'mic'            where slug = 'speaking'     and icon is null;
update public.habits set icon = 'message-circle' where slug = 'storytelling' and icon is null;
update public.habits set detail = '3 to 4 L' where slug = 'water' and detail = '3–4 L';

-- ---------------------------------------------------------------------------
-- New accounts: defaults with icons, and water / reading as counted commitments.
-- ---------------------------------------------------------------------------
create or replace function public.seed_default_habits(uid uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.habits (user_id, slug, position, title, detail, kind, href, is_system, icon, target, unit)
  values
    (uid, 'video_5shot', 0, '5-shot video', 'Cinematography practice', 'checkbox', null,        false, 'clapperboard',   null, null),
    (uid, 'python_ai',   1, 'Python / AI',  '1 learning block',        'checkbox', null,        false, 'code',           null, null),
    (uid, 'water',       2, 'Water',        '3 to 4 L',                'checkbox', null,        false, 'droplet',        4,    'L'),
    (uid, 'sleep',       3, 'Sleep',        '8 hours',                 'checkbox', null,        false, 'moon',           null, null),
    (uid, 'writing',     4, 'Writing',      '1 page',                  'checkbox', null,        false, 'pen-line',       null, null),
    (uid, 'reading',     5, 'Reading',      '10 pages',                'checkbox', null,        false, 'book-open',      10,   'pages'),
    (uid, 'speaking',    6, 'Speaking',     '5 minutes',               'link',     '/speaking', true,  'mic',            null, null),
    (uid, 'storytelling',7, 'Storytelling', '5 minutes',               'checkbox', null,        false, 'message-circle', null, null)
  on conflict (user_id, slug) do nothing;
end;
$$;
