"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/workspaces";

export type NoteState = { error?: string; ok?: number };

type Subject = { kind: "contact" | "company" | "deal"; id: string };

function parseWhen(raw: FormDataEntryValue | null): string | null {
  const s = String(raw ?? "");
  if (!s) return new Date().toISOString();
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function refresh(slug: string) {
  for (const section of ["contacts", "companies", "deals"]) revalidatePath(`/w/${slug}/${section}`, "layout");
}

export async function addNote(slug: string, subject: Subject, _prev: NoteState, formData: FormData): Promise<NoteState> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "Write something first." };
  const occurred_at = parseWhen(formData.get("occurred_at"));
  if (!occurred_at) return { error: "That date and time isn't valid." };

  const ws = await getWorkspaceBySlug(slug);
  if (!ws) return { error: "Workspace not found." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  // A note on a deal also links its company; a note on a contact links their company.
  let company_id: string | null = subject.kind === "company" ? subject.id : null;
  if (subject.kind === "contact") {
    company_id = (await supabase.from("contacts").select("company_id").eq("id", subject.id).single()).data?.company_id ?? null;
  } else if (subject.kind === "deal") {
    company_id = (await supabase.from("deals").select("company_id").eq("id", subject.id).single()).data?.company_id ?? null;
  }

  const { error } = await supabase.from("activities").insert({
    workspace_id: ws.id,
    type: "note",
    body,
    occurred_at,
    actor_id: auth.user!.id,
    contact_id: subject.kind === "contact" ? subject.id : null,
    deal_id: subject.kind === "deal" ? subject.id : null,
    company_id,
  });
  if (error) return { error: error.message };
  refresh(slug);
  return { ok: Date.now() };
}

export async function updateNote(slug: string, id: string, _prev: NoteState, formData: FormData): Promise<NoteState> {
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { error: "A note can't be empty." };
  const occurred_at = parseWhen(formData.get("occurred_at"));
  if (!occurred_at) return { error: "That date and time isn't valid." };
  const supabase = await createClient();
  const { error, count } = await supabase.from("activities").update({ body, occurred_at }, { count: "exact" }).eq("id", id);
  if (error) return { error: error.message };
  if (!count) return { error: "You can only edit your own notes." };
  refresh(slug);
  return { ok: Date.now() };
}

export async function deleteNote(slug: string, id: string) {
  const supabase = await createClient();
  await supabase.from("activities").delete().eq("id", id);
  refresh(slug);
}
