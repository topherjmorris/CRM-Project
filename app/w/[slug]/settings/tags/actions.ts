"use server";

// Settings → Tags: add, rename/recolor and delete tags. Any workspace member can
// manage tags (they're also created on the fly from record forms). Deleting a
// tag removes it from every record (database trigger tags_cleanup).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TAG_COLORS } from "@/lib/tags";
import { getWorkspaceBySlug } from "@/lib/workspaces";

function done(slug: string, error?: string): never {
  revalidatePath(`/w/${slug}`, "layout");
  redirect(`/w/${slug}/settings/tags${error ? `?error=${encodeURIComponent(error)}` : ""}`);
}

function read(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim().slice(0, 40);
  const color = String(formData.get("color") ?? "gray");
  return { name, color: (TAG_COLORS as readonly string[]).includes(color) ? color : "gray" };
}

const dupe = (code?: string) => (code === "23505" ? "A tag with that name already exists." : undefined);

export async function addTag(slug: string, formData: FormData) {
  const { name, color } = read(formData);
  if (!name) done(slug, "Give the tag a name.");
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) done(slug);
  const supabase = await createClient();
  const { error } = await supabase.from("tags").insert({ workspace_id: ws.id, name, color });
  done(slug, error ? (dupe(error.code) ?? error.message) : undefined);
}

export async function updateTag(slug: string, id: string, formData: FormData) {
  const { name, color } = read(formData);
  if (!name) done(slug, "Tag name can't be empty.");
  const supabase = await createClient();
  const { error } = await supabase.from("tags").update({ name, color }).eq("id", id);
  done(slug, error ? (dupe(error.code) ?? error.message) : undefined);
}

export async function deleteTag(slug: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tags").delete().eq("id", id);
  done(slug, error?.message);
}
