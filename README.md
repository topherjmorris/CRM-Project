# SMB CRM

CRM, outbound outreach, nurturing, social ads and a template site builder for small businesses.
Next.js (App Router, TypeScript, Tailwind) + Supabase.

## Setup

1. Install Node 24 (https://nodejs.org or `nvm install`).
2. `npm install`
3. Create Supabase projects (staging and production) at https://supabase.com.
4. `cp .env.example .env.local` and fill in the URL and keys.
5. `npm run dev` → http://localhost:3000

## Layout

- `app/`: routes (App Router)
- `lib/supabase/`: browser, server and middleware clients
- `proxy.ts`: refreshes the Supabase auth session
- `supabase/migrations/`: SQL migrations
- `.github/workflows/ci.yml`: lint, typecheck, build

## Environments

| Env | Supabase project | Hosting |
| --- | --- | --- |
| Local | staging project or `supabase start` | `npm run dev` |
| Staging | `smb-crm-staging` | Vercel preview deploys |
| Production | `smb-crm-prod` | Vercel production (main) |

## Database migrations

SQL lives in `supabase/migrations/`. One-time setup per machine:

1. `npx supabase login` (opens the browser)
2. `npx supabase link --project-ref <ref>` (asks for the database password)

Then `npm run db:push` applies new migrations and `npm run db:types` regenerates TypeScript types.

## Background jobs (Inngest)

Run alongside `npm run dev`:

```bash
npm run jobs:dev
```

Dashboard: http://localhost:8288 (runs, retries, errors; "Invoke" to run a job by hand).

Adding a job:

1. Create `lib/inngest/functions/<name>.ts` with `inngest.createFunction({ id, triggers }, handler)`.
   Triggers can be `{ cron: "TZ=UTC 0 3 * * *" }` or `{ event: "area/thing.happened" }`.
2. Wrap each side effect in `step.run("label", ...)` so it retries on its own and doesn't repeat finished work.
   Use `step.sleep("wait", "3d")` for delays (sequence steps).
3. Add it to `lib/inngest/functions/index.ts`.
4. Jobs that touch other workspaces' data use `createAdminClient()` (bypasses RLS; needs `SUPABASE_SERVICE_ROLE_KEY`).

Event names use `area/noun.verb`, e.g. `outreach/step.due`, `ads/leads.sync`.
