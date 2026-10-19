# Where we left off (2026-10-19)

Tracker: https://claude.ai/artifact/XTVKnKMVp9v6ZXvp4WLFwR

- FND-01 done: Next.js 16 + Supabase, CI on GitHub.
- FND-02 in progress: workspace schema + RLS applied to Supabase (CRM-Project). Needs a two-account test.
- FND-03 in progress: sign-in, onboarding, team invites built. Needs Supabase dashboard setup + testing.

## Next steps for you
1. Supabase → Auth → URL Configuration: Site URL `http://localhost:3000`, redirect `http://localhost:3000/auth/callback`.
2. `npm run dev`, sign in at http://localhost:3000/login with the email link, create a workspace.
3. Optional: Google OAuth client (redirect `https://ohviqlpdcnggihhhiouk.supabase.co/auth/v1/callback`), enable in Supabase → Auth → Providers.
4. Invite a second email from Team, accept in a private window.

Open questions (product name, pricing, email provider, etc.) are in the tracker's Decisions tab.
