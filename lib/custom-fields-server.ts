// Loads custom field definitions (server only).

import { readCustom, type CustomEntity, type CustomFieldDef } from "@/lib/custom-fields";
import { createClient } from "@/lib/supabase/server";

export async function getCustomFields(workspaceId: string, entity: CustomEntity): Promise<CustomFieldDef[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("custom_fields")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("entity", entity)
    .order("position")
    .order("created_at");
  return data ?? [];
}

const TABLE = { lead: "leads", contact: "contacts", company: "companies", deal: "deals" } as const;

// Reads and validates the custom-field inputs a record form sent. For an existing
// record, values for fields that no longer exist are kept as they were.
export async function readCustomFor(workspaceId: string, entity: CustomEntity, formData: FormData, recordId?: string) {
  const defs = await getCustomFields(workspaceId, entity);
  let existing: unknown = {};
  if (recordId) {
    const supabase = await createClient();
    const { data } = await supabase.from(TABLE[entity]).select("custom").eq("id", recordId).maybeSingle();
    existing = data?.custom ?? {};
  }
  return readCustom(formData, defs, existing);
}
