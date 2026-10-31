"use server";

// Task actions: quick add (from the Tasks page or a record page), complete/reopen,
// full edit and delete. Timeline entries for linked tasks come from database
// triggers (migration 20261030000010_tasks.sql), not from here.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TASK_TYPES, type TaskLink, type TaskType } from "@/lib/task-types";
import { getWorkspaceBySlug } from "@/lib/workspaces";

export type TaskFormState = { error?: string; ok?: number };

const TYPES = TASK_TYPES.map((t) => t.value);

// Due dates are calendar days ("YYYY-MM-DD" from <input type="date">); empty = none.
// Returns undefined for anything that isn't a real date.
function readDue(formData: FormData): string | null | undefined {
  const raw = String(formData.get("due_date") ?? "");
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const d = new Date(raw + "T00:00:00Z");
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw ? undefined : raw;
}

function uuidOrNull(v: FormDataEntryValue | null | undefined) {
  const s = String(v ?? "");
  return /^[0-9a-f-]{36}$/i.test(s) ? s : null;
}

// Every page that can show tasks or their timeline entries.
function refresh(slug: string) {
  revalidatePath(`/w/${slug}`, "layout");
}

export async function addTask(slug: string, link: TaskLink, _prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "todo") as TaskType;
  const due_date = readDue(formData);
  if (!title) return { error: "Give the task a title." };
  if (!TYPES.includes(type)) return { error: "Pick a task type." };
  if (due_date === undefined) return { error: "That due date isn't valid." };

  const ws = await getWorkspaceBySlug(slug);
  if (!ws) return { error: "Workspace not found." };
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  // Links: the record page's own link wins; otherwise use what was picked in the form.
  const contact_id = link.contact_id ?? uuidOrNull(formData.get("contact_id"));
  const deal_id = link.deal_id ?? null;
  // With no company picked, a task on a contact or deal takes their company, so it
  // also shows on the company page.
  let company_id = link.company_id ?? uuidOrNull(formData.get("company_id"));
  if (!company_id && contact_id) {
    company_id = (await supabase.from("contacts").select("company_id").eq("id", contact_id).single()).data?.company_id ?? null;
  }
  if (!company_id && deal_id) {
    company_id = (await supabase.from("deals").select("company_id").eq("id", deal_id).single()).data?.company_id ?? null;
  }

  const { error } = await supabase.from("tasks").insert({
    workspace_id: ws.id,
    title,
    type,
    due_date,
    assignee_id: uuidOrNull(formData.get("assignee_id")) ?? auth.user!.id,
    contact_id,
    deal_id,
    company_id,
  });
  if (error) return { error: error.message };
  refresh(slug);
  return { ok: Date.now() };
}

export async function setTaskDone(slug: string, id: string, done: boolean) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("tasks")
    .update(done ? { completed_at: new Date().toISOString(), completed_by: auth.user!.id } : { completed_at: null, completed_by: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
  refresh(slug);
}

export async function updateTask(slug: string, id: string, _prev: TaskFormState, formData: FormData): Promise<TaskFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const type = String(formData.get("type") ?? "todo") as TaskType;
  const due_date = readDue(formData);
  if (!title) return { error: "Give the task a title." };
  if (!TYPES.includes(type)) return { error: "Pick a task type." };
  if (due_date === undefined) return { error: "That due date isn't valid." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      type,
      due_date,
      notes: String(formData.get("notes") ?? "").trim() || null,
      assignee_id: uuidOrNull(formData.get("assignee_id")),
      contact_id: uuidOrNull(formData.get("contact_id")),
      company_id: uuidOrNull(formData.get("company_id")),
      deal_id: uuidOrNull(formData.get("deal_id")),
    })
    .eq("id", id);
  if (error) return { error: error.message };
  refresh(slug);
  return { ok: Date.now() };
}

export async function deleteTask(slug: string, id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  refresh(slug);
  redirect(`/w/${slug}/tasks`);
}
