import { createClient } from "@/lib/supabase/server";

export type WorkspaceRole = "owner" | "admin" | "member";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  created_at: string;
};

export type WorkspaceWithRole = Workspace & { role: WorkspaceRole };

// Workspaces the signed-in user belongs to, with their role in each.
export async function getMyWorkspaces(): Promise<WorkspaceWithRole[]> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspaces(*)")
    .eq("user_id", auth.user.id);
  if (error) throw error;

  return (data ?? []).flatMap((row) => {
    const ws = row.workspaces as unknown as Workspace | null;
    return ws ? [{ ...ws, role: row.role as WorkspaceRole }] : [];
  });
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// Creates a workspace and makes the caller its owner.
export async function createWorkspace(name: string, slug = slugify(name)): Promise<Workspace> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_workspace", { ws_name: name, ws_slug: slug });
  if (error) throw error;
  return data as Workspace;
}
