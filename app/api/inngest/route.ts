// /api/inngest: the endpoint Inngest calls to discover and run background jobs.
// Locally the Inngest dev server (`npm run jobs:dev`) calls it; in production Inngest
// Cloud does, signed with INNGEST_SIGNING_KEY. Not behind sign-in on purpose.
// Vendor: Inngest (docs/VENDORS.md).

import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { functions } from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({ client: inngest, functions });
