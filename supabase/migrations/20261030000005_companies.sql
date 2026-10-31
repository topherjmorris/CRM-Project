-- CRM-02: companies, linked from contacts.
-- contacts.company_name stays as a cached copy of the linked company's name
-- so search and lists don't need a join; a trigger keeps it in sync.

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  domain text check (domain is null or domain ~* '^[a-z0-9.-]+\.[a-z]{2,}$'),
  industry text check (char_length(industry) <= 120),
  size text check (size in ('1-10', '11-50', '51-200', '201-500', '500+')),
  phone text check (char_length(phone) <= 40),
  notes text check (char_length(notes) <= 10000),
  owner_id uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index companies_workspace_name_idx on public.companies (workspace_id, lower(name));
create unique index companies_workspace_domain_idx on public.companies (workspace_id, lower(domain)) where domain is not null;

create trigger companies_touch before update on public.companies
  for each row execute function public.touch_updated_at();

alter table public.companies enable row level security;
create policy "members read companies" on public.companies for select using (public.is_workspace_member(workspace_id));
create policy "members add companies" on public.companies for insert with check (public.is_workspace_member(workspace_id));
create policy "members edit companies" on public.companies for update
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members delete companies" on public.companies for delete using (public.is_workspace_member(workspace_id));

alter table public.contacts add column company_id uuid references public.companies (id) on delete set null;
create index contacts_company_idx on public.contacts (company_id);

-- Backfill: one company per distinct name per workspace
insert into public.companies (workspace_id, name, created_by)
select distinct on (workspace_id, lower(btrim(company_name))) workspace_id, btrim(company_name), created_by
from public.contacts
where company_name is not null and btrim(company_name) <> ''
order by workspace_id, lower(btrim(company_name)), created_at;

update public.contacts c set company_id = co.id
from public.companies co
where co.workspace_id = c.workspace_id and lower(co.name) = lower(btrim(c.company_name));

-- Keep the cached name in sync
create function public.sync_contact_company_name()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.company_id is null then
    new.company_name := null;
  elsif tg_op = 'INSERT' or new.company_id is distinct from old.company_id then
    select name into new.company_name from public.companies where id = new.company_id;
  end if;
  return new;
end;
$$;
create trigger contacts_company_name before insert or update of company_id on public.contacts
  for each row execute function public.sync_contact_company_name();

create function public.propagate_company_name()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.contacts set company_name = new.name where company_id = new.id;
  return null;
end;
$$;
create trigger companies_name_propagate after update of name on public.companies
  for each row when (old.name is distinct from new.name)
  execute function public.propagate_company_name();

-- A deleted company clears the cached name too (FK sets company_id null,
-- which fires contacts_company_name).
