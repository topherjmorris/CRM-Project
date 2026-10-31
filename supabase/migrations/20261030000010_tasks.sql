-- CRM-05: tasks and reminders.
-- A task can be a plain to-do, a call, a LinkedIn touch or an email, optionally
-- linked to a contact, company and/or deal. Outreach sequences (OUT-07) will
-- create call and LinkedIn tasks with source = 'sequence'.
-- Creating and completing a task are logged on the Activity timeline.

create type public.task_type as enum ('todo', 'call', 'linkedin', 'email');

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 1 and 300),
  type public.task_type not null default 'todo',
  notes text check (char_length(notes) <= 10000),
  -- Null means "no due date". Stored as an instant; shown in the viewer's time zone.
  due_at timestamptz,
  assignee_id uuid references auth.users (id) on delete set null,
  contact_id uuid references public.contacts (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  completed_at timestamptz,
  completed_by uuid references auth.users (id) on delete set null,
  source text not null default 'manual',
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- "My day" and the sidebar badge: open tasks for one person by due time.
create index tasks_open_assignee_idx on public.tasks (workspace_id, assignee_id, due_at) where completed_at is null;
create index tasks_contact_idx on public.tasks (contact_id) where contact_id is not null;
create index tasks_company_idx on public.tasks (company_id) where company_id is not null;
create index tasks_deal_idx on public.tasks (deal_id) where deal_id is not null;

create trigger tasks_touch before update on public.tasks
  for each row execute function public.touch_updated_at();

alter table public.tasks enable row level security;
create policy "members manage tasks" on public.tasks for all
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- Timeline events. Only tasks linked to a record appear (a bare to-do has no timeline).
create function public.log_task_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  kind text;
begin
  if new.contact_id is null and new.company_id is null and new.deal_id is null then
    return null;
  end if;
  if tg_op = 'INSERT' then
    kind := 'task_created';
  elsif old.completed_at is null and new.completed_at is not null then
    kind := 'task_completed';
  elsif old.completed_at is not null and new.completed_at is null then
    kind := 'task_reopened';
  else
    return null;
  end if;
  insert into public.activities (workspace_id, type, contact_id, company_id, deal_id, actor_id, meta)
  values (new.workspace_id, kind, new.contact_id, new.company_id, new.deal_id, auth.uid(),
          jsonb_build_object('task_id', new.id, 'title', new.title, 'task_type', new.type, 'due_at', new.due_at));
  return null;
end;
$$;

create trigger tasks_log_created after insert on public.tasks
  for each row execute function public.log_task_event();
create trigger tasks_log_completed after update of completed_at on public.tasks
  for each row execute function public.log_task_event();
