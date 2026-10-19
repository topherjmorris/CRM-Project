"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug, type WorkspaceRole } from "@/lib/workspaces";

const ROLES: WorkspaceRole[] = ["admin", "member"];

async function requireAdmin(slug: string) {
  const ws = await getWorkspaceBySlug(slug);
  if (!ws || (ws.role !== "owner" && ws.role !== "admin")) throw new Error("Only owners and admins can manage the team.");
  return ws;
}

function back(slug: string, msg?: string): never {
  revalidatePath(`/w/${slug}/settings/team`);
  redirect(`/w/${slug}/settings/team${msg ? `?error=${encodeURIComponent(msg)}` : ""}`);
}

export async function inviteMember(slug: string, formData: FormData) {
  const ws = await requireAdmin(slug);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role")) as WorkspaceRole;
  if (!email || !ROLES.includes(role)) back(slug, "Enter an email and pick a role.");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("workspace_invites")
    .insert({ workspace_id: ws.id, email, role, invited_by: auth.user!.id });
  back(slug, error ? (error.code === "23505" ? `${email} already has an open invite.` : error.message) : undefined);
}

export async function revokeInvite(slug: string, inviteId: string) {
  await requireAdmin(slug);
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_invites").delete().eq("id", inviteId);
  back(slug, error?.message);
}

export async function changeRole(slug: string, userId: string, formData: FormData) {
  const ws = await requireAdmin(slug);
  const role = String(formData.get("role")) as WorkspaceRole;
  if (!ROLES.includes(role)) back(slug, "Pick a valid role.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", ws.id)
    .eq("user_id", userId);
  back(slug, error?.message);
}

export async function removeMember(slug: string, userId: string) {
  const ws = await requireAdmin(slug);
  const supabase = await createClient();
  const { error } = await supabase.from("workspace_members").delete().eq("workspace_id", ws.id).eq("user_id", userId);
  back(slug, error?.message);
}
