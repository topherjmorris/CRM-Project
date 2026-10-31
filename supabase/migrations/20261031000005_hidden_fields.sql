-- CRM-06: let a workspace switch off optional built-in fields (e.g. X/Twitter,
-- mailing address) per record type. A row here means "hidden". Hidden fields
-- keep their stored values; the forms just stop showing them. Which fields are
-- optional is decided by the app (lib/builtin-fields.ts).

create table public.hidden_fields (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entity public.custom_entity not null,
  field text not null check (field ~ '^[a-z][a-z0-9_]{0,49}$'),
  created_at timestamptz not null default now(),
  primary key (workspace_id, entity, field)
);

alter table public.hidden_fields enable row level security;
create policy "members read hidden fields" on public.hidden_fields for select
  using (public.is_workspace_member(workspace_id));
create policy "admins manage hidden fields" on public.hidden_fields for all
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));
