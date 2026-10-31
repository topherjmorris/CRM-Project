"use server";

// Lead stage settings: add, rename/retype, reorder and delete stages.
// Rules: a workspace keeps at least one Open and one Converted stage, and a
// stage that still holds leads can't be deleted (the database also refuses).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { LeadStageKind } from "@/lib/leads";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/workspaces";

const KINDS: LeadStageKind[] = ["open", "unqualified", "converted"];

function done(slug: string, error?: string): never {
  revalidatePath(`/w/${slug}/leads`, "layout");
  redirect(`/w/${slug}/leads/stages${error ? `?error=${encodeURIComponent(error)}` : ""}`);
}

async function stages(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("lead_stages").select("id, kind, position").eq("workspace_id", workspaceId).order("position");
  return data ?? [];
}

export async function addLeadStage(slug: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const ws = await getWorkspaceBySlug(slug);
  if (!ws || !name) done(slug, "Enter a stage name.");
  const supabase = await createClient();
  // New stages go after the last open stage, before Unqualified/Converted.
  const list = await stages(ws.id);
  const at = list.filter((s) => s.kind === "open").length;
  for (const s of list.slice(at)) await supabase.from("lead_stages").update({ position: s.position + 1 }).eq("id", s.id);
  const { error } = await supabase.from("lead_stages").insert({ workspace_id: ws.id, name, kind: "open", position: at });
  done(slug, error?.message);
}

export async function updateLeadStage(slug: string, id: string, formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const kind = String(formData.get("kind")) as LeadStageKind;
  if (!name) done(slug, "Stage name can't be empty.");
  if (!KINDS.includes(kind)) done(slug, "Pick a stage type.");
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) done(slug);
  const list = await stages(ws.id);
  const current = list.find((s) => s.id === id);
  // Changing the type of the last Open or Converted stage would leave none.
  if (current && current.kind !== kind && list.filter((s) => s.kind === current.kind).length === 1 && current.kind !== "unqualified") {
    done(slug, `You need at least one ${current.kind === "open" ? "Open" : "Converted"} stage.`);
  }
  const supabase = await createClient();
  const { error } = await supabase.from("lead_stages").update({ name, kind }).eq("id", id);
  // Leads in this stage pick up the new type (leads.stage_kind is a copy).
  if (!error && current && current.kind !== kind) await supabase.from("leads").update({ stage_kind: kind }).eq("stage_id", id);
  done(slug, error?.message);
}

export async function moveLeadStage(slug: string, id: string, direction: "up" | "down") {
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) done(slug);
  const ids = (await stages(ws.id)).map((s) => s.id);
  const i = ids.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) done(slug);
  [ids[i], ids[j]] = [ids[j], ids[i]];
  const supabase = await createClient();
  await Promise.all(ids.map((sid, position) => supabase.from("lead_stages").update({ position }).eq("id", sid)));
  done(slug);
}

export async function deleteLeadStage(slug: string, id: string) {
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) done(slug);
  const list = await stages(ws.id);
  const current = list.find((s) => s.id === id);
  if (current && current.kind !== "unqualified" && list.filter((s) => s.kind === current.kind).length === 1) {
    done(slug, `You need at least one ${current.kind === "open" ? "Open" : "Converted"} stage.`);
  }
  const supabase = await createClient();
  const { count } = await supabase.from("leads").select("id", { count: "exact", head: true }).eq("stage_id", id);
  if (count) done(slug, `Move its ${count} ${count === 1 ? "lead" : "leads"} to another stage first.`);
  const { error } = await supabase.from("lead_stages").delete().eq("id", id);
  done(slug, error?.message);
}
