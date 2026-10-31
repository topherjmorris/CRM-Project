"use client";

// Full task editor on the task page: title, type, due date/time (local time,
// sent as an ISO instant), assignee, linked contact and deal, and notes.

import { useActionState, useState } from "react";
import { toLocalInput } from "@/components/local-datetime";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TaskFormState } from "@/app/w/[slug]/tasks/actions";
import type { Member } from "@/lib/contacts";
import { TASK_TYPES, type Task } from "@/lib/task-types";

const selectClass = "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm";

type Option = { id: string; label: string };
type Props = {
  action: (prev: TaskFormState, formData: FormData) => Promise<TaskFormState>;
  task: Task;
  members: Member[];
  contacts: Option[];
  deals: Option[];
};

function Field({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

export function TaskForm({ action, task, members, contacts, deals }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [due, setDue] = useState(task.due_at ? toLocalInput(task.due_at) : "");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>}
      <Field id="title" label="Title">
        <Input id="title" name="title" required defaultValue={task.title} maxLength={300} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="type" label="Type">
          <select id="type" name="type" defaultValue={task.type} className={selectClass}>
            {TASK_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </Field>
        <Field id="due" label="Due">
          <div className="flex gap-2">
            <Input id="due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="w-auto" />
            {due && <Button type="button" variant="ghost" size="sm" onClick={() => setDue("")}>Clear</Button>}
          </div>
          <input type="hidden" name="due_at" value={due ? new Date(due).toISOString() : ""} />
        </Field>
        <Field id="assignee_id" label="Assigned to">
          <select id="assignee_id" name="assignee_id" defaultValue={task.assignee_id ?? ""} className={selectClass}>
            <option value="">Unassigned</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </Field>
        <Field id="contact_id" label="Contact">
          <select id="contact_id" name="contact_id" defaultValue={task.contact_id ?? ""} className={selectClass}>
            <option value="">None</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </Field>
        <Field id="deal_id" label="Deal">
          <select id="deal_id" name="deal_id" defaultValue={task.deal_id ?? ""} className={selectClass}>
            <option value="">None</option>
            {deals.map((d) => (
              <option key={d.id} value={d.id}>{d.label}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field id="notes" label="Notes">
        <Textarea id="notes" name="notes" defaultValue={task.notes ?? ""} rows={4} maxLength={10000} />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button>
        {state.ok && !pending && <span className="text-sm text-muted-foreground" role="status">Saved</span>}
      </div>
    </form>
  );
}
