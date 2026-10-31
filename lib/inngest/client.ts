// The Inngest client every background job is created from.
// Vendor: Inngest (free Hobby tier, about 50K runs/month). Locally it talks to the dev
// server from `npm run jobs:dev`; in production it needs INNGEST_EVENT_KEY and
// INNGEST_SIGNING_KEY. See docs/VENDORS.md and the README section on background jobs.

import { Inngest } from "inngest";

// One client for the whole app. Locally it talks to the Inngest dev server
// (`npm run jobs:dev`); in production it uses INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY.
export const inngest = new Inngest({
  id: "smb-crm",
  isDev: process.env.NODE_ENV !== "production",
});
