-- CRM-01: contacts. Companies (CRM-02), tags/custom fields (CRM-06) and
-- the activity timeline (CRM-04) attach to this table later.

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 100),
  last_name text not null default '' check (char_length(last_name) <= 100),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (char_length(phone) <= 40),
  job_title text check (char_length(job_title) <= 120),
  company_name text check (char_length(company_name) <= 200),
  linkedin_url text check (linkedin_url is null or linkedin_url ~* '^https?://'),
  notes text check (char_length(notes) <= 10000),
  source text not null default 'manual',
  lead_score integer not null default 0,
  owner_id uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contacts_has_identity check (first_name <> '' or last_name <> '' or email is not null)
);

create unique index contacts_workspace_email_idx on public.contacts (workspace_id, lower(email)) where email is not null;
create index contacts_workspace_created_idx on public.contacts (workspace_id, created_at desc);
create index contacts_owner_idx on public.contacts (owner_id);

create function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contacts_touch before update on public.contacts
  for each row execute function public.touch_updated_at();

alter table public.contacts enable row level security;

create policy "members read contacts" on public.contacts for select
  using (public.is_workspace_member(workspace_id));
create policy "members add contacts" on public.contacts for insert
  with check (public.is_workspace_member(workspace_id));
create policy "members edit contacts" on public.contacts for update
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));
create policy "members delete contacts" on public.contacts for delete
  using (public.is_workspace_member(workspace_id));
