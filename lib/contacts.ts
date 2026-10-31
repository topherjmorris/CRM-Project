// Contact types and shared lookups: display names, member and company pickers.

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import type { DetailField } from "@/lib/leads";

export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type Member = { id: string; label: string };

export const CONTACT_FIELDS = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "job_title",
  "company_name",
  "linkedin_url",
  "notes",
  "owner_id",
] as const;
export type ContactInput = Partial<Record<(typeof CONTACT_FIELDS)[number] | DetailField, string>>;

export function contactName(c: Pick<Contact, "first_name" | "last_name" | "email">) {
  return [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Unnamed contact";
}

// Workspace members as owner options.
export async function getMembers(workspaceId: string): Promise<Member[]> {
  const supabase = await createClient();
  const { data: rows } = await supabase.from("workspace_members").select("user_id").eq("workspace_id", workspaceId);
  const ids = (rows ?? []).map((r) => r.user_id);
  if (!ids.length) return [];
  const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
  return (profiles ?? [])
    .map((p) => ({ id: p.id, label: p.full_name || p.email || "Unknown user" }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

// Company names for the contact form's suggestions.
export async function getCompanyNames(workspaceId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("companies").select("name").eq("workspace_id", workspaceId).order("name").limit(1000);
  return (data ?? []).map((c) => c.name);
}

// Contacts as options for pickers ("Name · Company"). companyId lets a picker show
// only the contacts at a chosen company.
export type ContactOption = { id: string; label: string; companyId: string | null };

export async function getContactOptions(workspaceId: string): Promise<ContactOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contacts")
    .select("id, first_name, last_name, email, company_name, company_id")
    .eq("workspace_id", workspaceId)
    .order("first_name")
    .limit(1000);
  return (data ?? []).map((c) => ({
    id: c.id,
    label: [contactName(c), c.company_name].filter(Boolean).join(" · "),
    companyId: c.company_id,
  }));
}

// Companies as { id, label } options for pickers.
export async function getCompanyOptions(workspaceId: string): Promise<{ id: string; label: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("companies").select("id, name").eq("workspace_id", workspaceId).order("name").limit(1000);
  return (data ?? []).map((c) => ({ id: c.id, label: c.name }));
}
