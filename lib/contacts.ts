import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

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
export type ContactInput = Partial<Record<(typeof CONTACT_FIELDS)[number], string>>;

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
