# SMB CRM

CRM, outbound outreach, nurturing, social ads and a template site builder for small businesses.
Next.js (App Router, TypeScript, Tailwind) + Supabase.

## Setup

1. Install Node 22 (https://nodejs.org or `nvm install`).
2. `npm install`
3. Create Supabase projects (staging and production) at https://supabase.com.
4. `cp .env.example .env.local` and fill in the URL and keys.
5. `npm run dev` → http://localhost:3000

## Layout

- `app/`: routes (App Router)
- `lib/supabase/`: browser, server and middleware clients
- `middleware.ts`: refreshes the Supabase auth session
- `supabase/migrations/`: SQL migrations
- `.github/workflows/ci.yml`: lint, typecheck, build

## Environments

| Env | Supabase project | Hosting |
| --- | --- | --- |
| Local | staging project or `supabase start` | `npm run dev` |
| Staging | `smb-crm-staging` | Vercel preview deploys |
| Production | `smb-crm-prod` | Vercel production (main) |
