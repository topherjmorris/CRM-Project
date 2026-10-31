import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";

// Nightly: delete unaccepted invites that expired more than 7 days ago.
// Also runs on demand via the "maintenance/invites.cleanup" event.
export const cleanupExpiredInvites = inngest.createFunction(
  {
    id: "cleanup-expired-invites",
    triggers: [{ cron: "TZ=UTC 0 3 * * *" }, { event: "maintenance/invites.cleanup" }],
  },
  async ({ step }) => {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const deleted = await step.run("delete-expired-invites", async () => {
      const { data, error } = await createAdminClient()
        .from("workspace_invites")
        .delete()
        .is("accepted_at", null)
        .lt("expires_at", cutoff)
        .select("id");
      if (error) throw new Error(error.message);
      return data.length;
    });

    return { deleted, cutoff };
  },
);
