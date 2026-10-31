// Task queries for server pages (server only). All run as the signed-in user, so
// row-level security keeps them inside workspaces the user belongs to.

import { createClient } from "@/lib/supabase/server";
import type { TaskRow } from "@/lib/task-types";
import { localDateString, viewerTimeZone } from "@/lib/time-zone";

const SELECT =
  "id, title, type, due_date, completed_at, assignee_id, contact_id, company_id, deal_id, contacts(first_name, last_name, email), companies(name), deals(name)";

type Raw = {
  id: string;
  title: string;
  type: TaskRow["type"];
  due_date: string | null;
  completed_at: string | null;
  assignee_id: string | null;
  contact_id: string | null;
  company_id: string | null;
  deal_id: string | null;
  contacts: { first_name: string; last_name: string; email: string | null } | null;
  companies: { name: string } | null;
  deals: { name: string } | null;
};

// Adds display names for the linked record and the assignee.
async function decorate(rows: Raw[]): Promise<TaskRow[]> {
  const supabase = await createClient();
  const ids = [...new Set(rows.map((r) => r.assignee_id).filter((x): x is string => !!x))];
  const { data: profiles } = ids.length ? await supabase.from("profiles").select("id, full_name, email").in("id", ids) : { data: [] };
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email]));
  return rows.map(({ contacts, companies, deals, ...t }) => ({
    ...t,
    assignee_label: t.assignee_id ? (names.get(t.assignee_id) ?? null) : null,
    contact_label: contacts ? [contacts.first_name, contacts.last_name].filter(Boolean).join(" ") || contacts.email : null,
    company_label: companies?.name ?? null,
    deal_label: deals?.name ?? null,
  }));
}

// The viewer's local date ("YYYY-MM-DD"), from the `tz` cookie. Tasks due on or
// before it count as due today / overdue.
export async function viewerToday() {
  return localDateString(await viewerTimeZone());
}

export type TaskView = "today" | "upcoming" | "someday" | "done";

// The Tasks page lists. `who` is "me" (assigned to the viewer) or "all".
export async function listTasks(workspaceId: string, userId: string, view: TaskView, who: "me" | "all") {
  const supabase = await createClient();
  const today = await viewerToday();
  let q = supabase.from("tasks").select(SELECT).eq("workspace_id", workspaceId);
  if (who === "me") q = q.eq("assignee_id", userId);

  if (view === "done") {
    q = q.not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(100);
  } else {
    q = q.is("completed_at", null);
    if (view === "today") q = q.lte("due_date", today).order("due_date").order("created_at");
    else if (view === "upcoming") q = q.gt("due_date", today).order("due_date").limit(200);
    else q = q.is("due_date", null).order("created_at", { ascending: false }).limit(200);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return decorate((data ?? []) as unknown as Raw[]);
}

// Open tasks due today or overdue for one person: the sidebar badge number.
export async function countDueToday(workspaceId: string, userId: string) {
  const supabase = await createClient();
  const today = await viewerToday();
  const { count } = await supabase
    .from("tasks")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("assignee_id", userId)
    .is("completed_at", null)
    .lte("due_date", today);
  return count ?? 0;
}

// Tasks linked to one record, open first, then the 10 most recently completed.
export async function tasksFor(workspaceId: string, link: { kind: "contact" | "company" | "deal"; id: string }) {
  const supabase = await createClient();
  const col = `${link.kind}_id` as const;
  const [open, done] = await Promise.all([
    supabase.from("tasks").select(SELECT).eq("workspace_id", workspaceId).eq(col, link.id).is("completed_at", null).order("due_date", { nullsFirst: false }),
    supabase.from("tasks").select(SELECT).eq("workspace_id", workspaceId).eq(col, link.id).not("completed_at", "is", null).order("completed_at", { ascending: false }).limit(10),
  ]);
  return decorate([...((open.data ?? []) as unknown as Raw[]), ...((done.data ?? []) as unknown as Raw[])]);
}
