# Where we left off (2026-10-31)

Tracker: https://claude.ai/code/artifact/f6a4f3f7-3e07-4d84-aae9-94fb159c5d34
Project folder: `~/code/smb-crm` (moved off the iCloud Desktop; see the Decisions tab).

## Done
- **Foundation:** FND-01 (Next.js 16 + Supabase, CI), FND-02 (workspaces + RLS), FND-03 (sign-in, invites),
  FND-05 (sidebar shell, shadcn/ui), FND-06 (Inngest background jobs).
- **CRM:** Leads with editable stages and conversion (CRM-10), Contacts (CRM-01), Companies (CRM-02),
  Deals board (CRM-03), Activity timeline (CRM-04), Tasks with due dates (CRM-05),
  extra fields + custom fields + hideable built-in fields + tags (CRM-06).

## Next up
- CRM-07: CSV import with field mapping and dedupe
- CRM-08: search, filters and saved views (segments; later used by nurture and ads)
- CRM-09: CRM dashboard
- Deferred: FND-04 Stripe (launch phase), FND-07/08 API approvals (need name, domain, privacy policy)

## Starting work again
```bash
cd ~/code/smb-crm
npm run dev        # app at http://localhost:3000
npm run jobs:dev   # background jobs dashboard at http://localhost:8288
```
Run only one `npm run dev` at a time. If changes don't show up, stop the server, delete `.next`, and start again.
Supabase free projects pause after about a week idle; restore from the dashboard if the app can't connect.

Open questions (product name, pricing, email provider, etc.) are in the tracker's Decisions tab.
