// Loads a workspace's lead stages in order (server only).

import { createClient } from "@/lib/supabase/server";

export async function getLeadStages(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("lead_stages").select("*").eq("workspace_id", workspaceId).order("position");
  return data ?? [];
}
