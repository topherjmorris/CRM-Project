// Create, update and delete contacts.
// Contacts added by hand must have first name, last name, email and company. The
// database is looser on purpose so imports and ad leads with gaps still save.
// The company is matched by name (case-insensitive) or created on the fly.

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CONTACT_FIELDS, type ContactInput } from "@/lib/contacts";
import { detailError, detailRow, readDetail } from "@/lib/leads";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/workspaces";

export type FormState = { error?: string; values?: ContactInput };

function readForm(formData: FormData): ContactInput {
  const v: ContactInput = {};
  for (const f of CONTACT_FIELDS) v[f] = String(formData.get(f) ?? "").trim();
  return { ...v, ...readDetail(formData) };
}

const REQUIRED: [keyof ContactInput, string][] = [
  ["first_name", "first name"],
  ["last_name", "last name"],
  ["email", "email"],
  ["company_name", "company"],
];

// Contacts added by hand need all four. Imports and ad leads may arrive with gaps,
// so the database itself stays looser.
function missing(v: ContactInput) {
  const gaps = REQUIRED.filter(([f]) => !v[f]).map(([, label]) => label);
  return gaps.length ? `Please fill in: ${gaps.join(", ")}.` : undefined;
}

function toRow(v: ContactInput) {
  let linkedin = v.linkedin_url || null;
  if (linkedin && !/^https?:\/\//i.test(linkedin)) linkedin = `https://${linkedin}`;
  return {
    first_name: v.first_name ?? "",
    last_name: v.last_name ?? "",
    email: v.email ? v.email.toLowerCase() : null,
    phone: v.phone || null,
    job_title: v.job_title || null,
    linkedin_url: linkedin,
    notes: v.notes || null,
    owner_id: v.owner_id || null,
    // Source detail, other contact info, social links and address (shared with leads).
    ...detailRow(v),
  };
}

// Find the workspace's company with this name (case-insensitive), or create it.
async function resolveCompany(workspaceId: string, name: string): Promise<string> {
  const supabase = await createClient();
  // ilike treats % and _ as wildcards; escape them so "50% Off LLC" matches exactly.
  const escaped = name.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  const { data: found } = await supabase
    .from("companies")
    .select("id")
    .eq("workspace_id", workspaceId)
    .ilike("name", escaped)
    .maybeSingle();
  if (found) return found.id;
  const { data, error } = await supabase.from("companies").insert({ workspace_id: workspaceId, name }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

function friendly(error: { code?: string; message: string }) {
  const detail = detailError(error.message);
  if (detail) return detail;
  if (error.code === "23505") return "A contact with that email already exists in this workspace.";
  if (error.message.includes("contacts_has_identity")) return "Add a name or an email.";
  if (error.message.includes("email_check")) return "That email address doesn't look right.";
  return error.message;
}

export async function createContact(slug: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = readForm(formData);
  const gap = missing(values);
  if (gap) return { error: gap, values };
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) return { error: "Workspace not found.", values };

  const company_id = await resolveCompany(ws.id, values.company_name!);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...toRow(values), company_id, workspace_id: ws.id })
    .select("id")
    .single();
  if (error) return { error: friendly(error), values };

  revalidatePath(`/w/${slug}/contacts`);
  redirect(`/w/${slug}/contacts/${data.id}`);
}

export async function updateContact(slug: string, id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const values = readForm(formData);
  const gap = missing(values);
  if (gap) return { error: gap, values };
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) return { error: "Workspace not found.", values };
  const company_id = await resolveCompany(ws.id, values.company_name!);
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").update({ ...toRow(values), company_id }).eq("id", id);
  if (error) return { error: friendly(error), values };

  revalidatePath(`/w/${slug}/contacts`);
  revalidatePath(`/w/${slug}/contacts/${id}`);
  revalidatePath(`/w/${slug}/companies`, "layout");
  return { values };
}

export async function deleteContact(slug: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/w/${slug}/contacts`);
  redirect(`/w/${slug}/contacts`);
}
