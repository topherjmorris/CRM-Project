"use client";

// One-line "add a task" form: title, type, optional due date/time and assignee.
// On a record page `link` ties the new task to that contact, company or deal.
// Pass `contacts` and/or `companies` to show pickers for linking to other records
// (the Tasks page shows both; a company page shows contacts, and so on).
// The due time is typed in local time and converted to an ISO instant before sending.

import { useActionState, useState } from "react";
import { addTask, type TaskFormState } from "@/app/w/[slug]/tasks/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Member } from "@/lib/contacts";
import { TASK_TYPES, type TaskLink } from "@/lib/task-types";

const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm";

type Option = { id: string; label: string };
type Props = {
  slug: string;
  link?: TaskLink;
  members: Member[];
  currentUserId: string;
  contacts?: Option[];
  companies?: Option[];
};

function DueField() {
  const [local, setLocal] = useState("");
  return (
    <>
      <Input type="datetime-local" value={local} onChange={(e) => setLocal(e.target.value)} aria-label="Due date and time" className="w-auto" />
      <input type="hidden" name="due_at" value={local ? new Date(local).toISOString() : ""} />
    </>
  );
}

export function TaskQuickAdd({ slug, link = {}, members, currentUserId, contacts, companies }: Props) {
  const [state, action, pending] = useActionState<TaskFormState, FormData>(addTask.bind(null, slug, link), {});
  // Remount after each successful add to clear the fields.
  return (
    <form key={state.ok ?? 0} action={action} className="flex flex-col gap-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input name="title" required maxLength={300} placeholder="Add a task, e.g. Call about the proposal" aria-label="Task title" className="min-w-48 flex-1" />
        <select name="type" defaultValue="todo" aria-label="Task type" className={selectClass}>
          {TASK_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <DueField />
        <select name="assignee_id" defaultValue={currentUserId} aria-label="Assign to" className={selectClass}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.id === currentUserId ? "Me" : m.label}</option>
          ))}
        </select>
        <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add task"}</Button>
      </div>
      {(contacts || companies) && (
        <div className="flex flex-wrap items-center gap-2">
          {contacts && (
            <select name="contact_id" defaultValue="" aria-label="Link to contact" className={`${selectClass} min-w-0 max-w-full`}>
              <option value="">No contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          )}
          {companies && (
            <select name="company_id" defaultValue="" aria-label="Link to company" className={`${selectClass} min-w-0 max-w-full`}>
              <option value="">No company (or the contact&apos;s)</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          )}
        </div>
      )}
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
