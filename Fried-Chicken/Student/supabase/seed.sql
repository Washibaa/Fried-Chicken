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
