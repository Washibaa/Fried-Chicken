-- ============================================================
-- RUPP Attendance — COMPLETE SETUP (schema + seed + demo accounts)
-- Paste this ENTIRE file into a NEW Supabase SQL Editor query and Run.
-- Safe to re-run. Generated from schema.sql, seed.sql, demo-accounts.sql.
-- ============================================================

-- ============================================================
-- RUPP Attendance — Supabase backend
--
-- Run this file in the Supabase SQL Editor
-- (Dashboard → SQL Editor → New query → paste → Run).
-- It is safe to run more than once.
--
-- Creates:
--   1. Tables         profiles, classes, students, attendance,
--                     qr_sessions, activity_logs, leave_requests, notifications
--   2. Signup trigger auto-creates a profile row from auth metadata and
--                     auto-links a roster student by matching RUPP email
--   3. Role helpers   app_role(), is_staff() for RLS checks
--   4. RLS policies   students see their own data; staff manage everything;
--                     the activity log is admin-only
--   5. Storage        leave-documents bucket (public read, 5 MB,
--                     PDF/JPG/PNG) for leave request uploads
--   5b. Storage       avatars bucket (public read, 2 MB, JPEG/PNG/WebP)
--                     for profile pictures
-- ============================================================


-- ============================================================
-- 1. Tables
-- ============================================================

create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  -- The EFFECTIVE role, and the only one RLS consults. A new account is always
  -- 'user' until an admin approves it — see requested_role below.
  role                text not null default 'user' check (role in ('admin', 'teacher', 'user')),
  -- Approval gate. A self-registered account starts 'pending' and can't use
  -- the app until an admin / Head of Dept approves it.
  status              text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  -- What the person asked to be at signup. Only copied into `role` on approval,
  -- so picking "Admin" on the register form grants nothing by itself.
  requested_role      text,
  approved_at         timestamptz,
  approved_by         uuid references auth.users (id) on delete set null,
  full_name           text,
  -- Mirror of auth.users.email, kept current by handle_new_user. auth.users
  -- isn't reachable over PostgREST, so the admin screens need it here to tell
  -- two staff members with the same display name apart.
  email               text,
  phone               text,
  -- Public URL of the uploaded profile picture (avatars bucket, section 5b).
  -- Null means fall back to the role's default photo, then to the initial.
  avatar_url          text,
  email_notifications boolean not null default true,
  created_at          timestamptz not null default now()
);

create table if not exists public.classes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  department text not null,
  created_at timestamptz not null default now()
);

-- Which classes each teacher is responsible for. A teacher only sees the
-- classes listed here (and the students, attendance and leave requests that
-- belong to them), so one teacher's roster doesn't bury another's. Admins /
-- Head of Dept are never restricted and manage the rows in this table.
--
-- A teacher with no rows here sees nothing until an admin assigns them a
-- class — deliberately, so a newly registered teacher can't read the whole
-- department by default.
create table if not exists public.teacher_classes (
  teacher_id uuid not null references auth.users (id) on delete cascade,
  class_id   uuid not null references public.classes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (teacher_id, class_id)
);

create table if not exists public.students (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  student_id  text not null unique,
  roll_number text not null,
  initials    text not null,
  email       text,
  user_id     uuid references auth.users (id) on delete set null,
  class_id    uuid references public.classes (id) on delete set null,
  -- A student flagged here is their class's monitor: they can approve the
  -- short (1-day) leave requests routed to a monitor for their own class.
  is_monitor  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- An academic term. Attendance is tagged with the semester it was taken in,
-- so starting a new term archives the old one instead of erasing it: students
-- keep seeing last semester's history and admins can still report on it.
create table if not exists public.semesters (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  start_date date not null,
  end_date   date,
  is_active  boolean not null default false,
  created_at timestamptz not null default now()
);

-- Only one active semester — new attendance is tagged with whichever it is.
create unique index if not exists semesters_one_active_idx
  on public.semesters (is_active) where is_active;

-- A subject taught to one class by one teacher. Attendance is recorded per
-- subject, so a student can be Present for one subject and Absent for another
-- on the same day, and can see a separate percentage for each teacher.
create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  class_id   uuid not null references public.classes (id) on delete cascade,
  teacher_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

create table if not exists public.attendance (
  id             uuid primary key default gen_random_uuid(),
  student_id     uuid not null references public.students (id) on delete cascade,
  subject_id     uuid references public.subjects (id) on delete cascade,
  semester_id    uuid references public.semesters (id) on delete cascade,
  date           date not null,
  status         text not null check (status in ('Present', 'Late', 'Absent')),
  check_in_time  text,
  check_out_time text,
  method         text check (method in ('QR', 'Manual')),
  created_at     timestamptz not null default now(),
  -- The app upserts on this triple (QR check-in and manual marking)
  unique (student_id, date, subject_id)
);

create table if not exists public.qr_sessions (
  id         uuid primary key default gen_random_uuid(),
  code       text not null,
  date       date not null default current_date,
  created_at timestamptz not null default now(),
  -- Check-in looks a code up with .maybeSingle(), so (code, date) must be unique
  unique (code, date)
);

create table if not exists public.activity_logs (
  id         bigint generated always as identity primary key,
  message    text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.leave_requests (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text,
  reason       text not null,
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  start_date   date not null,
  end_date     date not null,
  routed_to    text check (routed_to in ('teacher', 'admin', 'monitor')),
  document_url text,
  created_at   timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists public.notifications (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  message    text not null,
  read       boolean not null default false,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Upgrade path: tables left over from an older version of the app are
-- skipped by "create table if not exists" above, so bring them up to the
-- shape the app expects here. Every statement is a no-op on fresh tables.
-- ------------------------------------------------------------

-- The approval gate must not lock out accounts that already exist. Adding the
-- column with default 'approved' backfills every current row as approved; the
-- default is only then switched to 'pending' so accounts created from here on
-- need approving. "add column if not exists" makes the pair a no-op on re-run,
-- and on a fresh database the create table above already used 'pending'.
alter table public.profiles add column if not exists status text not null default 'approved';
alter table public.profiles alter column status set default 'pending';

alter table public.profiles drop constraint if exists profiles_status_check;
alter table public.profiles
  add constraint profiles_status_check check (status in ('pending', 'approved', 'rejected'));

alter table public.profiles
  add column if not exists role                text not null default 'user',
  add column if not exists requested_role      text,
  add column if not exists approved_at         timestamptz,
  add column if not exists approved_by         uuid references auth.users (id) on delete set null,
  add column if not exists full_name           text,
  add column if not exists email               text,
  add column if not exists phone               text,
  add column if not exists avatar_url          text,
  add column if not exists email_notifications boolean not null default true,
  add column if not exists created_at          timestamptz not null default now();

-- The class monitor is a student flagged in the students table, not a separate
-- account role. Fold any leftover 'monitor' profiles from an earlier build back
-- into the student role and drop the old profiles.class_id before refreshing
-- the check constraint. All no-ops on a fresh or already-current database.
update public.profiles set role = 'user' where role = 'monitor';
alter table public.profiles drop constraint if exists profiles_class_id_fkey;
alter table public.profiles drop column if exists class_id;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin', 'teacher', 'user'));

-- A 1-day leave is still routed with the label 'monitor'; keep it valid.
alter table public.leave_requests drop constraint if exists leave_requests_routed_to_check;
alter table public.leave_requests
  add constraint leave_requests_routed_to_check
  check (routed_to is null or routed_to in ('teacher', 'admin', 'monitor'));

alter table public.classes
  add column if not exists department text,
  add column if not exists created_at timestamptz not null default now();

alter table public.students
  add column if not exists roll_number text,
  add column if not exists initials    text,
  add column if not exists email       text,
  add column if not exists user_id     uuid references auth.users (id) on delete set null,
  add column if not exists class_id    uuid references public.classes (id) on delete set null,
  add column if not exists is_monitor  boolean not null default false,
  add column if not exists created_at  timestamptz not null default now();

alter table public.attendance
  add column if not exists subject_id     uuid references public.subjects (id) on delete cascade,
  add column if not exists semester_id    uuid references public.semesters (id) on delete cascade,
  add column if not exists check_in_time  text,
  add column if not exists check_out_time text,
  add column if not exists method         text,
  add column if not exists created_at     timestamptz not null default now();

-- A QR code is issued for one subject's session, so scanning it records
-- attendance against that subject rather than "the day" in general.
alter table public.qr_sessions
  add column if not exists subject_id uuid references public.subjects (id) on delete cascade,
  add column if not exists date       date not null default current_date,
  add column if not exists created_at timestamptz not null default now();

-- ------------------------------------------------------------
-- Upgrade path for attendance that predates semesters and subjects.
--
-- Rows recorded before this change have no subject or semester. They can't
-- simply be dropped (that's a student's history), and the new
-- unique(student_id, date, subject_id) can't enforce anything while
-- subject_id is null — nulls always compare distinct. So: give every class a
-- catch-all subject, adopt the orphaned rows into it, then swap constraints.
--
-- Every statement is a no-op on a fresh database, where attendance is empty.
-- ------------------------------------------------------------

-- A semester to hold the pre-existing history. Named for the year it started
-- so it reads sensibly next to semesters created later from the UI.
-- Note the WHERE sits on a FROM-less SELECT: an aggregate over a filtered
-- table still returns one row, which would insert a duplicate on re-run.
insert into public.semesters (name, start_date, is_active)
select
  'Semester 1 · ' || to_char(coalesce((select min(date) from public.attendance), current_date), 'YYYY'),
  coalesce((select min(date) from public.attendance), current_date),
  true
where not exists (select 1 from public.semesters)
on conflict (name) do nothing;

-- One catch-all subject per class that actually has orphaned attendance,
-- taught by that class's assigned teacher when there is exactly one.
insert into public.subjects (name, class_id, teacher_id)
select
  'General',
  c.id,
  (select tc.teacher_id from public.teacher_classes tc
   where tc.class_id = c.id order by tc.created_at limit 1)
from public.classes c
where exists (
  select 1 from public.attendance a
  join public.students s on s.id = a.student_id
  where s.class_id = c.id and a.subject_id is null
)
on conflict (class_id, name) do nothing;

update public.attendance a
  set subject_id = sub.id
  from public.students s
  join public.subjects sub on sub.class_id = s.class_id and sub.name = 'General'
  where a.student_id = s.id and a.subject_id is null;

update public.attendance
  set semester_id = (select id from public.semesters order by is_active desc, start_date limit 1)
  where semester_id is null;

-- Now that every row carries a subject, replace the old per-day constraint.
alter table public.attendance drop constraint if exists attendance_student_id_date_key;
do $$
begin
  alter table public.attendance
    add constraint attendance_student_id_date_subject_id_key
    unique (student_id, date, subject_id);
exception
  when duplicate_table then null;  -- already added by a previous run
  when duplicate_object then null;
end $$;

alter table public.activity_logs
  add column if not exists created_at timestamptz not null default now();

alter table public.leave_requests
  add column if not exists user_id      uuid references auth.users (id) on delete cascade,
  add column if not exists name         text,
  add column if not exists status       text not null default 'pending',
  add column if not exists start_date   date,
  add column if not exists end_date     date,
  add column if not exists routed_to    text,
  add column if not exists document_url text,
  add column if not exists created_at   timestamptz not null default now();

alter table public.notifications
  add column if not exists user_id    uuid references auth.users (id) on delete cascade,
  add column if not exists message    text,
  add column if not exists read       boolean not null default false,
  add column if not exists created_at timestamptz not null default now();

-- A legacy profiles table used a custom enum for role (public.user_role);
-- the app and the RLS helpers expect plain text, so convert it. Also runs
-- harmlessly when the column is already text.
do $$
begin
  alter table public.profiles alter column role drop default;
  alter table public.profiles alter column role type text using role::text;
  alter table public.profiles alter column role set default 'user';
exception
  when undefined_column then null;
end $$;

-- Same conversion for a legacy enum leave_requests.status.
do $$
begin
  alter table public.leave_requests alter column status drop default;
  alter table public.leave_requests alter column status type text using status::text;
  alter table public.leave_requests alter column status set default 'pending';
exception
  when undefined_column then null;
end $$;

-- Legacy tables may carry extra required (NOT NULL) columns the app never
-- fills — e.g. profiles.email, leave_requests.date. Relax every such column
-- so inserts can't be blocked; columns the app does fill stay required.
-- No-op on fresh tables (their not-null columns all have values or defaults).
do $$
declare
  col record;
begin
  for col in
    select table_name, column_name
    from information_schema.columns
    where table_schema = 'public'
      and (
        (table_name = 'profiles'       and column_name not in ('id', 'role'))
        or
        (table_name = 'leave_requests' and column_name not in ('id', 'user_id', 'reason', 'status', 'start_date', 'end_date'))
      )
      and is_nullable = 'NO'
      and column_default is null
      and is_identity = 'NO'
      and is_generated = 'NEVER'
  loop
    execute format('alter table public.%I alter column %I drop not null', col.table_name, col.column_name);
  end loop;
end $$;

-- Backfill profiles.email for accounts created before the column was mirrored
-- (the signup trigger fills it going forward). No-op once every row matches.
update public.profiles p
  set email = u.email
  from auth.users u
  where u.id = p.id
    and p.email is distinct from u.email;

-- demo-accounts.sql upserts profiles on id — make sure a legacy profiles
-- table actually has its primary key.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and contype = 'p'
  ) then
    alter table public.profiles add primary key (id);
  end if;
end $$;

-- Make sure the API roles can reach every table (tables created outside the
-- dashboard can miss these grants — row access is still controlled by RLS).
grant usage on schema public to anon, authenticated, service_role;
grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;

create index if not exists teacher_classes_class_idx   on public.teacher_classes (class_id);
create index if not exists subjects_class_idx          on public.subjects (class_id);
create index if not exists subjects_teacher_idx        on public.subjects (teacher_id);
create index if not exists attendance_subject_idx      on public.attendance (subject_id);
create index if not exists attendance_semester_idx     on public.attendance (semester_id);
create index if not exists students_class_id_idx      on public.students (class_id);
create index if not exists students_user_id_idx       on public.students (user_id);
create index if not exists attendance_date_idx        on public.attendance (date);
create index if not exists attendance_student_id_idx  on public.attendance (student_id);
create index if not exists leave_requests_status_idx  on public.leave_requests (status);
create index if not exists leave_requests_user_id_idx on public.leave_requests (user_id);
create index if not exists notifications_user_idx     on public.notifications (user_id, read);
create index if not exists activity_logs_created_idx  on public.activity_logs (created_at desc);


-- ============================================================
-- 2. Signup trigger
--
-- The register page can only insert the profile row itself when email
-- confirmation is disabled (it needs a session). This trigger covers both
-- flows: every new auth user gets a profile built from their signup
-- metadata, and if their email matches an unlinked roster student the
-- account is linked automatically for QR check-in / personal history.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta_role text := new.raw_user_meta_data ->> 'role';
begin
  if meta_role is null or meta_role not in ('admin', 'teacher', 'user') then
    meta_role := 'user';
  end if;

  -- Never let profile bookkeeping abort the signup itself — the app can
  -- fall back to auth metadata if this fails.
  begin
    -- The role picked on the register form is recorded as a REQUEST only.
    -- The effective role stays 'user' and status stays 'pending' until an
    -- admin approves, so choosing "Admin / Head of Dept" grants nothing.
    insert into public.profiles (id, role, status, requested_role, full_name, email)
    values (new.id, 'user', 'pending', meta_role, new.raw_user_meta_data ->> 'full_name', new.email)
    on conflict (id) do update
      set requested_role = coalesce(excluded.requested_role, public.profiles.requested_role),
          full_name      = coalesce(excluded.full_name, public.profiles.full_name),
          email          = coalesce(excluded.email, public.profiles.email);

    update public.students
      set user_id = new.id
      where user_id is null
        and email is not null
        and lower(email) = lower(new.email);
  exception
    when others then
      raise warning 'handle_new_user skipped for %: %', new.email, sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ============================================================
-- 3. Role helpers for RLS
--
-- security definer lets these read profiles without tripping RLS.
-- Falls back to the JWT metadata role for accounts that registered
-- before this schema existed.
-- ============================================================

-- The effective role of the signed-in user, and the single source of truth for
-- every RLS check below.
--
-- An account that isn't approved reports 'pending', which matches no policy —
-- so an unapproved user can't read or write anything through RLS regardless of
-- what the UI does. No profile row reports 'pending' too, failing closed.
--
-- Note there is deliberately no fallback to the JWT's user_metadata role: that
-- value is chosen by the person registering, so trusting it would hand out
-- admin to anyone who asked for it.
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select case when status = 'approved' then role::text else 'pending' end
     from public.profiles where id = auth.uid()),
    'pending'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.app_role() in ('admin', 'teacher');
$$;

-- ------------------------------------------------------------
-- Privilege protection on profiles
--
-- "update own profile" has to stay open so people can edit their own name,
-- phone and picture — but that same policy would otherwise let anyone set
-- their own role to 'admin' or flip their own status to 'approved'. RLS can't
-- express "any column except these", so a trigger silently restores the
-- privileged columns instead.
--
-- Silently reverting rather than raising keeps the ordinary profile save
-- working; the user simply can't move those fields.
-- ------------------------------------------------------------
create or replace function public.protect_profile_privileges()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Server-side callers — the SQL editor, service_role, and the signup
  -- trigger — carry no JWT and so have no auth.uid(). They are trusted to set
  -- these columns directly.
  --
  -- Do NOT test current_user here: this function is security definer, so
  -- current_user is its owner (postgres) for every caller, which would make
  -- the whole check a no-op.
  if auth.uid() is null then
    return new;
  end if;

  if public.app_role() = 'admin' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role   := 'user';
    new.status := 'pending';
    return new;
  end if;

  new.role           := old.role;
  new.status         := old.status;
  new.requested_role := old.requested_role;
  new.approved_at    := old.approved_at;
  new.approved_by    := old.approved_by;
  return new;
end;
$$;

drop trigger if exists profiles_protect_privileges on public.profiles;
create trigger profiles_protect_privileges
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileges();


-- True when the signed-in user is a student flagged as their class's monitor.
create or replace function public.is_class_monitor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.students
    where user_id = auth.uid() and is_monitor
  );
$$;

-- The class the signed-in monitor oversees (null when they aren't a monitor).
create or replace function public.my_monitor_class()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select class_id from public.students
  where user_id = auth.uid() and is_monitor
  limit 1;
$$;

-- True when target_user is a fellow student in the signed-in monitor's class
-- (and isn't the monitor themselves — a monitor can't approve their own leave).
-- security definer so the check bypasses students RLS inside leave policies.
create or replace function public.can_monitor_leave(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.students me
    join public.students them on them.class_id = me.class_id
    where me.user_id = auth.uid()
      and me.is_monitor
      and them.user_id = target_user
      and them.user_id <> auth.uid()
  );
$$;

-- The semester new attendance belongs to. Null only if no semester is active,
-- which the Semesters page prevents.
create or replace function public.active_semester()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.semesters where is_active limit 1;
$$;

-- Stamp the active semester onto every new attendance row, so no caller has
-- to remember to. Keeps a client that predates semesters correct too.
create or replace function public.set_attendance_semester()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.semester_id is null then
    new.semester_id := public.active_semester();
  end if;
  return new;
end;
$$;

drop trigger if exists attendance_set_semester on public.attendance;
create trigger attendance_set_semester
  before insert on public.attendance
  for each row execute function public.set_attendance_semester();

-- ------------------------------------------------------------
-- Class scoping for staff
--
-- Admins / Head of Dept see everything. A teacher sees only the classes
-- assigned to them in teacher_classes. Students never satisfy these — their
-- own access comes from the separate "own row" policies further down.
-- ------------------------------------------------------------

-- May the signed-in staff member work with this class?
-- target_class is null for roster rows that aren't in a class yet: admins
-- still see those, teachers don't.
create or replace function public.staff_can_access_class(target_class uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.app_role()
    when 'admin' then true
    when 'teacher' then exists (
      select 1 from public.teacher_classes tc
      where tc.teacher_id = auth.uid()
        and tc.class_id = target_class
    )
    else false
  end;
$$;

-- Same question for a leave request, which points at a user rather than a
-- class: resolve the requester's roster row to find their class.
create or replace function public.staff_can_access_leave(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.app_role()
    when 'admin' then true
    when 'teacher' then exists (
      select 1
      from public.students s
      join public.teacher_classes tc on tc.class_id = s.class_id
      where s.user_id = target_user
        and tc.teacher_id = auth.uid()
    )
    else false
  end;
$$;

-- Old helpers from the standalone-monitor-role build, no longer referenced.
drop function if exists public.app_class_id();
drop function if exists public.leave_in_my_class(uuid);

grant execute on function
  public.app_role(), public.is_staff(),
  public.is_class_monitor(), public.my_monitor_class(), public.can_monitor_leave(uuid),
  public.staff_can_access_class(uuid), public.staff_can_access_leave(uuid),
  public.active_semester()
  to authenticated;


-- ============================================================
-- 4. Row Level Security
-- ============================================================

alter table public.profiles        enable row level security;
alter table public.classes         enable row level security;
alter table public.teacher_classes enable row level security;
alter table public.semesters       enable row level security;
alter table public.subjects        enable row level security;
alter table public.students       enable row level security;
alter table public.attendance     enable row level security;
alter table public.qr_sessions    enable row level security;
alter table public.activity_logs  enable row level security;
alter table public.leave_requests enable row level security;
alter table public.notifications  enable row level security;

-- profiles: the app only ever reads/writes the signed-in user's own row
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated
  using (id = auth.uid());

-- Admins additionally read every profile, so the Teachers page can list the
-- staff it assigns classes to. Still read-only: the update policy below is
-- unchanged, so an admin can't edit someone else's row (or their role) here.
drop policy if exists "admins read all profiles" on public.profiles;
create policy "admins read all profiles" on public.profiles
  for select to authenticated
  using (public.app_role() = 'admin');

drop policy if exists "insert own profile" on public.profiles;
create policy "insert own profile" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

-- Safe because protect_profile_privileges() reverts any attempt to change
-- role, status or requested_role from an ordinary account.
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Admins approve or reject accounts, which means writing someone else's row.
drop policy if exists "admins update any profile" on public.profiles;
create policy "admins update any profile" on public.profiles
  for update to authenticated
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- classes: admins and students browse them all (a student needs their own
-- class name, and the monitor screen looks its class up by id); a teacher
-- sees only the classes assigned to them. Only admins manage them.
--
-- Listed positively rather than as "not a teacher": app_role() returns
-- 'pending' for an unapproved account, and a negative test would let those
-- through.
drop policy if exists "classes readable by authenticated" on public.classes;
create policy "classes readable by authenticated" on public.classes
  for select to authenticated
  using (
    public.app_role() in ('admin', 'user')
    or public.staff_can_access_class(id)
  );

drop policy if exists "admins manage classes" on public.classes;
create policy "admins manage classes" on public.classes
  for all to authenticated
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- teacher_classes: admins assign; a teacher may read their own assignments
-- (so the app can tell them which classes they hold) but never change them.
drop policy if exists "admins manage teacher classes" on public.teacher_classes;
create policy "admins manage teacher classes" on public.teacher_classes
  for all to authenticated
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

drop policy if exists "teachers read own classes" on public.teacher_classes;
create policy "teachers read own classes" on public.teacher_classes
  for select to authenticated
  using (teacher_id = auth.uid());

-- semesters: everyone reads them (a student picks which term to view); only
-- admins start, rename, or delete one
drop policy if exists "semesters readable by authenticated" on public.semesters;
create policy "semesters readable by authenticated" on public.semesters
  for select to authenticated
  using (true);

drop policy if exists "admins manage semesters" on public.semesters;
create policy "admins manage semesters" on public.semesters
  for all to authenticated
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- subjects: staff see the subjects of classes they can access, a student sees
-- the subjects of their own class. Only admins create or remove them.
drop policy if exists "read subjects" on public.subjects;
create policy "read subjects" on public.subjects
  for select to authenticated
  using (
    public.staff_can_access_class(class_id)
    or exists (
      select 1 from public.students s
      where s.user_id = auth.uid() and s.class_id = subjects.class_id
    )
  );

drop policy if exists "admins manage subjects" on public.subjects;
create policy "admins manage subjects" on public.subjects
  for all to authenticated
  using (public.app_role() = 'admin')
  with check (public.app_role() = 'admin');

-- A student needs the NAME of whoever teaches each of their subjects, but
-- profiles is deliberately not readable to them (it also holds phone numbers
-- and emails). This view exposes just the name, and repeats the subjects
-- visibility rule in its WHERE so it can't be used to enumerate other classes.
--
-- Runs with the owner's rights (security_invoker defaults off), which is what
-- lets it read profiles at all — hence the explicit filter.
create or replace view public.subject_teachers as
  select
    sub.id       as subject_id,
    sub.name     as subject_name,
    sub.class_id as class_id,
    sub.teacher_id,
    p.full_name  as teacher_name
  from public.subjects sub
  left join public.profiles p on p.id = sub.teacher_id
  where
    public.staff_can_access_class(sub.class_id)
    or exists (
      select 1 from public.students s
      where s.user_id = auth.uid() and s.class_id = sub.class_id
    );

grant select on public.subject_teachers to authenticated;

-- students: admins see the whole roster, a teacher sees only their assigned
-- classes, and a student sees their own linked row
drop policy if exists "staff or own student row" on public.students;
create policy "staff or own student row" on public.students
  for select to authenticated
  using (public.staff_can_access_class(class_id) or user_id = auth.uid());

-- teachers and admins may UPDATE roster rows (e.g. appoint a class monitor),
-- a teacher only within their own classes
drop policy if exists "staff manage students" on public.students;
drop policy if exists "staff update students" on public.students;
create policy "staff update students" on public.students
  for update to authenticated
  using (public.staff_can_access_class(class_id))
  with check (public.staff_can_access_class(class_id));

-- only admins / head of department may ADD or REMOVE students
drop policy if exists "admin insert students" on public.students;
create policy "admin insert students" on public.students
  for insert to authenticated
  with check (public.app_role() = 'admin');

drop policy if exists "admin delete students" on public.students;
create policy "admin delete students" on public.students
  for delete to authenticated
  using (public.app_role() = 'admin');

-- a Class Monitor can read the roster of the class they oversee
drop policy if exists "monitor reads own class roster" on public.students;
create policy "monitor reads own class roster" on public.students
  for select to authenticated
  using (public.is_class_monitor() and class_id = public.my_monitor_class());

-- attendance: staff mark anyone; students read + upsert their own via QR check-in
drop policy if exists "read attendance" on public.attendance;
create policy "read attendance" on public.attendance
  for select to authenticated
  using (
    exists (
      select 1 from public.students s
      where s.id = attendance.student_id
        and (public.staff_can_access_class(s.class_id) or s.user_id = auth.uid())
    )
  );

drop policy if exists "insert attendance" on public.attendance;
create policy "insert attendance" on public.attendance
  for insert to authenticated
  with check (
    exists (
      select 1 from public.students s
      where s.id = attendance.student_id
        and (public.staff_can_access_class(s.class_id) or s.user_id = auth.uid())
    )
  );

drop policy if exists "update attendance" on public.attendance;
create policy "update attendance" on public.attendance
  for update to authenticated
  using (
    exists (
      select 1 from public.students s
      where s.id = attendance.student_id
        and (public.staff_can_access_class(s.class_id) or s.user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.students s
      where s.id = attendance.student_id
        and (public.staff_can_access_class(s.class_id) or s.user_id = auth.uid())
    )
  );

drop policy if exists "staff delete attendance" on public.attendance;
create policy "staff delete attendance" on public.attendance
  for delete to authenticated
  using (
    exists (
      select 1 from public.students s
      where s.id = attendance.student_id
        and public.staff_can_access_class(s.class_id)
    )
  );

-- qr_sessions: teachers generate codes; students read them to validate check-in
drop policy if exists "qr codes readable by authenticated" on public.qr_sessions;
create policy "qr codes readable by authenticated" on public.qr_sessions
  for select to authenticated
  using (true);

drop policy if exists "staff create qr codes" on public.qr_sessions;
create policy "staff create qr codes" on public.qr_sessions
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists "staff delete qr codes" on public.qr_sessions;
create policy "staff delete qr codes" on public.qr_sessions
  for delete to authenticated
  using (public.is_staff());

-- activity_logs: every signed-in user writes log lines; only admins read them
drop policy if exists "admins read activity log" on public.activity_logs;
create policy "admins read activity log" on public.activity_logs
  for select to authenticated
  using (public.app_role() = 'admin');

drop policy if exists "authenticated write activity log" on public.activity_logs;
create policy "authenticated write activity log" on public.activity_logs
  for insert to authenticated
  with check (true);

-- leave_requests: students submit and track their own; staff review and decide;
-- a Class Monitor reviews the short requests routed to them for their own class
drop policy if exists "read leave requests" on public.leave_requests;
create policy "read leave requests" on public.leave_requests
  for select to authenticated
  using (user_id = auth.uid() or public.staff_can_access_leave(user_id));

drop policy if exists "monitor reads class leave" on public.leave_requests;
create policy "monitor reads class leave" on public.leave_requests
  for select to authenticated
  using (routed_to = 'monitor' and public.can_monitor_leave(user_id));

drop policy if exists "students submit own leave" on public.leave_requests;
create policy "students submit own leave" on public.leave_requests
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "staff decide leave" on public.leave_requests;
create policy "staff decide leave" on public.leave_requests
  for update to authenticated
  using (public.staff_can_access_leave(user_id))
  with check (public.staff_can_access_leave(user_id));

drop policy if exists "monitor decides class leave" on public.leave_requests;
create policy "monitor decides class leave" on public.leave_requests
  for update to authenticated
  using (routed_to = 'monitor' and public.can_monitor_leave(user_id))
  with check (routed_to = 'monitor' and public.can_monitor_leave(user_id));

drop policy if exists "staff delete leave" on public.leave_requests;
create policy "staff delete leave" on public.leave_requests
  for delete to authenticated
  using (public.staff_can_access_leave(user_id));

-- notifications: staff notify students of decisions; students read/dismiss their own
drop policy if exists "read own notifications" on public.notifications;
create policy "read own notifications" on public.notifications
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "staff send notifications" on public.notifications;
create policy "staff send notifications" on public.notifications
  for insert to authenticated
  with check (public.is_staff());

drop policy if exists "dismiss own notifications" on public.notifications;
create policy "dismiss own notifications" on public.notifications
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ============================================================
-- 4b. Leave-decision notifications (SRS 3.1.5)
--
-- When a leave request is approved or rejected, notify the student — but
-- only if they've kept notifications on (profiles.email_notifications).
-- Running this in a trigger (security definer) means the decision maker —
-- teacher, admin, or class monitor — doesn't need read access to the
-- student's preference, and every approval path is covered by one rule.
-- ============================================================

create or replace function public.notify_on_leave_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wants_notice boolean;
  when_label   text;
begin
  -- Only fire when the decision actually changes to approved/rejected
  if new.status is not distinct from old.status then
    return new;
  end if;
  if new.status not in ('approved', 'rejected') then
    return new;
  end if;

  -- Respect the student's notification preference (defaults to on)
  select coalesce(email_notifications, true)
    into wants_notice
    from public.profiles
    where id = new.user_id;

  if wants_notice is false then
    return new;
  end if;

  if new.start_date = new.end_date then
    when_label := to_char(new.start_date, 'FMMon FMDD');
  else
    when_label := to_char(new.start_date, 'FMMon FMDD') || ' – ' || to_char(new.end_date, 'FMMon FMDD');
  end if;

  insert into public.notifications (user_id, message)
  values (
    new.user_id,
    'Your leave request for ' || when_label || ' was ' ||
      case new.status when 'approved' then 'approved' else 'declined' end || '.'
  );

  return new;
end;
$$;

drop trigger if exists on_leave_decided on public.leave_requests;
create trigger on_leave_decided
  after update on public.leave_requests
  for each row execute function public.notify_on_leave_decision();


-- ============================================================
-- 5. Storage — leave request documents
--
-- Public read (the app stores getPublicUrl results), uploads limited to
-- 5 MB PDF/JPG/PNG into a folder named after the uploader's user id.
--
-- If the policy statements below fail with "must be owner of table
-- objects", create the same two policies in Dashboard → Storage →
-- leave-documents → Policies instead.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'leave-documents',
  'leave-documents',
  true,
  5242880, -- 5 MB, matching the UI limit
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  drop policy if exists "leave documents are publicly readable" on storage.objects;
  create policy "leave documents are publicly readable" on storage.objects
    for select
    using (bucket_id = 'leave-documents');

  drop policy if exists "users upload own leave documents" on storage.objects;
  create policy "users upload own leave documents" on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'leave-documents'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception
  when insufficient_privilege then
    raise notice 'Storage policies skipped — add them in Dashboard → Storage → leave-documents → Policies';
end $$;


-- ============================================================
-- 5b. Storage — profile pictures
--
-- Public read (profiles.avatar_url stores a getPublicUrl result), uploads
-- limited to 2 MB JPEG/PNG/WebP into a folder named after the owner's user
-- id. The client downscales to a 512px square before uploading, so real
-- files land far under the limit.
--
-- Users may replace and delete their own picture, hence the update/delete
-- policies that leave-documents doesn't need.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  drop policy if exists "avatars are publicly readable" on storage.objects;
  create policy "avatars are publicly readable" on storage.objects
    for select
    using (bucket_id = 'avatars');

  drop policy if exists "users upload own avatar" on storage.objects;
  create policy "users upload own avatar" on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );

  drop policy if exists "users replace own avatar" on storage.objects;
  create policy "users replace own avatar" on storage.objects
    for update to authenticated
    using (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );

  drop policy if exists "users delete own avatar" on storage.objects;
  create policy "users delete own avatar" on storage.objects
    for delete to authenticated
    using (
      bucket_id = 'avatars'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
exception
  when insufficient_privilege then
    raise notice 'Storage policies skipped — add them in Dashboard → Storage → avatars → Policies';
end $$;


-- ============================================================
-- RUPP Attendance — demo seed data
--
-- Run AFTER schema.sql, in the Supabase SQL Editor.
-- Safe to re-run: existing classes/students/attendance are kept.
--
-- Seeds 3 classes, an 11-student roster, and two weeks of weekday
-- attendance history so the dashboard, roster, and analytics have
-- data on first login.
-- ============================================================

insert into public.classes (name, department) values
  ('Class M1', 'DSE'),
  ('Class M2', 'DSE'),
  ('Class E1', 'ITE')
on conflict (name) do nothing;

-- student_id is a human-readable code: class name (no space) + enrollment
-- year + 2-digit roll number in the class, e.g. Class M1 / 2025 / roll 01 = M1202501.
insert into public.students (name, student_id, roll_number, initials, email, class_id)
select v.name, v.sid, v.roll, v.initials, v.email, c.id
from (values
  -- Class M1 — the real group (linked to real login accounts)
  ('Ty Kimhong',                  'M1202501', '01', 'TK', 'kimhong.ty.3624@rupp.edu.kh',                'Class M1'),
  ('Thypheap Sachak Ponleu Pragna', 'M1202502', '02', 'TS', 'sachakponleupragna.thypheap.3624@rupp.edu.kh', 'Class M1'),
  ('Tith Annchhengly',            'M1202503', '03', 'TA', 'annchhengly.tith.3624@rupp.edu.kh',          'Class M1'),
  ('Leang Serminh',               'M1202504', '04', 'LS', 'serminh.leang.3624@rupp.edu.kh',             'Class M1'),
  ('Pa Soborith',                 'M1202505', '05', 'PS', 'soborith.pa.3624@rupp.edu.kh',               'Class M1'),
  -- Class M2 and E1 examples — each one also has a login account,
  -- so you can sign in as them to demo a second and third class
  -- (see demo-accounts.sql for the passwords).
  ('Tep Piseth',     'M2202501', '01', 'TP', 'piseth.heng@rupp.edu.kh',    'Class M2'),
  ('Mann Vannda',    'M2202502', '02', 'MV', 'chanthy.noun@rupp.edu.kh',   'Class M2'),
  ('G Devid',        'M2202503', '03', 'GD', 'sophea.meas@rupp.edu.kh',    'Class M2'),
  ('Spike Dog',      'E1202501', '01', 'SD', 'spike.dog@rupp.edu.kh',      'Class E1'),
  ('Jerry Mouse',    'E1202502', '02', 'JM', 'jerry.mouse@rupp.edu.kh',    'Class E1'),
  ('Tom Cat',        'E1202503', '03', 'TC', 'tom.cat@rupp.edu.kh',        'Class E1')
) as v(name, sid, roll, initials, email, class_name)
join public.classes c on c.name = v.class_name
on conflict (student_id) do nothing;

-- Appoint the Class M1 monitor: Thypheap Sachak Ponleu Pragna is a normal student
-- (QR check-in, own leave, ID card) who can ALSO approve the 1-day leave requests
-- routed to a monitor for Class M1. To appoint a different class monitor, set
-- is_monitor on that student's row (only one monitor per class is expected).
update public.students set is_monitor = (student_id = 'M1202502')
where class_id = (select id from public.classes where name = 'Class M1');

-- ------------------------------------------------------------
-- Assign classes to teachers.
--
-- A teacher only sees the classes listed in teacher_classes, so splitting
-- them here means neither teacher is buried in the other's roster. Admins /
-- Head of Dept always see every class and manage these rows from the
-- Teachers page.
--
-- Runs only for accounts that already exist, and re-running is a no-op.
-- ------------------------------------------------------------
-- Veng Sotheara also teaches one subject to Class M1, so an M1 student has two
-- different teachers to compare — that's the point of per-subject attendance.
insert into public.teacher_classes (teacher_id, class_id)
select u.id, c.id
from (values
  ('theara.toem@rupp.edu.kh', 'Class M1'),
  ('teacher@rupp.edu.kh',     'Class M1'),
  ('teacher@rupp.edu.kh',     'Class M2'),
  ('teacher@rupp.edu.kh',     'Class E1')
) as v(email, class_name)
join auth.users     u on lower(u.email) = v.email
join public.classes c on c.name = v.class_name
on conflict (teacher_id, class_id) do nothing;


-- ------------------------------------------------------------
-- Semester and subjects.
--
-- Attendance is recorded per subject, so each class needs at least one.
-- Class M1 gets two, taught by different teachers, so a student can see a
-- separate percentage per teacher.
-- ------------------------------------------------------------
insert into public.semesters (name, start_date, is_active)
values ('Semester 1 · ' || to_char(current_date, 'YYYY'), current_date - 30, true)
on conflict (name) do nothing;

insert into public.subjects (name, class_id, teacher_id)
select v.subject, c.id, u.id
from (values
  ('Data Structures',  'Class M1', 'theara.toem@rupp.edu.kh'),
  ('Statistics',       'Class M1', 'teacher@rupp.edu.kh'),
  ('Database Systems', 'Class M2', 'teacher@rupp.edu.kh'),
  ('Web Development',  'Class E1', 'teacher@rupp.edu.kh')
) as v(subject, class_name, email)
join public.classes c on c.name = v.class_name
join auth.users     u on lower(u.email) = v.email
on conflict (class_id, name) do nothing;


-- Two weeks of weekday attendance history (~80% Present / 12% Late / 8% Absent),
-- generated per subject so each student has a separate record per teacher.
-- "materialized" pins each row's random draws so status, time, and method agree.
with days as (
  select d::date as day
  from generate_series(current_date - 14, current_date - 1, interval '1 day') d
  where extract(isodow from d) between 1 and 5
),
marks as materialized (
  select s.id as student_id, sub.id as subject_id, days.day,
         random() as r, random() as r2
  from public.students s
  join public.subjects sub on sub.class_id = s.class_id
  cross join days
)
insert into public.attendance (student_id, subject_id, semester_id, date, status, check_in_time, method)
select
  student_id,
  subject_id,
  (select id from public.semesters where is_active limit 1),
  day,
  case when r < 0.80 then 'Present' when r < 0.92 then 'Late' else 'Absent' end,
  case
    when r < 0.80 then to_char(day + time '07:30' + make_interval(mins => (r2 * 45)::int), 'FMHH12:MI AM')
    when r < 0.92 then to_char(day + time '08:20' + make_interval(mins => (r2 * 30)::int), 'FMHH12:MI AM')
    else null
  end,
  case when r < 0.92 then (case when r2 < 0.6 then 'QR' else 'Manual' end) else null end
from marks
on conflict (student_id, date, subject_id) do nothing;

-- ------------------------------------------------------------
-- Linking student logins to the roster
--
-- A student account is linked automatically at signup when its email
-- matches a roster row (see handle_new_user in schema.sql) — e.g.
-- registering as dara.sok@rupp.edu.kh links to Sok Dara. To link an
-- account that registered with a different email, run:
--
--   update public.students
--     set user_id = (select id from auth.users where email = 'their-login@rupp.edu.kh')
--     where student_id = 'M2202501';
-- ------------------------------------------------------------


-- ============================================================
-- RUPP Attendance — login accounts
--
-- Run AFTER schema.sql (and ideally seed.sql), in the Supabase SQL Editor.
-- Safe to re-run.
--
-- Creates and confirms every account below (no confirmation email needed,
-- so this works even with "Confirm email" turned on):
--
--   Class M1 students (password student@123):
--     kimhong.ty.3624@rupp.edu.kh                  (Ty Kimhong, M1202501)
--     sachakponleupragna.thypheap.3624@rupp.edu.kh (Thypheap Sachak Ponleu Pragna, M1202502)
--     annchhengly.tith.3624@rupp.edu.kh            (Tith Annchhengly, M1202503)
--     serminh.leang.3624@rupp.edu.kh               (Leang Serminh, M1202504)
--     soborith.pa.3624@rupp.edu.kh                 (Pa Soborith, M1202505)
--     student@rupp.edu.kh                          (generic demo account, no roster row)
--
--   Class M2 / E1 example students (password student@123, same as Class M1):
--     piseth.heng@rupp.edu.kh                      (Tep Piseth,  M2202501)
--     chanthy.noun@rupp.edu.kh                     (Mann Vannda, M2202502)
--     sophea.meas@rupp.edu.kh                      (G Devid,     M2202503)
--     spike.dog@rupp.edu.kh                        (Spike Dog,   E1202501)
--     jerry.mouse@rupp.edu.kh                      (Jerry Mouse, E1202502)
--     tom.cat@rupp.edu.kh                          (Tom Cat,     E1202503)
--
--   Teachers (password teacher@123):
--     theara.toem@rupp.edu.kh                      (Toem Theara)
--     teacher@rupp.edu.kh                          (Veng Sotheara)
--
--   Admins / Head of Dept (sign in with email + password like everyone else):
--     hongthegoat@rupp.edu.kh                      (Hong Vin)      admin@123
--     admin@rupp.edu.kh                            (Washiba)       admin@123
--     ironman@rupp.edu.kh                          (Iron Man, HOD) HOD@123
--
--   "Head of Dept" is the UI label for the admin role, so Iron Man has exactly
--   the same access as the other two — including assigning classes to teachers.
--
--   Class Monitor: Thypheap Sachak Ponleu Pragna
--   (sachakponleupragna.thypheap.3624@rupp.edu.kh, password student@123) is a
--   Class M1 student that seed.sql flags as the class monitor, so the same
--   login can check in AND approve 1-day leaves for M1.
--
-- Every student account whose email matches a roster row in seed.sql is
-- linked automatically, so QR check-in and personal history work.
--
-- Note: inserting into auth.users directly is a demo-grade shortcut. If an
-- account misbehaves, delete it under Dashboard → Authentication → Users
-- and recreate it there ("Add user" with auto-confirm), then re-run this
-- file to restore its role, name, and roster link.
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- 1. Create any accounts that don't exist yet, pre-confirmed, with the role
--    and full name in their signup metadata. The on_auth_user_created
--    trigger from schema.sql fills profiles for these.
--
--    Newer Supabase projects forbid SQL writes to the auth schema ("must be
--    owner of table identities"). The whole step is wrapped so it silently
--    skips there — in that case create the accounts through the app's
--    register page or the signup API instead (with "Confirm email" off),
--    and the signup trigger handles roles and roster links automatically.
do $$
begin
with demo (email, password, role, full_name) as (
  values
    ('kimhong.ty.3624@rupp.edu.kh',                  'student@123', 'user',    'Ty Kimhong'),
    ('sachakponleupragna.thypheap.3624@rupp.edu.kh', 'student@123', 'user',    'Thypheap Sachak Ponleu Pragna'),
    ('annchhengly.tith.3624@rupp.edu.kh',            'student@123', 'user',    'Tith Annchhengly'),
    ('serminh.leang.3624@rupp.edu.kh',               'student@123', 'user',    'Leang Serminh'),
    ('soborith.pa.3624@rupp.edu.kh',                 'student@123', 'user',    'Pa Soborith'),
    ('student@rupp.edu.kh',                          'student@123', 'user',    'Sok Dara'),
    ('piseth.heng@rupp.edu.kh',                      'student@123', 'user',    'Tep Piseth'),
    ('chanthy.noun@rupp.edu.kh',                     'student@123', 'user',    'Mann Vannda'),
    ('sophea.meas@rupp.edu.kh',                      'student@123', 'user',    'G Devid'),
    ('spike.dog@rupp.edu.kh',                        'student@123', 'user',    'Spike Dog'),
    ('jerry.mouse@rupp.edu.kh',                      'student@123', 'user',    'Jerry Mouse'),
    ('tom.cat@rupp.edu.kh',                          'student@123', 'user',    'Tom Cat'),
    ('theara.toem@rupp.edu.kh',                      'teacher@123', 'teacher', 'Toem Theara'),
    ('teacher@rupp.edu.kh',                          'teacher@123', 'teacher', 'Veng Sotheara'),
    ('hongthegoat@rupp.edu.kh',                      'admin@123',   'admin',   'Hong Vin'),
    ('admin@rupp.edu.kh',                            'admin@123',   'admin',   'Washiba'),
    ('ironman@rupp.edu.kh',                          'HOD@123',     'admin',   'Iron Man')
),
created as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new,
    email_change_token_current, phone_change, phone_change_token, reauthentication_token
  )
  select
    '00000000-0000-0000-0000-000000000000'::uuid,
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    d.email,
    extensions.crypt(d.password, extensions.gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('full_name', d.full_name, 'role', d.role),
    now(),
    now(),
    '', '', '', '', '', '', '', ''
  from demo d
  where not exists (select 1 from auth.users u where lower(u.email) = d.email)
  returning id, email
)
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
)
select
  gen_random_uuid(),
  c.id,
  c.id::text,
  jsonb_build_object('sub', c.id::text, 'email', c.email, 'email_verified', true, 'phone_verified', false),
  'email',
  now(),
  now(),
  now()
from created c;
exception
  when insufficient_privilege then
    raise notice 'Account creation skipped (auth schema is locked on this project) — create the accounts via the signup API instead.';
end $$;

-- 2. Confirm accounts that were created through the app while "Confirm
--    email" was on (the demo addresses can't receive mail). Also wrapped —
--    skipped on projects that lock the auth schema.
do $$
begin
update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now())
  where lower(email) in (
    'kimhong.ty.3624@rupp.edu.kh',
    'sachakponleupragna.thypheap.3624@rupp.edu.kh',
    'annchhengly.tith.3624@rupp.edu.kh',
    'serminh.leang.3624@rupp.edu.kh',
    'soborith.pa.3624@rupp.edu.kh',
    'student@rupp.edu.kh',
    'piseth.heng@rupp.edu.kh',
    'chanthy.noun@rupp.edu.kh',
    'sophea.meas@rupp.edu.kh',
    'spike.dog@rupp.edu.kh',
    'jerry.mouse@rupp.edu.kh',
    'tom.cat@rupp.edu.kh',
    'theara.toem@rupp.edu.kh',
    'teacher@rupp.edu.kh',
    'hongthegoat@rupp.edu.kh',
    'admin@rupp.edu.kh',
    'ironman@rupp.edu.kh'
  );
exception
  when insufficient_privilege then
    raise notice 'Email confirmation skipped (auth schema is locked) — turn off "Confirm email" in Authentication settings instead.';
end $$;

-- 3. Make sure each account's profile row carries the right role, and is
--    pre-approved — self-registered accounts start 'pending' and wait for an
--    admin, but the demo logins need to work straight away.
--    (No-op for accounts that don't exist yet.)
insert into public.profiles (id, role, full_name, status, approved_at)
select u.id, d.role, d.full_name, 'approved', now()
from (values
  ('kimhong.ty.3624@rupp.edu.kh',                  'user',    'Ty Kimhong'),
  ('sachakponleupragna.thypheap.3624@rupp.edu.kh', 'user',    'Thypheap Sachak Ponleu Pragna'),
  ('annchhengly.tith.3624@rupp.edu.kh',            'user',    'Tith Annchhengly'),
  ('serminh.leang.3624@rupp.edu.kh',               'user',    'Leang Serminh'),
  ('soborith.pa.3624@rupp.edu.kh',                 'user',    'Pa Soborith'),
  ('student@rupp.edu.kh',                          'user',    'Sok Dara'),
  ('piseth.heng@rupp.edu.kh',                      'user',    'Tep Piseth'),
  ('chanthy.noun@rupp.edu.kh',                     'user',    'Mann Vannda'),
  ('sophea.meas@rupp.edu.kh',                      'user',    'G Devid'),
  ('spike.dog@rupp.edu.kh',                        'user',    'Spike Dog'),
  ('jerry.mouse@rupp.edu.kh',                      'user',    'Jerry Mouse'),
  ('tom.cat@rupp.edu.kh',                          'user',    'Tom Cat'),
  ('theara.toem@rupp.edu.kh',                      'teacher', 'Toem Theara'),
  ('teacher@rupp.edu.kh',                          'teacher', 'Veng Sotheara'),
  ('hongthegoat@rupp.edu.kh',                      'admin',   'Hong Vin'),
  ('admin@rupp.edu.kh',                            'admin',   'Washiba'),
  ('ironman@rupp.edu.kh',                          'admin',   'Iron Man')
) as d(email, role, full_name)
join auth.users u on lower(u.email) = d.email
on conflict (id) do update
  set role        = excluded.role,
      full_name   = coalesce(excluded.full_name, profiles.full_name),
      status      = 'approved',
      approved_at = coalesce(profiles.approved_at, now());

-- 4. Link every login account to its roster row by matching email, so the
--    five real students get QR check-in and personal history immediately.
update public.students s
  set user_id = u.id
  from auth.users u
  where s.user_id is null
    and s.email is not null
    and lower(u.email) = lower(s.email);
