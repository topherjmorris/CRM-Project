# Vendors and services

Every outside service this project depends on: what it does for us, where it shows up
in the code, what's free, and where to manage it. Keep this current when a vendor is
added or removed. Each integration point in the code also has a comment pointing back here.

Rule for now: everything must be free (or have a free tier) for building and testing.
Paid plans are a launch-phase decision.

Prices and limits were checked in October 2026 from secondary sources. Confirm on the
vendor's own pricing page before relying on them.

---

## Supabase: database, sign-in, file storage

- **What it does:** Hosts the Postgres database (all CRM data), handles sign-in
  (email links, Google), and enforces row-level security so each workspace only sees
  its own data.
- **Project:** `CRM-Project`, ref `ohviqlpdcnggihhhiouk`, region us-east-1.
  Dashboard: https://supabase.com/dashboard/project/ohviqlpdcnggihhhiouk
- **In the code:**
  - `lib/supabase/client.ts`: browser client (Client Components)
  - `lib/supabase/server.ts`: server client acting as the signed-in user (RLS applies)
  - `lib/supabase/admin.ts`: secret-key client that bypasses RLS (background jobs only)
  - `lib/supabase/middleware.ts` + `proxy.ts`: refresh the sign-in cookie on each request
  - `supabase/migrations/*.sql`: every schema change, applied with `npm run db:push`
  - `lib/database.types.ts`: generated types (`npm run db:types`), never edited by hand
  - `supabase/config.toml`: local CLI settings
- **Env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable,
  safe in the browser), `SUPABASE_SERVICE_ROLE_KEY` (secret, server only).
- **Free tier:** 2 active projects, limited database and storage size. **Free projects
  pause after about a week of no activity.** Data is kept, so restore it from the dashboard.
  Pro is about $25/month.
- **CLI:** installed in the project (`npx supabase ...`). Signed in with `supabase login`,
  linked with `supabase link`.
- **Sign-in email (dev):** Supabase's built-in sender is rate-limited. Dev currently sends
  through Gmail SMTP (configured in Supabase → Authentication → Emails → SMTP).
- Docs: https://supabase.com/docs

## Inngest: background jobs and scheduling

- **What it does:** Runs work outside a page request: scheduled (cron) jobs, retries,
  delays ("send the next email in 3 days"). Needed for outreach sequences, broadcasts,
  ad syncs and lead scoring.
- **In the code:**
  - `lib/inngest/client.ts`: the one client
  - `lib/inngest/functions/*.ts`: one file per job; registered in `functions/index.ts`
  - `app/api/inngest/route.ts`: endpoint Inngest calls to run jobs
- **Local dev:** `npm run jobs:dev` runs the Inngest dev server (no account needed).
  Dashboard at http://localhost:8288.
- **Env vars (production only):** `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`.
- **Free tier ("Hobby"):** about 50,000 runs/month, short run history. Paid plans start
  around $20–99/month (sources disagree).
- Docs: https://www.inngest.com/docs

## Vercel: hosting (not set up yet)

- **What it will do:** Host the Next.js app and give preview links per branch.
- **Free tier ("Hobby"):** fine for building and testing. **Non-commercial use only**:
  paying customers require Pro (about $20/seat/month) or a different host. Decide at launch.
- Docs: https://vercel.com/docs

## GitHub: code hosting and CI

- **Repo:** https://github.com/topherjmorris/CRM-Project
- **CI:** `.github/workflows/ci.yml` runs lint, typecheck and build on every push.
- **Free tier:** private repos get about 2,000 Actions minutes/month; each CI run takes
  under a minute.
- **Local sign-in:** GitHub CLI (`gh auth login`) stores the credentials git uses to push.

## Google Cloud: "Continue with Google" sign-in (optional, not enabled yet)

- **What it does:** OAuth client used by Supabase Auth's Google provider. Later also
  Gmail sending for outreach (FND-08).
- **Where configured:** Google Cloud Console → APIs & Services → Credentials, then
  Supabase → Authentication → Providers → Google. No code in this repo beyond
  `signInWithGoogle` in `app/login/actions.ts`.
- **Free:** sign-in has no cost. Gmail's restricted scopes need a yearly security
  assessment (usually paid) before public launch; see FND-08 on the tracker.

## Gmail SMTP: dev sign-in emails

- **What it does:** Sends Supabase's sign-in and invite emails during development.
- **Where configured:** Supabase dashboard (SMTP settings), using a Gmail app password.
- **Free:** with a daily sending cap. Fine for testing, not for customers. It gets replaced
  by the email provider picked for Nurture (NUR-01).

## UI libraries (open source, no account)

- **Next.js 16** (Vercel), app framework. Version-specific docs ship in
  `node_modules/next/dist/docs/` (see `AGENTS.md`).
- **shadcn/ui** (style "base-nova"): component source copied into `components/ui/`
  and owned by us. Built on **Base UI** (`@base-ui/react`). Add more with
  `npx shadcn@latest add <name>`. Config in `components.json`.
- **Tailwind CSS 4**: styling; theme tokens in `app/globals.css`.
- **lucide-react**: icons.
- **Geist** font via `next/font/google` (downloaded at build time, served from our domain).

## Coming later (picked with free tiers in mind)

| Need | Task | Candidates |
| --- | --- | --- |
| Marketing email sending | NUR-01 | Resend, Postmark, Amazon SES |
| Payments | FND-04 (launch phase) | Stripe |
| Ad platform APIs | FND-07, ADS-* | Meta, Google Ads, LinkedIn, TikTok (all free to access) |
| Domain | MKT-01 | Any registrar, about $10–15/year |
