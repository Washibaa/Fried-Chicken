# RUPP Attendance

An attendance management system for Royal University of Phnom Penh. Staff and students can track daily attendance, submit leave requests, and view analytics — all backed by Supabase.

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [Supabase](https://supabase.com) — auth, database, and file storage
- [Tailwind CSS v4](https://tailwindcss.com)
- TypeScript

## Features

The system has **three roles**: **Student** (mobile-style app), **Teacher** (desktop dashboard), and **Admin / Head of Dept** (teacher features + system log).

### Student (mobile-style)

- Student ID card with university ID and roll number
- Attendance rate card with present / absent counts
- **Scan QR Code** check-in: camera simulation with manual code entry (validated against the teacher's generated code for today)
- **Leave Request** modal: absence date, reason, drag-and-drop document upload (PDF/JPG/PNG up to 5MB), confirmation screen
- Collapsible Attendance History (date, check-in time, method QR/Manual, status) and Leave Requests (status + which authority is reviewing)
- In-app notifications when a leave request is approved or declined
- Profile settings (contact number, notification preferences) via the gear icon

### Teacher

- **Choose Class** screen after login — dashboards filter to the selected class (or All Classes)
- Dashboard with daily attendance stats, live attendance feed, and low-attendance alerts
- Working **Generate QR Code** button — creates today's check-in code for students
- Search the roster by name or student ID, filter by status, and browse logs of past dates
- Mark students Present, Late, or Absent, with check-in and check-out timestamps
- Approve, reject, or batch-approve pending leave requests (pending count badge in the sidebar)
- Analytics with bar/pie charts, per-student performance, and below-threshold flags (80%)

### Admin / Head of Dept

- Everything a teacher can do, plus a terminal-style **Log** page showing system activity
  (logins, registrations, QR codes, check-ins, attendance marks, leave decisions, exports) with a Share/copy button

### Accounts

- Self-registration with an official RUPP email (`@rupp.edu.kh`) and role selection (Student / Teacher / Admin)
- Role-based access control (RBAC) enforced in `proxy.ts`; the Log page is admin-only
- Role tag shown in the sidebar to indicate the current level of access
- **Admin Access** mode on the login page: the Head of Dept signs in with just their username — no password field (see below)

#### Logins (created by `supabase/demo-accounts.sql`)

| Role    | Email                                          | Password                                            |
| ------- | ---------------------------------------------- | --------------------------------------------------- |
| Student | `kimhong.ty.3624@rupp.edu.kh` (000123)         | `student@123`                                       |
| Student | `sachakponleupragna.thypheap.3624@rupp.edu.kh` (000124) | `student@123`                              |
| Student | `annchhengly.tith.3624@rupp.edu.kh` (000125)   | `student@123`                                       |
| Student | `serminh.leang.3624@rupp.edu.kh` (000126)      | `student@123`                                       |
| Student | `soborith.pa.3624@rupp.edu.kh` (000127)        | `student@123`                                       |
| Student | `student@rupp.edu.kh` (generic demo)           | `student@123`                                       |
| Teacher | `theara.toem@rupp.edu.kh`                      | `teacher@123`                                       |
| Teacher | `teacher@rupp.edu.kh` (generic demo)           | `teacher@123`                                       |
| Admin   | `hongthegoat@rupp.edu.kh`                      | — none. Click **Admin Access — Head of Dept** on the login page and enter `hongthegoat` |
| Admin   | `admin@rupp.edu.kh` (generic demo)             | — none. Admin Access with username `admin`          |

The five real students are Class M1 on the roster (IDs 000123–000127) and are linked to their login accounts automatically, so QR check-in and personal history work for each of them.

The Admin Access flow signs the account in behind the scenes with a fixed access key (`admin@123`) and then verifies the account actually has the `admin` role — non-admin accounts are rejected. This is a coursework demo convenience: the key ships in the client bundle, so never use this pattern in a real deployment.

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

1. [`supabase/schema.sql`](supabase/schema.sql) — creates every table below, plus row-level security policies, a signup trigger that fills `profiles` (and auto-links a student account to the roster when their email matches), and the `leave-documents` storage bucket.
2. [`supabase/seed.sql`](supabase/seed.sql) *(optional)* — demo classes, a 12-student roster, and two weeks of attendance history so the dashboards have data on first login.
3. [`supabase/demo-accounts.sql`](supabase/demo-accounts.sql) *(optional)* — creates and confirms the three demo logins below and links the student one to the roster.

All three scripts are safe to re-run.

> **Tip:** for demos, turn off **Confirm email** (Dashboard → Authentication → Sign In / Providers → Email). `@rupp.edu.kh` demo addresses can't receive confirmation mail, and the built-in mailer only sends 2 emails/hour. `demo-accounts.sql` sidesteps this for the three demo accounts, but self-registered accounts need it off.

The tables, for reference:

**`profiles`**

| Column                | Type   | Notes                                       |
| --------------------- | ------ | ------------------------------------------- |
| `id`                  | `uuid` | References `auth.users.id`                  |
| `role`                | `text` | `"admin"`, `"teacher"`, or `"user"` (student) |
| `full_name`           | `text` | Nullable                                    |
| `phone`               | `text` | Nullable — contact mobile number            |
| `email_notifications` | `bool` | Default `true` — leave status notifications |

**`classes`**

| Column       | Type   | Notes                                  |
| ------------ | ------ | -------------------------------------- |
| `id`         | `uuid` |                                        |
| `name`       | `text` | e.g. `"Class M1"`                      |
| `department` | `text` | Abbreviation shown on the card, e.g. `"DSE"`, `"ITE"` |

**`students`**

| Column        | Type   | Notes                                                     |
| ------------- | ------ | --------------------------------------------------------- |
| `id`          | `uuid` |                                                           |
| `name`        | `text` |                                                           |
| `student_id`  | `text` | University student ID                                     |
| `roll_number` | `text` |                                                           |
| `initials`    | `text` |                                                           |
| `user_id`     | `uuid` | Nullable — references `auth.users.id`; links the student to their login account for QR check-in and personal history |
| `class_id`    | `uuid` | Nullable — references `classes.id`; used by the Choose Class filter |
| `email`       | `text` | Nullable — RUPP email, included in roster search |

**`attendance`**

| Column           | Type   | Notes                                        |
| ---------------- | ------ | -------------------------------------------- |
| `id`             | `uuid` |                                              |
| `student_id`     | `uuid` | References `students.id`                     |
| `date`           | `date` |                                              |
| `status`         | `text` | `"Present"`, `"Late"`, or `"Absent"`         |
| `check_in_time`  | `text` | Nullable                                     |
| `check_out_time` | `text` | Nullable                                     |
| `method`         | `text` | Nullable — `"QR"` or `"Manual"`              |

> Add a unique constraint on `(student_id, date)` — the app upserts on this pair.

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
| `routed_to`    | `text`        | `"teacher"` (≤ 2 days) or `"admin"` (longer) — set automatically on submission |
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

`schema.sql` also creates a Supabase Storage bucket named **`leave-documents`** (public read, 5 MB limit, PDF/JPG/PNG) for document uploads, with uploads restricted to each user's own folder.

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
│   ├── leave/      # Approve / reject pending leave requests
│   ├── analytics/  # Attendance analytics, charts & threshold flags
│   ├── log/        # System activity log (admin role only)
│   └── profile/    # Staff profile settings
├── student/        # Student area (mobile-style, no sidebar)
│   ├── home/       # ID card, attendance rate, QR check-in & leave modals, history, notifications
│   └── profile/    # Student profile settings
└── components/     # Shared UI components (incl. charts/, GenerateQr, ThemeToggle)
lib/
├── supabase.ts       # Supabase browser client
├── logger.ts         # Activity logging for the admin Log page
├── selectedClass.ts  # Selected class persistence for staff dashboards
└── theme.ts          # Light/Dark mode preference
```

## Authentication & Roles

Registration and login require a RUPP email (`@rupp.edu.kh`). During registration the user selects a role: **Student**, **Teacher**, or **Admin / Head of Dept**. After sign-in, the app checks the `profiles` table for the user's `role` (falling back to auth metadata):

- Students land on `/student/home` — the mobile-style attendance app.
- Teachers and admins land on `/admin/classes` to pick a class, then use the desktop dashboard.
- The `/admin/log` page is restricted to the `admin` role.

Passwords must be at least 8 characters and include a letter and a number (SRS 3.2.3).

Route access is enforced in `proxy.ts`.

> **Note:** self-selected roles are convenient for coursework and demos. In a real deployment, teacher/admin roles should be assigned or verified by an administrator instead of chosen freely at sign-up.

## QR Check-in Flow

1. A teacher clicks **Generate QR Code** — a 6-character code for today is stored in `qr_sessions` and displayed with a QR-style graphic.
2. A student opens **Scan QR Code** — the camera view is simulated, and the student enters the code manually.
3. The app validates the code against today's `qr_sessions` rows and marks the student **Present** with a check-in timestamp and `method = "QR"`.

## Leave Request Routing (SRS 3.1.2)

Requests are routed automatically to the correct authority based on the RUPP process:

- **Up to 2 days** → routed to the **Teacher** (teachers only see requests routed to them).
- **Longer than 2 days** → routed to the **Head of Department** (admins see all pending requests).

When a request is approved or declined, the student gets an in-app **notification** on their home screen (SRS 3.1.5), and students on approved leave appear as **Approved Leave** (instead of Absent/Pending) in the teacher's roster for those dates (SRS 3.1.1).

## Light / Dark Mode (SRS 3.2.2)

A theme toggle is available on the login/register screens, the student home header, and the staff sidebar. The preference is saved in `localStorage` and applied before paint; charts follow the theme through CSS variables.

## Available Scripts

| Script            | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Start development server     |
| `npm run build`   | Build for production         |
| `npm run start`   | Start production server      |
| `npm run lint`    | Run ESLint                   |
