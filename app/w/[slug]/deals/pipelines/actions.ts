// Pipeline and stage management. Stages and pipelines that still hold deals can't be
// deleted (the database also refuses: deals.stage_id is ON DELETE RESTRICT).

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { StageKind } from "@/lib/deals";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/workspaces";

const KINDS: StageKind[] = ["open", "won", "lost"];

function done(slug: string, error?: string): never {
  revalidatePath(`/w/${slug}/deals`, "layout");
  redirect(`/w/${slug}/deals/pipelines${error ? `?error=${encodeURIComponent(error)}` : ""}`);
}

export async function addPipeline(slug: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const ws = await getWorkspaceBySlug(slug);
  if (!ws || !name) done(slug, "Enter a pipeline name.");
  const supabase = await createClient();
  const { count } = await supabase.from("pipelines").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id);
  const { data: p, error } = await supabase
    .from("pipelines")
    .insert({ workspace_id: ws.id, name, position: count ?? 0 })
    .select("id")
    .single();
  if (error) done(slug, error.code === "23505" ? "A pipeline with that name already exists." : error.message);
  await supabase.from("pipeline_stages").insert([
    { workspace_id: ws.id, pipeline_id: p.id, name: "New", kind: "open", position: 0 },
    { workspace_id: ws.id, pipeline_id: p.id, name: "Won", kind: "won", position: 1 },
    { workspace_id: ws.id, pipeline_id: p.id, name: "Lost", kind: "lost", position: 2 },
  ]);
  done(slug);
}

export async function renamePipeline(slug: string, id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) done(slug, "Pipeline name can't be empty.");
  const supabase = await createClient();
  const { error } = await supabase.from("pipelines").update({ name }).eq("id", id);
  done(slug, error ? (error.code === "23505" ? "A pipeline with that name already exists." : error.message) : undefined);
}

export async function deletePipeline(slug: string, id: string) {
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) done(slug);
  const supabase = await createClient();
  const [{ count: pipelines }, { count: deals }] = await Promise.all([
    supabase.from("pipelines").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id),
    supabase.from("deals").select("id", { count: "exact", head: true }).eq("pipeline_id", id),
  ]);
  if ((pipelines ?? 0) <= 1) done(slug, "You need at least one pipeline.");
  if (deals) done(slug, `Move or delete its ${deals} ${deals === 1 ? "deal" : "deals"} first.`);
  const { error } = await supabase.from("pipelines").delete().eq("id", id);
  done(slug, error?.message);
}

export async function addStage(slug: string, pipelineId: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const ws = await getWorkspaceBySlug(slug);
  if (!ws || !name) done(slug, "Enter a stage name.");
  const supabase = await createClient();
  // New stages go after the last open stage, before Won/Lost.
  const { data: stages } = await supabase.from("pipeline_stages").select("id, kind, position").eq("pipeline_id", pipelineId).order("position");
  const list = stages ?? [];
  const insertAt = list.filter((s) => s.kind === "open").length;
  for (const s of list.slice(insertAt)) {
    await supabase.from("pipeline_stages").update({ position: s.position + 1 }).eq("id", s.id);
  }
  const { error } = await supabase
    .from("pipeline_stages")
    .insert({ workspace_id: ws.id, pipeline_id: pipelineId, name, kind: "open", position: insertAt });
  done(slug, error?.message);
}

export async function updateStage(slug: string, id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind")) as StageKind;
  if (!name) done(slug, "Stage name can't be empty.");
  if (!KINDS.includes(kind)) done(slug, "Pick open, won or lost.");
  const supabase = await createClient();
  const { error } = await supabase.from("pipeline_stages").update({ name, kind }).eq("id", id);
  done(slug, error?.message);
}

export async function moveStage(slug: string, pipelineId: string, id: string, direction: "up" | "down") {
  const supabase = await createClient();
  const { data } = await supabase.from("pipeline_stages").select("id").eq("pipeline_id", pipelineId).order("position");
  const ids = (data ?? []).map((s) => s.id);
  const i = ids.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) done(slug);
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((sid, position) => supabase.from("pipeline_stages").update({ position }).eq("id", sid)));
  done(slug);
}

export async function deleteStage(slug: string, pipelineId: string, id: string) {
  const supabase = await createClient();
  const [{ count: stages }, { count: deals }] = await Promise.all([
    supabase.from("pipeline_stages").select("id", { count: "exact", head: true }).eq("pipeline_id", pipelineId),
    supabase.from("deals").select("id", { count: "exact", head: true }).eq("stage_id", id),
  ]);
  if ((stages ?? 0) <= 1) done(slug, "A pipeline needs at least one stage.");
  if (deals) done(slug, `Move its ${deals} ${deals === 1 ? "deal" : "deals"} to another stage first.`);
  const { error } = await supabase.from("pipeline_stages").delete().eq("id", id);
  done(slug, error?.message);
}
