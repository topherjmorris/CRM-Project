-- CRM-05: tasks are due on a day, not at a time. Replace due_at (timestamp) with
-- due_date (calendar date). "Due today" now means due_date <= the viewer's local
-- date, so there's no time-zone math on the stored value.

alter table public.tasks add column due_date date;
update public.tasks set due_date = (due_at at time zone 'UTC')::date where due_at is not null;

drop index public.tasks_open_assignee_idx;
alter table public.tasks drop column due_at;
create index tasks_open_assignee_idx on public.tasks (workspace_id, assignee_id, due_date) where completed_at is null;

-- Same timeline logging as before, recording due_date instead of due_at.
create or replace function public.log_task_event()
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
          jsonb_build_object('task_id', new.id, 'title', new.title, 'task_type', new.type, 'due_date', new.due_date));
  return null;
end;
$$;
