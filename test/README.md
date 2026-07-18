# RUPP Attendance

An attendance management system for Royal University of Phnom Penh. Staff and students can track daily attendance, submit leave requests, and view analytics — all backed by Supabase.

## Tech Stack

- [Next.js 16](https://nextjs.org) (App Router)
- [Supabase](https://supabase.com) — auth, database, and file storage
- [Tailwind CSS v4](https://tailwindcss.com)
- TypeScript

## Features

### Admin

- Dashboard with daily attendance stats and live attendance feed
- QR code generation for marking attendance
- Approve or batch-approve pending leave requests

### User / Student

- Personal attendance overview
- Submit leave requests with an optional document attachment
- Track leave request status (pending / approved / rejected)

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

Create the following tables in your Supabase project:

**`profiles`**

| Column | Type   | Notes                        |
| ------ | ------ | ---------------------------- |
| `id`   | `uuid` | References `auth.users.id`   |
| `role` | `text` | `"admin"` or `"user"`        |

**`attendance`**

| Column    | Type   | Notes                          |
| --------- | ------ | ------------------------------ |
| `id`      | `uuid` |                                |
| `user_id` | `uuid` |                                |
| `date`    | `date` |                                |
| `status`  | `text` | `"Present"` or `"Absent"`      |

**`leave_requests`**

| Column         | Type          | Notes                                          |
| -------------- | ------------- | ---------------------------------------------- |
| `id`           | `int8`        |                                                |
| `user_id`      | `uuid`        |                                                |
| `name`         | `text`        |                                                |
| `reason`       | `text`        |                                                |
| `status`       | `text`        | `"pending"`, `"approved"`, or `"rejected"`     |
| `document_url` | `text`        | Nullable                                       |
| `created_at`   | `timestamptz` |                                                |

Also create a Supabase Storage bucket named **`leave-documents`** with public read access for document uploads.

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to the login page.

## Project Structure

```text
app/
├── login/          # Login page (email + password via Supabase Auth)
├── admin/
│   ├── home/       # Admin dashboard — attendance stats & feed
│   ├── leave/      # Pending leave request approvals
│   └── analytics/  # Attendance analytics
├── user/
│   ├── home/       # Student attendance overview
│   └── leave/      # Submit and track leave requests
└── components/     # Shared UI components
lib/
└── supabase.ts     # Supabase browser client
```

## Authentication & Roles

Login is done with a RUPP email (`@rupp.edu.kh`) and password. After sign-in, the app checks the `profiles` table for the user's `role` and redirects to `/admin/home` or `/user/home` accordingly.

## Available Scripts

| Script            | Description                  |
| ----------------- | ---------------------------- |
| `npm run dev`     | Start development server     |
| `npm run build`   | Build for production         |
| `npm run start`   | Start production server      |
| `npm run lint`    | Run ESLint                   |
