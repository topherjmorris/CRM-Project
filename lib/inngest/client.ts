import { Inngest } from "inngest";

// One client for the whole app. Locally it talks to the Inngest dev server
// (`npm run jobs:dev`); in production it uses INNGEST_EVENT_KEY / INNGEST_SIGNING_KEY.
export const inngest = new Inngest({
  id: "smb-crm",
  isDev: process.env.NODE_ENV !== "production",
});
