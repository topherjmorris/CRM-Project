-- CRM-06: tags. One shared, color-coded tag list per workspace. Leads, contacts,
-- companies and deals each keep the ids of their tags in a `tag_ids` array
-- (fast "has this tag" filters with a GIN index, no join table to keep in sync).
-- Deleting a tag removes its id from every record. Converting a lead copies its
-- tags to the contact. Adding/removing tags is logged as one "tags_changed" event.

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 40),
  -- A palette name the app maps to colors (lib/tags.ts).
  color text not null default 'gray'
    check (color in ('gray', 'red', 'orange', 'amber', 'green', 'teal', 'blue', 'violet', 'pink')),
  created_at timestamptz not null default now()
);
create unique index tags_workspace_name_idx on public.tags (workspace_id, lower(name));

alter table public.tags enable row level security;
create policy "members manage tags" on public.tags for all
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));

alter table public.leads add column tag_ids uuid[] not null default '{}';
alter table public.contacts add column tag_ids uuid[] not null default '{}';
alter table public.companies add column tag_ids uuid[] not null default '{}';
alter table public.deals add column tag_ids uuid[] not null default '{}';
create index leads_tags_idx on public.leads using gin (tag_ids);
create index contacts_tags_idx on public.contacts using gin (tag_ids);
create index companies_tags_idx on public.companies using gin (tag_ids);
create index deals_tags_idx on public.deals using gin (tag_ids);

-- Remove a deleted tag from every record.
create function public.tags_remove_from_records()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.leads set tag_ids = array_remove(tag_ids, old.id) where old.id = any (tag_ids);
  update public.contacts set tag_ids = array_remove(tag_ids, old.id) where old.id = any (tag_ids);
  update public.companies set tag_ids = array_remove(tag_ids, old.id) where old.id = any (tag_ids);
  update public.deals set tag_ids = array_remove(tag_ids, old.id) where old.id = any (tag_ids);
  return old;
end;
$$;
create trigger tags_cleanup before delete on public.tags
  for each row execute function public.tags_remove_from_records();

-- Field-change logging ignores tag_ids (logged by the trigger below instead).
create or replace function public.changed_fields(old_row jsonb, new_row jsonb, skip text[])
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(change order by change ->> 'field'), '[]'::jsonb)
  from (
    select case when n.key = 'notes'
      then jsonb_build_object('field', n.key)
      else jsonb_build_object('field', n.key, 'from', old_row -> n.key, 'to', n.value)
    end as change
    from jsonb_each(new_row) n
    where not (n.key = any (skip)) and n.key not in ('custom', 'tag_ids')
      and (old_row -> n.key) is distinct from n.value
    union all
    select jsonb_build_object('field', 'custom.' || k.key,
                              'from', coalesce(old_row -> 'custom', '{}') -> k.key,
                              'to', coalesce(new_row -> 'custom', '{}') -> k.key)
    from (
      select jsonb_object_keys(coalesce(new_row -> 'custom', '{}')) as key
      union
      select jsonb_object_keys(coalesce(old_row -> 'custom', '{}'))
    ) k
    where (coalesce(old_row -> 'custom', '{}') -> k.key) is distinct from (coalesce(new_row -> 'custom', '{}') -> k.key)
  ) changes;
$$;

-- "Tags: +VIP, −Cold" on the record's timeline.
create function public.log_tags_changed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  added text[];
  removed text[];
begin
  select coalesce(array_agg(t.name order by t.name), '{}') into added
  from public.tags t where t.id = any (new.tag_ids) and not (t.id = any (old.tag_ids));
  select coalesce(array_agg(t.name order by t.name), '{}') into removed
  from public.tags t where t.id = any (old.tag_ids) and not (t.id = any (new.tag_ids));
  -- Nothing to say when only deleted tags dropped off.
  if cardinality(added) = 0 and cardinality(removed) = 0 then
    return null;
  end if;
  insert into public.activities (workspace_id, type, lead_id, contact_id, company_id, deal_id, actor_id, meta)
  values (
    new.workspace_id, 'tags_changed',
    case when tg_table_name = 'leads' then new.id end,
    case when tg_table_name = 'contacts' then new.id end,
    case when tg_table_name = 'companies' then new.id end,
    case when tg_table_name = 'deals' then new.id end,
    auth.uid(),
    jsonb_build_object('added', to_jsonb(added), 'removed', to_jsonb(removed)));
  return null;
end;
$$;
create trigger leads_log_tags after update of tag_ids on public.leads
  for each row when (old.tag_ids is distinct from new.tag_ids) execute function public.log_tags_changed();
create trigger contacts_log_tags after update of tag_ids on public.contacts
  for each row when (old.tag_ids is distinct from new.tag_ids) execute function public.log_tags_changed();
create trigger companies_log_tags after update of tag_ids on public.companies
  for each row when (old.tag_ids is distinct from new.tag_ids) execute function public.log_tags_changed();
create trigger deals_log_tags after update of tag_ids on public.deals
  for each row when (old.tag_ids is distinct from new.tag_ids) execute function public.log_tags_changed();

-- Conversion: the contact gets the lead's tags too.
create function public.copy_lead_tags_to_contact()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.stage_kind = 'converted' and old.stage_kind is distinct from 'converted'
     and new.converted_contact_id is not null and cardinality(new.tag_ids) > 0 then
    update public.contacts
    set tag_ids = array(select distinct unnest(tag_ids || new.tag_ids))
    where id = new.converted_contact_id;
  end if;
  return null;
end;
$$;
create trigger leads_copy_tags after update of stage_id on public.leads
  for each row execute function public.copy_lead_tags_to_contact();
