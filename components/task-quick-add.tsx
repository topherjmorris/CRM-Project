"use client";

// One-line "add a task" form: title, type, optional due date and assignee.
// On a record page `link` ties the new task to that contact, company or deal.
// Pass `companies` and/or `contacts` to show pickers for linking the task (the Tasks
// page shows both; picking a company narrows the contact list to its people).

import { useActionState } from "react";
import { addTask, type TaskFormState } from "@/app/w/[slug]/tasks/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompanyContactPicker } from "@/components/company-contact-picker";
import type { ContactOption, Member } from "@/lib/contacts";
import { TASK_TYPES, type TaskLink } from "@/lib/task-types";

const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2 text-sm";

type Option = { id: string; label: string };
type Props = {
  slug: string;
  link?: TaskLink;
  members: Member[];
  currentUserId: string;
  contacts?: ContactOption[];
  companies?: Option[];
};


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
        <Input type="date" name="due_date" aria-label="Due date" className="w-auto" />
        <select name="assignee_id" defaultValue={currentUserId} aria-label="Assign to" className={selectClass}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.id === currentUserId ? "Me" : m.label}</option>
          ))}
        </select>
        <Button type="submit" disabled={pending}>{pending ? "Adding…" : "Add task"}</Button>
      </div>
      {(contacts || companies) && <CompanyContactPicker companies={companies} contacts={contacts} />}
      {state.error && <p role="alert" className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
