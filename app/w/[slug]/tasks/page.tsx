// Tasks page. Tabs: Today (due today or overdue), Upcoming, No due date, Done.
// "Mine" shows tasks assigned to the viewer; "Everyone" shows the whole workspace.
// "Today" uses the viewer's time zone (tz cookie, see lib/time-zone.ts).

import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskList } from "@/components/task-list";
import { TaskQuickAdd } from "@/components/task-quick-add";
import { getCompanyOptions, getContactOptions, getMembers } from "@/lib/contacts";
import { createClient } from "@/lib/supabase/server";
import { listTasks, type TaskView } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { getWorkspaceBySlug } from "@/lib/workspaces";

const VIEWS: { id: TaskView; label: string; empty: string }[] = [
  { id: "today", label: "Today", empty: "Nothing due today. Nice." },
  { id: "upcoming", label: "Upcoming", empty: "No upcoming tasks." },
  { id: "someday", label: "No due date", empty: "No tasks without a due date." },
  { id: "done", label: "Done", empty: "Nothing completed yet." },
];

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ view?: string; who?: string }> };

export default async function TasksPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const ws = await getWorkspaceBySlug(slug);
  if (!ws) notFound();
  const view = VIEWS.find((v) => v.id === sp.view) ?? VIEWS[0];
  const who = sp.who === "all" ? "all" : "me";

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const [tasks, members, contacts, companies] = await Promise.all([
    listTasks(ws.id, auth.user!.id, view.id, who),
    getMembers(ws.id),
    getContactOptions(ws.id),
    getCompanyOptions(ws.id),
  ]);
  const href = (v: string, w: string) => `/w/${slug}/tasks?view=${v}&who=${w}`;
  const tabClass = "rounded-md px-2.5 py-1 text-muted-foreground aria-[current=page]:bg-background aria-[current=page]:text-foreground aria-[current=page]:shadow-xs";

  return (
    <div className="flex flex-col gap-5">
      <TaskQuickAdd slug={slug} members={members} currentUserId={auth.user!.id} contacts={contacts} companies={companies} />
      <div className="flex flex-wrap items-center gap-3">
        <nav className="flex gap-1 rounded-lg bg-muted p-1 text-sm" aria-label="Task views">
          {VIEWS.map((v) => (
            <Link key={v.id} href={href(v.id, who)} aria-current={v.id === view.id ? "page" : undefined} className={tabClass}>
              {v.label}
            </Link>
          ))}
        </nav>
        <nav className={cn("ml-auto flex gap-1 rounded-lg bg-muted p-1 text-sm")} aria-label="Whose tasks">
          <Link href={href(view.id, "me")} aria-current={who === "me" ? "page" : undefined} className={tabClass}>Mine</Link>
          <Link href={href(view.id, "all")} aria-current={who === "all" ? "page" : undefined} className={tabClass}>Everyone</Link>
        </nav>
      </div>
      <TaskList slug={slug} tasks={tasks} empty={view.empty} showAssignee={who === "all"} />
    </div>
  );
}
