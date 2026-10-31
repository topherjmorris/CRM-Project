// Task page: mark done/reopen, edit every field, delete. Linked contact and deal
// are shown as links at the top.

import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { LocalDateTime } from "@/components/local-datetime";
import { formatDay } from "@/lib/dates";
import { TaskForm } from "@/components/task-form";
import { Button } from "@/components/ui/button";
import { getCompanyOptions, getContactOptions, getMembers } from "@/lib/contacts";
import { createClient } from "@/lib/supabase/server";
import { getWorkspaceBySlug } from "@/lib/workspaces";
import { deleteTask, setTaskDone, updateTask } from "../actions";

type Props = { params: Promise<{ slug: string; id: string }> };

export default async function TaskPage({ params }: Props) {
  const { slug, id } = await params;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws || !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [{ data: task }, members, contacts, companies, { data: deals }] = await Promise.all([
    supabase.from("tasks").select("*, contacts(first_name, last_name, email), deals(name)").eq("id", id).eq("workspace_id", ws.id).maybeSingle(),
    getMembers(ws.id),
    getContactOptions(ws.id),
    getCompanyOptions(ws.id),
    supabase.from("deals").select("id, name").eq("workspace_id", ws.id).order("name").limit(1000),
  ]);
  if (!task) notFound();

  const { contacts: c, deals: d, ...t } = task;
  const done = !!t.completed_at;

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-0 flex-1">
          <Link href={`/w/${slug}/tasks`} className="text-sm text-muted-foreground hover:underline">← Tasks</Link>
          <h2 className={`mt-1 text-2xl font-semibold ${done ? "text-muted-foreground line-through" : ""}`}>{t.title}</h2>
          <p className="text-sm text-muted-foreground">
            {done ? <>Completed <LocalDateTime iso={t.completed_at!} /></> : t.due_date ? <>Due {formatDay(t.due_date)}</> : "No due date"}
            {t.contact_id && c && (
              <> · <Link href={`/w/${slug}/contacts/${t.contact_id}`} className="hover:underline">{[c.first_name, c.last_name].filter(Boolean).join(" ") || c.email}</Link></>
            )}
            {t.deal_id && d && (
              <> · <Link href={`/w/${slug}/deals/${t.deal_id}`} className="hover:underline">{d.name}</Link></>
            )}
          </p>
        </div>
        <form action={setTaskDone.bind(null, slug, t.id, !done)}>
          <Button type="submit" variant={done ? "outline" : "default"}>{done ? "Reopen" : "Mark done"}</Button>
        </form>
        <ConfirmDeleteButton
          name={`"${t.title}"`}
          description="This removes the task for everyone. Timeline entries about it stay. It can't be undone."
          confirmLabel="Delete task"
          action={deleteTask.bind(null, slug, t.id)}
        />
      </div>
      <TaskForm
        key={t.updated_at}
        action={updateTask.bind(null, slug, t.id)}
        task={t}
        members={members}
        contacts={contacts}
        companies={companies}
        deals={(deals ?? []).map((x) => ({ id: x.id, label: x.name }))}
      />
    </div>
  );
}
