// Deal actions: create, update, move on the board, delete, and add/remove contacts.
// Board order uses a float `position`: a dropped card gets the midpoint between its
// new neighbours, so only the moved deal is written.

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readCustomFor } from "@/lib/custom-fields-server";
import { getWorkspaceBySlug } from "@/lib/workspaces";

export type DealInput = Partial<Record<"name" | "value" | "close_date" | "stage_id" | "company_name" | "owner_id" | "notes", string>>;
export type DealFormState = { error?: string; values?: DealInput; custom?: Record<string, string> };

const FIELDS = ["name", "value", "close_date", "stage_id", "company_name", "owner_id", "notes"] as const;

function readForm(formData: FormData): DealInput {
  const v: DealInput = {};
  for (const f of FIELDS) v[f] = String(formData.get(f) ?? "").trim();
  return v;
}

function parseValue(raw?: string): number | null {
  const n = Number((raw ?? "").replace(/[$,\s]/g, "") || 0);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

async function findOrCreateCompany(workspaceId: string, name?: string): Promise<string | null> {
  if (!name) return null;
  const supabase = await createClient();
  // ilike treats % and _ as wildcards; escape them so the match is exact.
  const escaped = name.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data: found } = await supabase.from("companies").select("id").eq("workspace_id", workspaceId).ilike("name", escaped).maybeSingle();
  if (found) return found.id;
  const { data, error } = await supabase.from("companies").insert({ workspace_id: workspaceId, name }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

async function toRow(workspaceId: string, v: DealInput) {
  return {
    name: v.name!,
    value: parseValue(v.value)!,
    close_date: v.close_date || null,
    stage_id: v.stage_id!,
    company_id: await findOrCreateCompany(workspaceId, v.company_name),
    owner_id: v.owner_id || null,
    notes: v.notes || null,
  };
}

function validate(v: DealInput) {
  if (!v.name) return "Please fill in: deal name.";
  if (parseValue(v.value) === null) return "Value must be a positive number.";
  if (!v.stage_id) return "Pick a stage.";
}

function refresh(slug: string) {
  revalidatePath(`/w/${slug}/deals`, "layout");
  revalidatePath(`/w/${slug}/companies`, "layout");
}

export async function createDeal(slug: string, _prev: DealFormState, formData: FormData): Promise<DealFormState> {
  const values = readForm(formData);
  const invalid = validate(values);
  if (invalid) return { error: invalid, values };
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) return { error: "Workspace not found.", values };
  const cf = await readCustomFor(ws.id, "deal", formData);
  if ("error" in cf) return { error: cf.error, values, custom: cf.raw };

  const supabase = await createClient();
  // New deals go to the top of their column.
  const { data: top } = await supabase.from("deals").select("position").eq("stage_id", values.stage_id!).order("position").limit(1).maybeSingle();
  const { data, error } = await supabase
    .from("deals")
    // pipeline_id is set from the stage by a trigger; the placeholder satisfies the type.
    .insert({ ...(await toRow(ws.id, values)), custom: cf.values, workspace_id: ws.id, pipeline_id: "00000000-0000-0000-0000-000000000000", position: (top?.position ?? 1) - 1 })
    .select("id")
    .single();
  if (error) return { error: error.message, values };

  const contactId = String(formData.get("contact_id") ?? "");
  if (contactId) await supabase.from("deal_contacts").insert({ deal_id: data.id, contact_id: contactId, workspace_id: ws.id });

  refresh(slug);
  redirect(`/w/${slug}/deals/${data.id}`);
}

export async function updateDeal(slug: string, id: string, _prev: DealFormState, formData: FormData): Promise<DealFormState> {
  const values = readForm(formData);
  const invalid = validate(values);
  if (invalid) return { error: invalid, values };
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) return { error: "Workspace not found.", values };
  const cf = await readCustomFor(ws.id, "deal", formData, id);
  if ("error" in cf) return { error: cf.error, values, custom: cf.raw };

  const supabase = await createClient();
  const { error } = await supabase.from("deals").update({ ...(await toRow(ws.id, values)), custom: cf.values }).eq("id", id);
  if (error) return { error: error.message, values };
  refresh(slug);
  return { values };
}

// Called from the board after a drag. Position is a float between neighbours.
export async function moveDeal(slug: string, id: string, stageId: string, position: number) {
  const supabase = await createClient();
  const { error } = await supabase.from("deals").update({ stage_id: stageId, position }).eq("id", id);
  if (error) throw new Error(error.message);
  refresh(slug);
}

export async function deleteDeal(slug: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh(slug);
  redirect(`/w/${slug}/deals`);
}

export async function addDealContact(slug: string, dealId: string, formData: FormData) {
  const contactId = String(formData.get("contact_id") ?? "");
  const ws = await getWorkspaceBySlug(slug);
  if (!ws || !contactId) return;
  const supabase = await createClient();
  await supabase.from("deal_contacts").upsert({ deal_id: dealId, contact_id: contactId, workspace_id: ws.id });
  revalidatePath(`/w/${slug}/deals/${dealId}`);
}

export async function removeDealContact(slug: string, dealId: string, contactId: string) {
  const supabase = await createClient();
  await supabase.from("deal_contacts").delete().eq("deal_id", dealId).eq("contact_id", contactId);
  revalidatePath(`/w/${slug}/deals/${dealId}`);
}
