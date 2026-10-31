-- Leads: people who aren't contacts yet (inbound, ad leads, prospects).
-- A lead is worked through statuses and then converted into a contact with
-- convert_lead(), which can also create the company and a deal. The lead's
-- activity history carries over to the new contact's timeline.

create type public.lead_status as enum ('new', 'contacted', 'qualified', 'unqualified', 'converted');

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  first_name text not null default '' check (char_length(first_name) <= 100),
  last_name text not null default '' check (char_length(last_name) <= 100),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (char_length(phone) <= 40),
  job_title text check (char_length(job_title) <= 120),
  company_name text check (char_length(company_name) <= 200),
  linkedin_url text check (linkedin_url is null or linkedin_url ~* '^https?://'),
  source text not null default 'manual' check (char_length(source) <= 60),
  status public.lead_status not null default 'new',
  notes text check (char_length(notes) <= 10000),
  owner_id uuid references auth.users (id) on delete set null,
  converted_contact_id uuid references public.contacts (id) on delete set null,
  converted_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leads_has_identity check (first_name <> '' or last_name <> '' or email is not null or phone is not null)
);
create index leads_workspace_status_idx on public.leads (workspace_id, status, created_at desc);
create index leads_email_idx on public.leads (workspace_id, lower(email)) where email is not null;

create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

alter table public.leads enable row level security;
create policy "members manage leads" on public.leads for all
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

-- Activities can now belong to a lead too.
alter table public.activities add column lead_id uuid references public.leads (id) on delete cascade;
create index activities_lead_idx on public.activities (lead_id, occurred_at desc) where lead_id is not null;
alter table public.activities drop constraint activities_has_subject;
alter table public.activities add constraint activities_has_subject
  check (contact_id is not null or company_id is not null or deal_id is not null or lead_id is not null);

-- Deleting a converted lead keeps its history on the contact (same idea as
-- unlink_shared_activities for contacts/companies/deals).
create or replace function public.unlink_shared_activities()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'companies' then
    update public.activities set company_id = null
    where company_id = old.id and (contact_id is not null or deal_id is not null or lead_id is not null);
  elsif tg_table_name = 'deals' then
    update public.activities set deal_id = null
    where deal_id = old.id and (contact_id is not null or company_id is not null or lead_id is not null);
  elsif tg_table_name = 'contacts' then
    update public.activities set contact_id = null
    where contact_id = old.id and (deal_id is not null or company_id is not null or lead_id is not null);
  elsif tg_table_name = 'leads' then
    update public.activities set lead_id = null
    where lead_id = old.id and (contact_id is not null or deal_id is not null or company_id is not null);
  end if;
  return old;
end;
$$;
create trigger leads_unlink_activities before delete on public.leads
  for each row execute function public.unlink_shared_activities();

-- Automatic lead events: created, status changed, fields edited.
create function public.log_lead_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  changes jsonb;
begin
  if tg_op = 'INSERT' then
    insert into public.activities (workspace_id, type, lead_id, actor_id, meta)
    values (new.workspace_id, 'lead_created', new.id, auth.uid(), jsonb_build_object('source', new.source));
    return null;
  end if;
  -- Conversion logs its own event in convert_lead().
  if new.status = 'converted' then
    return null;
  end if;
  if old.status is distinct from new.status then
    insert into public.activities (workspace_id, type, lead_id, actor_id, meta)
    values (new.workspace_id, 'lead_status_changed', new.id, auth.uid(),
            jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  changes := public.changed_fields(to_jsonb(old), to_jsonb(new),
    array['id', 'workspace_id', 'created_at', 'updated_at', 'created_by', 'status',
          'converted_contact_id', 'converted_at']);
  if jsonb_array_length(changes) > 0 then
    insert into public.activities (workspace_id, type, lead_id, actor_id, meta)
    values (new.workspace_id, 'lead_updated', new.id, auth.uid(), jsonb_build_object('changes', changes));
  end if;
  return null;
end;
$$;
create trigger leads_log after insert or update on public.leads
  for each row execute function public.log_lead_event();

-- Convert a lead into a contact in one transaction.
-- * Finds the company by name (case-insensitive) or creates it.
-- * Reuses an existing contact with the same email instead of duplicating it.
-- * Optionally creates a deal in the given stage, linked to the contact.
-- * Moves the lead's activity onto the contact and marks the lead converted.
-- Returns the contact id. Runs as definer (to write system activities), so it
-- checks workspace membership itself.
create function public.convert_lead(
  p_lead_id uuid,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_job_title text,
  p_company_name text,
  p_deal_name text default null,
  p_deal_value numeric default 0,
  p_stage_id uuid default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  l public.leads;
  v_company uuid;
  v_contact uuid;
  v_existing boolean := false;
  v_deal uuid;
begin
  select * into l from public.leads where id = p_lead_id for update;
  if l.id is null or not public.is_workspace_member(l.workspace_id) then
    raise exception 'lead not found';
  end if;
  if l.status = 'converted' then
    raise exception 'lead is already converted';
  end if;

  if coalesce(btrim(p_company_name), '') <> '' then
    select id into v_company from public.companies
    where workspace_id = l.workspace_id and lower(name) = lower(btrim(p_company_name));
    if v_company is null then
      insert into public.companies (workspace_id, name, created_by)
      values (l.workspace_id, btrim(p_company_name), auth.uid()) returning id into v_company;
    end if;
  end if;

  if coalesce(btrim(p_email), '') <> '' then
    select id into v_contact from public.contacts
    where workspace_id = l.workspace_id and lower(email) = lower(btrim(p_email));
    v_existing := v_contact is not null;
  end if;

  if v_contact is null then
    insert into public.contacts (workspace_id, first_name, last_name, email, phone, job_title,
                                 linkedin_url, notes, source, owner_id, company_id, created_by)
    values (l.workspace_id, coalesce(btrim(p_first_name), ''), coalesce(btrim(p_last_name), ''),
            nullif(lower(btrim(p_email)), ''), nullif(btrim(p_phone), ''), nullif(btrim(p_job_title), ''),
            l.linkedin_url, l.notes, 'lead:' || l.source, coalesce(l.owner_id, auth.uid()), v_company, auth.uid())
    returning id into v_contact;
  end if;

  if coalesce(btrim(p_deal_name), '') <> '' and p_stage_id is not null then
    insert into public.deals (workspace_id, pipeline_id, stage_id, name, value, company_id, owner_id, created_by)
    values (l.workspace_id, '00000000-0000-0000-0000-000000000000', p_stage_id, btrim(p_deal_name),
            greatest(coalesce(p_deal_value, 0), 0), v_company, coalesce(l.owner_id, auth.uid()), auth.uid())
    returning id into v_deal;
    insert into public.deal_contacts (deal_id, contact_id, workspace_id) values (v_deal, v_contact, l.workspace_id);
  end if;

  -- Carry the lead's history over to the contact (it stays linked to the lead too).
  update public.activities set contact_id = v_contact, company_id = coalesce(company_id, v_company)
  where lead_id = l.id and contact_id is null;

  update public.leads set status = 'converted', converted_contact_id = v_contact, converted_at = now()
  where id = l.id;

  insert into public.activities (workspace_id, type, lead_id, contact_id, company_id, deal_id, actor_id, meta)
  values (l.workspace_id, 'lead_converted', l.id, v_contact, v_company, v_deal, auth.uid(),
          jsonb_build_object('existing_contact', v_existing, 'deal_created', v_deal is not null));

  return v_contact;
end;
$$;
revoke execute on function public.convert_lead(uuid, text, text, text, text, text, text, text, numeric, uuid) from anon;
