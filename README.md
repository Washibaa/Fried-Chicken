# RUPP Attendance

An attendance management system for Royal University of Phnom Penh. Staff and students can track daily attendance, submit leave requests, and view analytics — all backed by Supabase.

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [Supabase](https://supabase.com) — auth, database, and file storage
- [Tailwind CSS v4](https://tailwindcss.com)
- TypeScript

## Features

The system has **three account roles**: **Student** (mobile-style app), **Teacher** (desktop dashboard), and **Admin / Head of Dept** (teacher features + system log). Any student can additionally be flagged as their class's **Class Monitor**, which lets them approve short (1-day) leave requests for classmates on top of their normal student features.

### Student (mobile-style)

- Student ID card with university ID and roll number
- Attendance rate card with present / absent counts
- **Scan QR Code** check-in: camera simulation with manual code entry (validated against the teacher's generated code for today)
- **Leave Request** modal: absence date, reason, drag-and-drop document upload (PDF/JPG/PNG up to 5MB), confirmation screen
- A **semester picker** — the totals, the per-subject breakdown, the history and the export all re-scope to the chosen term, so last semester stays readable after a new one starts
- A **per-subject breakdown**: one row per subject with its teacher and a separate attendance percentage, turning red below the 80% threshold. This is how a student compares how they're doing with each teacher
- **Export CSV** of their own attendance for the selected semester (semester, subject, teacher, date, status, check-in, method)
- Collapsible Attendance History (date, subject, check-in time, method QR/Manual, status) and Leave Requests (status + which authority is reviewing)
- In-app notifications when a leave request is approved or declined
- Profile settings (contact number, notification preferences) via the gear icon

### Class Monitor (a student who also approves)

- A **Class Monitor is a normal student** — they still check in, hold an ID card, and submit their own leave. They're a roster student with `is_monitor` set (appointed, not a separate account role).
- **Only a teacher or admin appoints the monitor**, from the **Make monitor** control in the Analytics student table. Students can't set it themselves (the `students` table is only writable by staff via Row-Level Security).
- An **Approve Class Leave Requests** button appears on their student home, opening a mobile-style approval queue
- Reviews the short (1-day) leave requests routed to a monitor for **their class only**
- Approve / reject; the student is notified automatically (same flow as staff). A monitor can't approve their **own** leave.
- Sees only their own class's monitor-routed requests — enforced by Row-Level Security

### Teacher

- **Choose Class** screen after login — dashboards filter to the selected class (or All Classes)
- Dashboard with daily attendance stats, live attendance feed, and low-attendance alerts
- Working **Generate QR Code** button — creates today's check-in code for students
- Search the roster by name or student ID, filter by status, and browse logs of past dates
- Mark students Present, Late, or Absent, with check-in and check-out timestamps
- Approve, reject, or batch-approve pending leave requests (pending count badge in the sidebar)
- Analytics with bar/pie charts, per-student performance, and below-threshold flags (80%)
- **Appoint the Class Monitor** — a **Make monitor** control on each row of the Analytics student table (only teachers and admins can set it; one monitor per class)

### Admin / Head of Dept

- Everything a teacher can do, plus a terminal-style **Log** page showing system activity
  (logins, registrations, QR codes, check-ins, attendance marks, leave decisions, exports) with a Share/copy button
- A **Students** page to **add or remove students** from the roster (admin-only). New IDs are generated in the readable `class + year + roll` format (e.g. `M1202506`). Teachers can't add/remove — only update (e.g. appoint monitors), and only within their own classes.
- An **Approvals** page (admin-only, with a pending-count badge in the sidebar) to approve or reject new registrations. The requested role is shown, an admin can grant a different one, and a request for full admin access is called out with a warning.
- A **Teachers** page (admin-only) to assign each teacher the classes they're responsible for.
- A **Subjects** page (admin-only) to define what each class is taught and by whom. Attendance is recorded per subject, so every class needs at least one.
- A **Semesters** page (admin-only) to **start a new term**, which resets every attendance counter to zero without deleting anything — the previous term is archived and stays readable. Old semesters can also be made current again, or permanently deleted (which cascades their attendance) when something has gone wrong.
- The **Log** filters by email or free text and by date range, and exports the filtered view to CSV.

### Accounts

- Self-registration with an official RUPP email (`@rupp.edu.kh`), but **every new account must be approved by an admin / Head of Dept before it can be used**. Until then it sits on a holding page and RLS gives it nothing.
- The role picked on the register form is stored as `requested_role` only. The effective `role` stays `user` until an admin approves, and the admin can grant a different role than the one asked for — so ticking "Admin / Head of Dept" on the form grants nothing by itself.
- Becoming a Class Monitor is **not** self-selected — a teacher or admin appoints a student from the Analytics table (`students.is_monitor`, staff-writable only).
- Role-based access control (RBAC) enforced in `proxy.ts` **and** Postgres Row-Level Security; the Log page is admin-only
- Role tag shown in the sidebar to indicate the current level of access
- **Profile pictures** — any user can upload, replace, or remove their own photo from **My Profile**. It shows on the profile page and in the staff sidebar. With no upload, admins and teachers fall back to the built-in role photo and students to an initial-letter circle.
- **Per-teacher class assignments** — an admin / Head of Dept uses the **Teachers** page to tick which classes each teacher is responsible for. A teacher then only sees the classes, students, attendance and leave requests that belong to them, so one teacher's roster never buries another's. Enforced by Row-Level Security (`teacher_classes` + `staff_can_access_class()`), not just hidden in the UI. A teacher with no assignment sees nothing until an admin adds one; admins and the Head of Dept are never restricted.
- Everyone — including the Head of Dept — signs in with **email + password**. (The earlier passwordless "Admin Access" shortcut has been removed to satisfy SRS 3.2.3's secure-password requirement.)

#### Logins (created by `supabase/demo-accounts.sql`)

| Role    | Name                        | Email                                          | Password         |
| ------- | --------------------------- | ---------------------------------------------- | ---------------- |
| Admin   | Hong Vin                    | `hongthegoat@rupp.edu.kh`                      | `admin@123`      |
| Admin   | Washiba                     | `admin@rupp.edu.kh`                            | `admin@123`      |
| Head of Dept | Iron Man               | `ironman@rupp.edu.kh`                          | `HOD@123`        |
| Teacher | Toem Theara (Class M1)      | `theara.toem@rupp.edu.kh`                      | `teacher@123`    |
| Teacher | Veng Sotheara (Class M2, E1)| `teacher@rupp.edu.kh`                          | `teacher@123`    |
| Student | Ty Kimhong (M1202501)       | `kimhong.ty.3624@rupp.edu.kh`                  | `student@123`    |
| Student | Thypheap Sachak Ponleu Pragna (M1202502) | `sachakponleupragna.thypheap.3624@rupp.edu.kh` | `student@123` |
| Student | Tith Annchhengly (M1202503) | `annchhengly.tith.3624@rupp.edu.kh`            | `student@123`    |
| Student | Leang Serminh (M1202504)    | `serminh.leang.3624@rupp.edu.kh`               | `student@123`    |
| Student | Pa Soborith (M1202505)      | `soborith.pa.3624@rupp.edu.kh`                 | `student@123`    |
| Student | Sok Dara (generic demo)     | `student@rupp.edu.kh`                          | `student@123`    |
| Student | Tep Piseth (M2202501)       | `piseth.heng@rupp.edu.kh`                      | `student@123`    |
| Student | Mann Vannda (M2202502)      | `chanthy.noun@rupp.edu.kh`                     | `student@123`    |
| Student | G Devid (M2202503)          | `sophea.meas@rupp.edu.kh`                      | `student@123`    |
| Student | Spike Dog (E1202501)        | `spike.dog@rupp.edu.kh`                        | `student@123`    |
| Student | Jerry Mouse (E1202502)      | `jerry.mouse@rupp.edu.kh`                      | `student@123`    |
| Student | Tom Cat (E1202503)          | `tom.cat@rupp.edu.kh`                          | `student@123`    |

Class M1 is the real project group. The Class M2 and E1 students are examples so you
can demo more than one class — every student account, in any class, signs in with
`student@123`.

The five real students are Class M1 on the roster (IDs M1202501–M1202505) and are linked to their login accounts automatically, so QR check-in and personal history work for each of them. Student IDs follow the readable format **class + enrollment year + roll number** (e.g. `M1202503` = Class M1, enrolled 2025, roll 03). **`seed.sql` flags Thypheap Sachak Ponleu Pragna (`sachakponleupragna.thypheap.3624@rupp.edu.kh`, `student@123`) as the Class M1 monitor**, so that same student login can also approve 1-day leaves for M1 — sign in and use the **Approve Class Leave Requests** button on the home screen.

Every account — including the admins — signs in through the standard **email + password** form. There is no passwordless bypass in the client; access is decided by the account's `role` (checked in `proxy.ts` and enforced by Row-Level Security).

## Getting Started

### 1. Clone the repo

```bash
git clone <repo-url>
cd test
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

You can find these values in your [Supabase project settings](https://supabase.com/dashboard) under **Project Settings → API**.

### 4. Set up Supabase

Open the [Supabase SQL Editor](https://supabase.com/dashboard) and run:

1. [`supabase/schema.sql`](supabase/schema.sql) — creates every table below, plus row-level security policies, a signup trigger that fills `profiles` (and auto-links a student account to the roster when their email matches), and the `leave-documents` and `avatars` storage buckets.
2. [`supabase/seed.sql`](supabase/seed.sql) *(optional)* — demo classes, a 12-student roster, and two weeks of attendance history so the dashboards have data on first login.
3. [`supabase/demo-accounts.sql`](supabase/demo-accounts.sql) *(optional)* — creates and confirms the three demo logins below and links the student one to the roster.

All three scripts are safe to re-run.

> **Tip:** for demos, turn off **Confirm email** (Dashboard → Authentication → Sign In / Providers → Email). `@rupp.edu.kh` demo addresses can't receive confirmation mail, and the built-in mailer only sends 2 emails/hour. `demo-accounts.sql` sidesteps this for the three demo accounts, but self-registered accounts need it off.

The tables, for reference:

**`profiles`**

| Column                | Type   | Notes                                       |
| --------------------- | ------ | ------------------------------------------- |
| `id`                  | `uuid` | References `auth.users.id`                  |
| `role`                | `text` | Effective role — `"admin"`, `"teacher"`, or `"user"`. The only one RLS consults |
| `status`              | `text` | `"pending"` (default) → `"approved"` / `"rejected"`. Unapproved accounts can do nothing |
| `requested_role`      | `text` | What was picked on the register form; copied into `role` only on approval |
| `approved_at`         | `timestamptz` | Nullable                              |
| `approved_by`         | `uuid` | Nullable — the admin who decided               |
| `full_name`           | `text` | Nullable                                    |
| `email`               | `text` | Mirror of `auth.users.email` (that table isn't reachable over PostgREST) |
| `phone`               | `text` | Nullable — contact mobile number            |
| `avatar_url`          | `text` | Nullable — uploaded profile picture; falls back to the role photo, then the initial |
| `email_notifications` | `bool` | Default `true` — gates leave status notifications |

**`classes`**

| Column       | Type   | Notes                                  |
| ------------ | ------ | -------------------------------------- |
| `id`         | `uuid` |                                        |
| `name`       | `text` | e.g. `"Class M1"`                      |
| `department` | `text` | Abbreviation shown on the card, e.g. `"DSE"`, `"ITE"` |

**`semesters`** — academic terms; attendance is tagged with the one it was taken in

| Column       | Type          | Notes                                                    |
| ------------ | ------------- | -------------------------------------------------------- |
| `id`         | `uuid`        |                                                          |
| `name`       | `text`        | Unique, e.g. `"Semester 1 · 2026"`                       |
| `start_date` | `date`        |                                                          |
| `end_date`   | `date`        | Set when the term is archived                            |
| `is_active`  | `bool`        | Only one row may be true (partial unique index)          |

**`subjects`** — one subject taught to one class by one teacher

| Column       | Type   | Notes                                            |
| ------------ | ------ | ------------------------------------------------ |
| `id`         | `uuid` |                                                  |
| `name`       | `text` | Unique per class                                 |
| `class_id`   | `uuid` | References `classes.id`                          |
| `teacher_id` | `uuid` | References `auth.users.id`; null = unassigned    |

**`teacher_classes`** — which classes each teacher is responsible for

| Column       | Type          | Notes                                              |
| ------------ | ------------- | -------------------------------------------------- |
| `teacher_id` | `uuid`        | References `auth.users.id`; part of the primary key |
| `class_id`   | `uuid`        | References `classes.id`; part of the primary key    |
| `created_at` | `timestamptz` | Default `now()`                                     |

Managed from the admin-only **Teachers** page. A teacher can read their own rows but never write them; only an admin / Head of Dept may assign or revoke a class.

**`students`**

| Column        | Type   | Notes                                                     |
| ------------- | ------ | --------------------------------------------------------- |
| `id`          | `uuid` |                                                           |
| `name`        | `text` |                                                           |
| `student_id`  | `text` | Readable code: class + enrollment year + roll number, e.g. `M1202503` |
| `roll_number` | `text` |                                                           |
| `initials`    | `text` |                                                           |
| `user_id`     | `uuid` | Nullable — references `auth.users.id`; links the student to their login account for QR check-in and personal history |
| `class_id`    | `uuid` | Nullable — references `classes.id`; used by the Choose Class filter |
| `email`       | `text` | Nullable — RUPP email, included in roster search |
| `is_monitor`  | `bool` | Default `false` — when true, this student is their class's monitor and can approve 1-day leaves for classmates |

**`attendance`**

| Column           | Type   | Notes                                        |
| ---------------- | ------ | -------------------------------------------- |
| `id`             | `uuid` |                                              |
| `student_id`     | `uuid` | References `students.id`                     |
| `subject_id`     | `uuid` | References `subjects.id` — which teacher's session |
| `semester_id`    | `uuid` | References `semesters.id`; stamped automatically by a trigger |
| `date`           | `date` |                                              |
| `status`         | `text` | `"Present"`, `"Late"`, or `"Absent"`         |
| `check_in_time`  | `text` | Nullable                                     |
| `check_out_time` | `text` | Nullable                                     |
| `method`         | `text` | Nullable — `"QR"` or `"Manual"`              |

> Unique on `(student_id, date, subject_id)` — the app upserts on this triple. Attendance is **per subject**, not per day: a student can be Present for one subject and Absent for another on the same date. `semester_id` never has to be supplied; the `attendance_set_semester` trigger fills it from whichever semester is active.

**`subject_teachers`** (view) — `subject_id`, `subject_name`, `class_id`, `teacher_id`, `teacher_name`.
Students need the name of whoever teaches each of their subjects, but `profiles` is deliberately not student-readable (it holds phone numbers and emails). This view exposes only the name and repeats the `subjects` visibility rule in its `WHERE`, so it can't be used to enumerate other classes.

**`qr_sessions`**

| Column       | Type          | Notes                                     |
| ------------ | ------------- | ----------------------------------------- |
| `id`         | `uuid`        |                                           |
| `code`       | `text`        | Check-in code shown by Generate QR Code   |
| `date`       | `date`        | Codes are only valid on their date        |
| `created_at` | `timestamptz` | Default `now()`                           |

**`activity_logs`**

| Column       | Type          | Notes                          |
| ------------ | ------------- | ------------------------------ |
| `id`         | `int8`        |                                |
| `message`    | `text`        |                                |
| `created_at` | `timestamptz` | Default `now()`                |

**`leave_requests`**

| Column         | Type          | Notes                                          |
| -------------- | ------------- | ---------------------------------------------- |
| `id`           | `int8`        |                                                |
| `user_id`      | `uuid`        |                                                |
| `name`         | `text`        |                                                |
| `reason`       | `text`        |                                                |
| `status`       | `text`        | `"pending"`, `"approved"`, or `"rejected"`     |
| `start_date`   | `date`        | First day of leave                             |
| `end_date`     | `date`        | Last day of leave                              |
| `routed_to`    | `text`        | `"monitor"` (1 day), `"teacher"` (≤ 2 days), or `"admin"` (longer) — set automatically on submission |
| `document_url` | `text`        | Nullable                                       |
| `created_at`   | `timestamptz` |                                                |

**`notifications`**

| Column       | Type          | Notes                                    |
| ------------ | ------------- | ---------------------------------------- |
| `id`         | `int8`        |                                          |
| `user_id`    | `uuid`        | The student to notify                    |
| `message`    | `text`        |                                          |
| `read`       | `bool`        | Default `false`                          |
| `created_at` | `timestamptz` | Default `now()`                          |

`schema.sql` also creates two Supabase Storage buckets, both public-read with writes restricted to a folder named after the uploader's user id:

| Bucket            | Limit  | Types               | Used for                        |
| ----------------- | ------ | ------------------- | ------------------------------- |
| `leave-documents` | 5 MB   | PDF / JPG / PNG     | Leave request attachments       |
| `avatars`         | 2 MB   | JPEG / PNG / WebP   | Profile pictures                |

Profile pictures are center-cropped and downscaled to a 512px square in the browser before upload (see `lib/avatar.ts`), so stored files are a few tens of KB regardless of what the user picks. Each upload gets a timestamped filename so the public URL changes and no stale image is served from cache; the file it replaces is deleted.

> **Linking students to logins:** the student home page needs `students.user_id` to point at the student's auth account. This happens automatically at signup when the registration email matches a roster row's `email`; otherwise set `user_id` manually (see the note at the bottom of `seed.sql`).

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to the login page.

## Project Structure

```text
app/
├── login/          # Login page (email + password via Supabase Auth)
├── register/       # Self-registration with RUPP email + role selection
├── admin/          # Staff area (teachers + admins)
│   ├── classes/    # Choose Class screen shown after login
│   ├── home/       # Dashboard — attendance stats, alerts & live feed
│   ├── attendance/ # Live attendance feed & manual marking, per subject
│   ├── leave/      # Approve / reject pending leave requests
│   ├── analytics/  # Attendance analytics, charts & threshold flags
│   ├── students/   # Add / remove students (admin role only)
│   ├── teachers/   # Assign classes to teachers (admin role only)
│   ├── subjects/   # Define subjects and their teachers (admin role only)
│   ├── semesters/  # Start / archive / delete terms (admin role only)
│   ├── approvals/  # Approve / reject new registrations (admin role only)
│   ├── log/        # System activity log, filterable (admin role only)
│   └── profile/    # Staff profile settings
├── pending/        # Holding page for accounts awaiting approval
├── student/        # Student area (mobile-style, no sidebar)
│   ├── home/       # ID card, attendance rate, QR check-in & leave modals, history, notifications
│   └── profile/    # Student profile settings
├── monitor/        # Class Monitor area (mobile-style, no sidebar)
│   └── leave/      # Approval queue for the monitor's class (1-day requests)
└── components/     # Shared UI components (incl. charts/, GenerateQr, ThemeToggle)
lib/
├── supabase.ts       # Supabase browser client
├── logger.ts         # Activity logging for the admin Log page
├── selectedClass.ts  # Selected class persistence for staff dashboards
└── theme.ts          # Light/Dark mode preference
```

## Authentication & Roles

Registration and login require a RUPP email (`@rupp.edu.kh`). During registration the user selects a role: **Student**, **Teacher**, or **Admin / Head of Dept**. After sign-in, the app checks the `profiles` table for the user's `role` (falling back to auth metadata):

- Students land on `/student/home` — the mobile-style attendance app. A student flagged as their class's monitor (`students.is_monitor`) also gets an **Approve Class Leave Requests** button there, which opens the `/monitor/leave` queue.
- Teachers and admins land on `/admin/classes` to pick a class, then use the desktop dashboard.
- The `/admin/log` page is restricted to the `admin` role.

Passwords must be at least 8 characters and include a letter and a number (SRS 3.2.3). Every role — admins included — authenticates with email + password; there is no passwordless path.

Route access is enforced in `proxy.ts` (which also gates `/monitor/*` to monitor students) and, authoritatively, by Postgres Row-Level Security.

> **Note:** self-selected roles are convenient for coursework and demos. In a real deployment, teacher/admin roles should be assigned or verified by an administrator instead of chosen freely at sign-up.

## QR Check-in Flow

1. A teacher clicks **Generate QR Code** — a 6-character code for today is stored in `qr_sessions` and displayed with a QR-style graphic.
2. A student opens **Scan QR Code** — the camera view is simulated, and the student enters the code manually.
3. The app validates the code against today's `qr_sessions` rows and marks the student **Present** with a check-in timestamp and `method = "QR"`.

## Leave Request Routing (SRS 3.1.2)

Requests are routed automatically to the correct authority based on leave length, matching the RUPP three-tier process:

- **1 day** → routed to the **Class Monitor** (monitors only see their own class's requests).
- **Up to 2 days** → routed to the **Teacher** (teachers only see requests routed to them).
- **Longer than 2 days** → routed to the **Head of Department** (admins see all pending requests).

When a request is approved or declined, the student gets an in-app **notification** on their home screen (SRS 3.1.5), and students on approved leave appear as **Approved Leave** (instead of Absent/Pending) in the teacher's roster for those dates (SRS 3.1.1).

The notification is created by the `on_leave_decided` database trigger the moment the status changes — regardless of whether a monitor, teacher, or admin made the decision — and it respects each student's `email_notifications` preference (Profile settings): turn it off and no status notification is sent. Because the trigger runs in the database, the person deciding never needs read access to the student's preferences.

## Light / Dark Mode (SRS 3.2.2)

A theme toggle is available on the login/register screens, the student and monitor home headers, and the staff sidebar. The preference is saved in `localStorage` and applied before paint; charts follow the theme through CSS variables.

## Deployment & Non-Functional Requirements

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for how the Supabase + Vercel deployment addresses the SRS §3.2 non-functional requirements (performance, security, compatibility, availability, and recovery), plus a production checklist.

## Available Scripts

| Script            | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Start development server     |
| `npm run build`   | Build for production         |
| `npm run start`   | Start production server      |
| `npm run lint`    | Run ESLint                   |
