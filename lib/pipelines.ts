import { createClient } from "@/lib/supabase/server";

export async function getPipelines(workspaceId: string) {
  const supabase = await createClient();
  const { data: pipelines } = await supabase.from("pipelines").select("*").eq("workspace_id", workspaceId).order("position").order("created_at");
  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("position");
  return (pipelines ?? []).map((p) => ({ ...p, stages: (stages ?? []).filter((s) => s.pipeline_id === p.id) }));
}
export type PipelineWithStages = Awaited<ReturnType<typeof getPipelines>>[number];
