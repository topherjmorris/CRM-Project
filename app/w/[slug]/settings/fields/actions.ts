"use server";

// Custom field setup: add, edit (label, dropdown options), reorder and delete.
// The key is created from the first label and never changes, so renaming a
// field keeps its values. Row-level security limits these to owners and admins.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FIELD_TYPES, keyFromLabel, type CustomEntity, type CustomFieldType } from "@/lib/custom-fields";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/workspaces";

function done(slug: string, entity: string, error?: string): never {
  revalidatePath(`/w/${slug}`, "layout");
  redirect(`/w/${slug}/settings/fields?entity=${entity}${error ? `&error=${encodeURIComponent(error)}` : ""}`);
}

function parseOptions(raw: FormDataEntryValue | null) {
  return [...new Set(String(raw ?? "").split(/[\n,]/).map((o) => o.trim()).filter(Boolean))].slice(0, 100);
}

async function requireAdmin(slug: string) {
  const ws = await getWorkspaceBySlug(slug);
  if (!ws || (ws.role !== "owner" && ws.role !== "admin")) return null;
  return ws;
}

export async function addField(slug: string, entity: CustomEntity, formData: FormData) {
  const ws = await requireAdmin(slug);
  if (!ws) done(slug, entity, "Only owners and admins can change custom fields.");
  const label = String(formData.get("label") ?? "").trim();
  const type = String(formData.get("type")) as CustomFieldType;
  const options = parseOptions(formData.get("options"));
  if (!label) done(slug, entity, "Give the field a name.");
  if (!FIELD_TYPES.some((t) => t.value === type)) done(slug, entity, "Pick a field type.");
  if (type === "select" && !options.length) done(slug, entity, "List the dropdown options, separated by commas.");

  const supabase = await createClient();
  const { count } = await supabase.from("custom_fields").select("id", { count: "exact", head: true }).eq("workspace_id", ws.id).eq("entity", entity);
  const { error } = await supabase.from("custom_fields").insert({
    workspace_id: ws.id,
    entity,
    key: keyFromLabel(label),
    label,
    type,
    options: type === "select" ? options : [],
    position: count ?? 0,
  });
  done(slug, entity, error ? (error.code === "23505" ? "A field with that name already exists here." : error.message) : undefined);
}

export async function updateField(slug: string, entity: CustomEntity, id: string, formData: FormData) {
  const ws = await requireAdmin(slug);
  if (!ws) done(slug, entity, "Only owners and admins can change custom fields.");
  const label = String(formData.get("label") ?? "").trim();
  if (!label) done(slug, entity, "Field name can't be empty.");
  const supabase = await createClient();
  const { data: field } = await supabase.from("custom_fields").select("type").eq("id", id).single();
  const options = parseOptions(formData.get("options"));
  if (field?.type === "select" && !options.length) done(slug, entity, "A dropdown needs at least one option.");
  const { error } = await supabase
    .from("custom_fields")
    .update({ label, ...(field?.type === "select" ? { options } : {}) })
    .eq("id", id);
  done(slug, entity, error?.message);
}

export async function moveField(slug: string, entity: CustomEntity, id: string, direction: "up" | "down") {
  const ws = await requireAdmin(slug);
  if (!ws) done(slug, entity, "Only owners and admins can change custom fields.");
  const supabase = await createClient();
  const { data } = await supabase.from("custom_fields").select("id").eq("workspace_id", ws.id).eq("entity", entity).order("position").order("created_at");
  const ids = (data ?? []).map((f) => f.id);
  const i = ids.indexOf(id);
  const j = direction === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) done(slug, entity);
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((fid, position) => supabase.from("custom_fields").update({ position }).eq("id", fid)));
  done(slug, entity);
}

export async function deleteField(slug: string, entity: CustomEntity, id: string) {
  const ws = await requireAdmin(slug);
  if (!ws) done(slug, entity, "Only owners and admins can change custom fields.");
  const supabase = await createClient();
  const { error } = await supabase.from("custom_fields").delete().eq("id", id);
  done(slug, entity, error?.message);
}
