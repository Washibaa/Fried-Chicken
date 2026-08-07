# Deployment & Non-Functional Requirements

This document explains how RUPP Attendance is deployed and how that deployment
addresses the non-functional requirements in the SRS (§3.2). The SRS was
written against a generic AWS reference stack; the project is built on
**Supabase + Vercel**, which are themselves AWS-hosted managed services, so the
same qualities are met through managed infrastructure rather than hand-rolled
servers.

## Stack overview

| Layer            | Technology                          | Notes                                             |
| ---------------- | ----------------------------------- | ------------------------------------------------- |
| Frontend hosting | Vercel (Next.js 16, App Router)     | Global edge CDN, automatic HTTPS, preview deploys |
| Auth             | Supabase Auth                       | Email/password, JWT sessions                      |
| Database         | Supabase Postgres (managed)         | Runs on AWS; PITR backups available               |
| File storage     | Supabase Storage (`leave-documents`)| Public-read bucket, 5 MB PDF/JPG/PNG limit        |
| Profile pictures | Supabase Storage (`avatars`)        | Public-read bucket, 2 MB JPEG/PNG/WebP limit      |
| Access control   | Postgres Row-Level Security + `proxy.ts` | Enforced at the database and the route layer |

## Mapping to SRS §3.2

### 3.2.1 Performance

- **Response time (≤ 2 s check-in).** QR check-in is a single indexed upsert on
  `attendance (student_id, date)` plus one lookup on `qr_sessions (code, date)`,
  both backed by unique indexes (see `schema.sql`). Round-trips run against the
  nearest Supabase region and comfortably complete well under two seconds.
- **Throughput (≥ 500 concurrent).** Vercel serves the app from a serverless
  edge that scales horizontally on demand. Supabase pools Postgres connections
  (PgBouncer) so bursts of simultaneous check-ins at class start do not exhaust
  database connections. For sustained university-wide load, raise the Supabase
  compute tier and enable the dedicated connection pooler.
- **Scalability.** Both tiers scale horizontally without code changes; there is
  no single stateful app server to bottleneck.

### 3.2.2 Usability

Delivered in the app itself: a persistent sidebar for staff navigation,
client-side roster search that returns instantly (well under one second),
a mobile-first student/monitor UI, and a Light/Dark theme toggle. See the
README for the feature list.

### 3.2.3 Security

- **Authentication.** Restricted to `@rupp.edu.kh` accounts. Passwords must be
  at least 8 characters with a letter and a number (enforced on the register
  page; also configurable in Supabase Auth password policy).
- **Authorization.** Role-Based Access Control for Student, Teacher, and
  Admin/Head of Dept, plus a per-student Class Monitor flag that grants leave
  approval for one class — enforced twice: at the route layer in `proxy.ts`
  and, authoritatively, by Postgres Row-Level Security policies so the database
  rejects unauthorized reads/writes even if a client is tampered with.
- **Encryption in transit.** Vercel and Supabase both serve exclusively over
  HTTPS/TLS; there is no plaintext endpoint.
- **Secrets.** Only the Supabase URL and the publishable (anon) key ship to the
  browser — both are safe to expose because RLS governs every row. No service
  key or admin bypass is present in the client bundle.

### 3.2.4 Compatibility

Standards-based web app: runs on current Chrome, Firefox, Safari, and Edge, and
is responsive for Android/iOS browsers. Data lives in **PostgreSQL** (via
Supabase). *(Per the agreed scope, the "via Django" wording in the SRS is left
unchanged; the project uses Supabase's managed Postgres instead of a Django
backend.)*

### 3.2.5 Availability

- **24/7 availability.** Managed Supabase + Vercel have no scheduled downtime
  for normal operation.
- **Uptime target (99.9%).** Both providers publish production SLAs at or above
  this level on their paid tiers; the free tier used for coursework does not
  guarantee it.
- **Recovery.** Enable **Point-in-Time Recovery** (Supabase → Database →
  Backups) to restore the database to any moment within the retention window.
  Vercel redeploys the frontend from Git in minutes. Together these meet the
  "restore within 30 minutes" objective; the exact RTO depends on the Supabase
  plan's backup features.

## Production checklist

- [ ] Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
      in Vercel project env vars.
- [ ] Run `supabase/schema.sql` (tables, RLS, triggers, storage) on the project.
- [ ] Turn **on** "Confirm email" and configure a real SMTP sender (the demo
      addresses and `demo-accounts.sql` are for coursework only).
- [ ] Assign teacher / admin / monitor roles through an administrator rather
      than free self-selection at sign-up.
- [ ] Enable Point-in-Time Recovery and verify a test restore.
- [ ] Move to paid Supabase/Vercel tiers for the published uptime SLAs.
