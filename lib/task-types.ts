// Task types shared by server and browser code (no database access here).

import type { Database } from "@/lib/database.types";

export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskType = Database["public"]["Enums"]["task_type"];

export const TASK_TYPES: { value: TaskType; label: string }[] = [
  { value: "todo", label: "To-do" },
  { value: "call", label: "Call" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "email", label: "Email" },
];

// A task plus the names needed to show it in a list.
export type TaskRow = Pick<Task, "id" | "title" | "type" | "due_at" | "completed_at" | "assignee_id" | "contact_id" | "company_id" | "deal_id"> & {
  assignee_label: string | null;
  contact_label: string | null;
  company_label: string | null;
  deal_label: string | null;
};

// Where a task is linked from when created on a record page.
export type TaskLink = { contact_id?: string; company_id?: string; deal_id?: string };
