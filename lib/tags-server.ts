// Tag lookups and saving (server only).

import { createClient } from "@/lib/supabase/server";
import { TAG_COLORS, type TagLite } from "@/lib/tags";

export async function getTags(workspaceId: string): Promise<TagLite[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("tags").select("id, name, color").eq("workspace_id", workspaceId).order("name");
  return data ?? [];
}

// Turns the tag names a form sent (inputs named "tags") into tag ids, creating
// any tag that doesn't exist yet. New tags cycle through the palette.
export async function tagIdsFromForm(workspaceId: string, formData: FormData): Promise<string[]> {
  const names = [...new Set(formData.getAll("tags").map((n) => String(n).trim().slice(0, 40)).filter(Boolean))];
  if (!names.length) return [];
  const all = await getTags(workspaceId);
  const byName = new Map(all.map((t) => [t.name.toLowerCase(), t.id]));
  const ids: string[] = [];
  const supabase = await createClient();
  let n = all.length;
  for (const name of names) {
    let id = byName.get(name.toLowerCase());
    if (!id) {
      const { data, error } = await supabase
        .from("tags")
        .insert({ workspace_id: workspaceId, name, color: TAG_COLORS[n++ % TAG_COLORS.length] })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = data.id;
      byName.set(name.toLowerCase(), id);
    }
    ids.push(id);
  }
  return ids;
}
