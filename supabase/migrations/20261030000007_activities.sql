-- CRM-04: one activity feed for contacts, companies and deals.
-- Notes are written by people; everything else is written by triggers here
-- (and later by outreach, nurture, ads and sites jobs).
-- An activity can point at a contact, a company and a deal at once, so it
-- shows on each of their timelines.

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  type text not null check (type ~ '^[a-z_]+$'),
  contact_id uuid references public.contacts (id) on delete cascade,
  company_id uuid references public.companies (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete cascade,
  body text check (char_length(body) <= 20000),
  meta jsonb not null default '{}',
  actor_id uuid references auth.users (id) on delete set null default auth.uid(),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint activities_has_subject check (contact_id is not null or company_id is not null or deal_id is not null),
  constraint activities_note_has_body check (type <> 'note' or char_length(btrim(body)) > 0)
);
create index activities_contact_idx on public.activities (contact_id, occurred_at desc) where contact_id is not null;
create index activities_company_idx on public.activities (company_id, occurred_at desc) where company_id is not null;
create index activities_deal_idx on public.activities (deal_id, occurred_at desc) where deal_id is not null;

create trigger activities_touch before update on public.activities
  for each row execute function public.touch_updated_at();

alter table public.activities enable row level security;
create policy "members read activities" on public.activities for select
  using (public.is_workspace_member(workspace_id));
-- People can only write notes, as themselves. System events come from triggers.
create policy "members add notes" on public.activities for insert
  with check (public.is_workspace_member(workspace_id) and type = 'note' and actor_id = auth.uid());
create policy "authors edit own notes" on public.activities for update
  using (type = 'note' and actor_id = auth.uid() and public.is_workspace_member(workspace_id))
  with check (type = 'note' and actor_id = auth.uid());
create policy "authors delete own notes" on public.activities for delete
  using (type = 'note' and actor_id = auth.uid() and public.is_workspace_member(workspace_id));

-- Automatic events -------------------------------------------------------

create function public.log_contact_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.activities (workspace_id, type, contact_id, company_id, actor_id, meta)
  values (new.workspace_id, 'contact_created', new.id, new.company_id, auth.uid(), jsonb_build_object('source', new.source));
  return null;
end;
$$;
create trigger contacts_log_created after insert on public.contacts
  for each row execute function public.log_contact_created();

create function public.log_contact_company_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.company_id is not null then
    insert into public.activities (workspace_id, type, contact_id, company_id, actor_id, meta)
    values (new.workspace_id, 'contact_joined_company', new.id, new.company_id, auth.uid(),
            jsonb_build_object('company', new.company_name));
  end if;
  return null;
end;
$$;
create trigger contacts_log_company after update of company_id on public.contacts
  for each row when (old.company_id is distinct from new.company_id)
  execute function public.log_contact_company_changed();

create function public.log_company_created()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.activities (workspace_id, type, company_id, actor_id)
  values (new.workspace_id, 'company_created', new.id, auth.uid());
  return null;
end;
$$;
create trigger companies_log_created after insert on public.companies
  for each row execute function public.log_company_created();

create function public.log_deal_created()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  st public.pipeline_stages;
begin
  select * into st from public.pipeline_stages where id = new.stage_id;
  insert into public.activities (workspace_id, type, deal_id, company_id, actor_id, meta)
  values (new.workspace_id, 'deal_created', new.id, new.company_id, auth.uid(),
          jsonb_build_object('deal', new.name, 'stage', st.name, 'value', new.value));
  return null;
end;
$$;
create trigger deals_log_created after insert on public.deals
  for each row execute function public.log_deal_created();

create function public.log_deal_stage_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  old_st public.pipeline_stages;
  new_st public.pipeline_stages;
begin
  select * into old_st from public.pipeline_stages where id = old.stage_id;
  select * into new_st from public.pipeline_stages where id = new.stage_id;
  insert into public.activities (workspace_id, type, deal_id, company_id, actor_id, meta)
  values (new.workspace_id,
          case new_st.kind when 'won' then 'deal_won' when 'lost' then 'deal_lost' else 'deal_stage_changed' end,
          new.id, new.company_id, auth.uid(),
          jsonb_build_object('deal', new.name, 'from', old_st.name, 'to', new_st.name, 'value', new.value));
  return null;
end;
$$;
create trigger deals_log_stage after update of stage_id on public.deals
  for each row when (old.stage_id is distinct from new.stage_id)
  execute function public.log_deal_stage_changed();

create function public.log_deal_contact_added()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  d public.deals;
begin
  select * into d from public.deals where id = new.deal_id;
  insert into public.activities (workspace_id, type, deal_id, contact_id, company_id, actor_id, meta)
  values (new.workspace_id, 'deal_contact_added', new.deal_id, new.contact_id, d.company_id, auth.uid(),
          jsonb_build_object('deal', d.name));
  return null;
end;
$$;
create trigger deal_contacts_log_added after insert on public.deal_contacts
  for each row execute function public.log_deal_contact_added();

-- Backfill "created" events for records that already exist
insert into public.activities (workspace_id, type, contact_id, company_id, actor_id, occurred_at, meta)
select workspace_id, 'contact_created', id, company_id, created_by, created_at, jsonb_build_object('source', source)
from public.contacts;
insert into public.activities (workspace_id, type, company_id, actor_id, occurred_at)
select workspace_id, 'company_created', id, created_by, created_at from public.companies;
insert into public.activities (workspace_id, type, deal_id, company_id, actor_id, occurred_at, meta)
select d.workspace_id, 'deal_created', d.id, d.company_id, d.created_by, d.created_at,
       jsonb_build_object('deal', d.name, 'stage', s.name, 'value', d.value)
from public.deals d join public.pipeline_stages s on s.id = d.stage_id;
