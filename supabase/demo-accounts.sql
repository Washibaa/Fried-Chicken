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
