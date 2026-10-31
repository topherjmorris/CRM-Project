-- Leads, round two:
-- 1. Editable lead stages per workspace (replacing the fixed lead_status enum).
--    A stage's kind says whether leads in it are open, unqualified or converted.
--    leads.stage_kind is a copy of the stage's kind (kept by trigger) so lists
--    can filter without a join.
-- 2. More detail on leads: source detail, mailing address, secondary contact
--    info and social links. Contacts get the same columns, and convert_lead()
--    copies them across.

create type public.lead_stage_kind as enum ('open', 'unqualified', 'converted');

create table public.lead_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  kind public.lead_stage_kind not null default 'open',
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index lead_stages_workspace_idx on public.lead_stages (workspace_id, position);

alter table public.lead_stages enable row level security;
create policy "members manage lead stages" on public.lead_stages for all
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

create function public.create_default_lead_stages(ws uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.lead_stages (workspace_id, name, kind, position) values
    (ws, 'New', 'open', 0),
    (ws, 'Contacted', 'open', 1),
    (ws, 'Engaged', 'open', 2),
    (ws, 'Qualified', 'open', 3),
    (ws, 'Unqualified', 'unqualified', 4),
    (ws, 'Converted', 'converted', 5);
end;
$$;
revoke execute on function public.create_default_lead_stages(uuid) from public, anon, authenticated;

create function public.workspaces_default_lead_stages()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.create_default_lead_stages(new.id);
  return new;
end;
$$;
create trigger workspaces_default_lead_stages after insert on public.workspaces
  for each row execute function public.workspaces_default_lead_stages();

select public.create_default_lead_stages(w.id)
from public.workspaces w
where not exists (select 1 from public.lead_stages s where s.workspace_id = w.id);

-- Move leads from status to stage
alter table public.leads
  add column stage_id uuid references public.lead_stages (id) on delete restrict,
  add column stage_kind public.lead_stage_kind not null default 'open';

update public.leads l set stage_id = s.id, stage_kind = s.kind
from public.lead_stages s
where s.workspace_id = l.workspace_id
  and s.name = case l.status
    when 'new' then 'New' when 'contacted' then 'Contacted' when 'qualified' then 'Qualified'
    when 'unqualified' then 'Unqualified' when 'converted' then 'Converted' end;

-- The old trigger reads `status`; drop it before the column goes.
drop trigger leads_log on public.leads;
drop function public.log_lead_event();
drop index public.leads_workspace_status_idx;
alter table public.leads drop column status;
drop type public.lead_status;
alter table public.leads alter column stage_id set not null;
create index leads_workspace_stage_idx on public.leads (workspace_id, stage_kind, created_at desc);

-- New leads with no stage go to the workspace's first open stage; stage_kind
-- always mirrors the stage.
create function public.leads_sync_stage()
returns trigger language plpgsql set search_path = '' as $$
declare
  st public.lead_stages;
begin
  if new.stage_id is null then
    select * into st from public.lead_stages
    where workspace_id = new.workspace_id and kind = 'open' order by position limit 1;
    new.stage_id := st.id;
  else
    select * into st from public.lead_stages where id = new.stage_id;
  end if;
  if st.id is null or st.workspace_id <> new.workspace_id then
    raise exception 'lead stage not found in this workspace';
  end if;
  new.stage_kind := st.kind;
  return new;
end;
$$;
create trigger leads_stage_sync before insert or update of stage_id on public.leads
  for each row execute function public.leads_sync_stage();

-- Extra detail, on leads and contacts alike
alter table public.leads
  add column source_detail text check (char_length(source_detail) <= 200),
  add column mobile_phone text check (char_length(mobile_phone) <= 40),
  add column secondary_email text check (secondary_email is null or secondary_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column website text check (website is null or website ~* '^https?://'),
  add column facebook_url text check (facebook_url is null or facebook_url ~* '^https?://'),
  add column instagram_url text check (instagram_url is null or instagram_url ~* '^https?://'),
  add column x_url text check (x_url is null or x_url ~* '^https?://'),
  add column address_line1 text check (char_length(address_line1) <= 200),
  add column address_line2 text check (char_length(address_line2) <= 200),
  add column city text check (char_length(city) <= 100),
  add column region text check (char_length(region) <= 100),
  add column postal_code text check (char_length(postal_code) <= 20),
  add column country text check (char_length(country) <= 100);

alter table public.contacts
  add column source_detail text check (char_length(source_detail) <= 200),
  add column mobile_phone text check (char_length(mobile_phone) <= 40),
  add column secondary_email text check (secondary_email is null or secondary_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  add column website text check (website is null or website ~* '^https?://'),
  add column facebook_url text check (facebook_url is null or facebook_url ~* '^https?://'),
  add column instagram_url text check (instagram_url is null or instagram_url ~* '^https?://'),
  add column x_url text check (x_url is null or x_url ~* '^https?://'),
  add column address_line1 text check (char_length(address_line1) <= 200),
  add column address_line2 text check (char_length(address_line2) <= 200),
  add column city text check (char_length(city) <= 100),
  add column region text check (char_length(region) <= 100),
  add column postal_code text check (char_length(postal_code) <= 20),
  add column country text check (char_length(country) <= 100);

-- Lead timeline events, now using stage names
create function public.log_lead_event()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  changes jsonb;
  old_name text;
  new_name text;
begin
  if tg_op = 'INSERT' then
    insert into public.activities (workspace_id, type, lead_id, actor_id, meta)
    values (new.workspace_id, 'lead_created', new.id, auth.uid(), jsonb_build_object('source', new.source));
    return null;
  end if;
  -- Conversion logs its own event in convert_lead().
  if new.stage_kind = 'converted' then
    return null;
  end if;
  if old.stage_id is distinct from new.stage_id then
    select name into old_name from public.lead_stages where id = old.stage_id;
    select name into new_name from public.lead_stages where id = new.stage_id;
    insert into public.activities (workspace_id, type, lead_id, actor_id, meta)
    values (new.workspace_id, 'lead_stage_changed', new.id, auth.uid(), jsonb_build_object('from', old_name, 'to', new_name));
  end if;
  changes := public.changed_fields(to_jsonb(old), to_jsonb(new),
    array['id', 'workspace_id', 'created_at', 'updated_at', 'created_by', 'stage_id', 'stage_kind',
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

-- convert_lead(): same as before, but checks stage_kind, moves the lead to the
-- workspace's Converted stage, and copies the new detail fields to the contact.
create or replace function public.convert_lead(
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
  v_converted_stage uuid;
begin
  select * into l from public.leads where id = p_lead_id for update;
  if l.id is null or not public.is_workspace_member(l.workspace_id) then
    raise exception 'lead not found';
  end if;
  if l.stage_kind = 'converted' then
    raise exception 'lead is already converted';
  end if;
  select id into v_converted_stage from public.lead_stages
  where workspace_id = l.workspace_id and kind = 'converted' order by position limit 1;
  if v_converted_stage is null then
    raise exception 'add a stage of type Converted in lead stage settings first';
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
    insert into public.contacts (
      workspace_id, first_name, last_name, email, phone, job_title, linkedin_url, notes, source,
      source_detail, mobile_phone, secondary_email, website, facebook_url, instagram_url, x_url,
      address_line1, address_line2, city, region, postal_code, country,
      owner_id, company_id, created_by)
    values (
      l.workspace_id, coalesce(btrim(p_first_name), ''), coalesce(btrim(p_last_name), ''),
      nullif(lower(btrim(p_email)), ''), nullif(btrim(p_phone), ''), nullif(btrim(p_job_title), ''),
      l.linkedin_url, l.notes, l.source,
      l.source_detail, l.mobile_phone, l.secondary_email, l.website, l.facebook_url, l.instagram_url, l.x_url,
      l.address_line1, l.address_line2, l.city, l.region, l.postal_code, l.country,
      coalesce(l.owner_id, auth.uid()), v_company, auth.uid())
    returning id into v_contact;
  end if;

  if coalesce(btrim(p_deal_name), '') <> '' and p_stage_id is not null then
    insert into public.deals (workspace_id, pipeline_id, stage_id, name, value, company_id, owner_id, created_by)
    values (l.workspace_id, '00000000-0000-0000-0000-000000000000', p_stage_id, btrim(p_deal_name),
            greatest(coalesce(p_deal_value, 0), 0), v_company, coalesce(l.owner_id, auth.uid()), auth.uid())
    returning id into v_deal;
    insert into public.deal_contacts (deal_id, contact_id, workspace_id) values (v_deal, v_contact, l.workspace_id);
  end if;

  update public.activities set contact_id = v_contact, company_id = coalesce(company_id, v_company)
  where lead_id = l.id and contact_id is null;

  update public.leads set stage_id = v_converted_stage, converted_contact_id = v_contact, converted_at = now()
  where id = l.id;

  insert into public.activities (workspace_id, type, lead_id, contact_id, company_id, deal_id, actor_id, meta)
  values (l.workspace_id, 'lead_converted', l.id, v_contact, v_company, v_deal, auth.uid(),
          jsonb_build_object('existing_contact', v_existing, 'deal_created', v_deal is not null));

  return v_contact;
end;
$$;
