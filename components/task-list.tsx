"use client";

// Task list used on the Tasks page and on contact/company/deal pages.
// Ticking the checkbox completes a task immediately (useOptimistic) and saves it in
// the background; overdue tasks are marked in red based on the viewer's clock.

import Link from "next/link";
import { useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { Briefcase, CheckSquare, Mail, Phone, type LucideIcon } from "lucide-react";
import { setTaskDone } from "@/app/w/[slug]/tasks/actions";
import { LocalDateTime } from "@/components/local-datetime";
import type { TaskRow, TaskType } from "@/lib/task-types";
import { cn } from "@/lib/utils";

const TYPE_ICON: Record<TaskType, LucideIcon> = { todo: CheckSquare, call: Phone, linkedin: Briefcase, email: Mail };

const noopSubscribe = () => () => {};
// useSyncExternalStore needs a stable snapshot, so read the clock once per page load.
let pageLoadedAt = 0;
const clientNow = () => (pageLoadedAt ||= Date.now());

type Props = {
  slug: string;
  tasks: TaskRow[];
  // Hide the link back to the record whose page this list is on.
  hide?: "contact" | "company" | "deal";
  empty: string;
  showAssignee?: boolean;
};

export function TaskList({ slug, tasks, hide, empty, showAssignee }: Props) {
  const [items, setDone] = useOptimistic(tasks, (state, change: { id: string; done: boolean }) =>
    state.map((t) => (t.id === change.id ? { ...t, completed_at: change.done ? new Date().toISOString() : null } : t)),
  );
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Read "now" only in the browser so server and client render the same first frame.
  const now = useSyncExternalStore(noopSubscribe, clientNow, () => 0);

  if (!items.length) return <p className="text-sm text-muted-foreground">{empty}</p>;

  return (
    <div className="flex flex-col gap-2">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <ul className="divide-y rounded-lg border">
        {items.map((t) => {
          const Icon = TYPE_ICON[t.type];
          const done = !!t.completed_at;
          const overdue = !done && !!t.due_at && now > 0 && new Date(t.due_at).getTime() < now;
          return (
            <li key={t.id} className="flex items-start gap-3 px-3 py-2.5">
              <input
                type="checkbox"
                checked={done}
                aria-label={done ? `Reopen "${t.title}"` : `Complete "${t.title}"`}
                className="mt-1 size-4 shrink-0 accent-primary"
                onChange={(e) => {
                  const next = e.target.checked;
                  startTransition(async () => {
                    setDone({ id: t.id, done: next });
                    try {
                      await setTaskDone(slug, t.id, next);
                      setError(null);
                    } catch {
                      setError("Couldn't update that task. Refresh and try again.");
                    }
                  });
                }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-label={t.type} />
                  <Link href={`/w/${slug}/tasks/${t.id}`} className={cn("truncate text-sm font-medium hover:underline", done && "text-muted-foreground line-through")}>
                    {t.title}
                  </Link>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {t.due_at ? (
                    <span className={cn(overdue && "font-medium text-destructive")}>
                      {overdue ? "Overdue · " : "Due "}
                      <LocalDateTime iso={t.due_at} />
                    </span>
                  ) : (
                    <span>No due date</span>
                  )}
                  {t.contact_id && hide !== "contact" && (
                    <Link href={`/w/${slug}/contacts/${t.contact_id}`} className="hover:underline">{t.contact_label}</Link>
                  )}
                  {t.deal_id && hide !== "deal" && (
                    <Link href={`/w/${slug}/deals/${t.deal_id}`} className="hover:underline">{t.deal_label}</Link>
                  )}
                  {t.company_id && hide !== "company" && !t.contact_id && !t.deal_id && (
                    <Link href={`/w/${slug}/companies/${t.company_id}`} className="hover:underline">{t.company_label}</Link>
                  )}
                  {showAssignee && <span>{t.assignee_label ?? "Unassigned"}</span>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
