-- CRM-06: custom fields. Each workspace defines its own fields per record type
-- (lead, contact, company, deal). Values live in a `custom` jsonb column on each
-- record, keyed by the field's `key` (e.g. {"budget": 5000, "plan": "Pro"}).
-- The app validates values against the definitions (lib/custom-fields.ts).
-- Deleting a definition leaves old values in place but hides them.

create type public.custom_entity as enum ('lead', 'contact', 'company', 'deal');
create type public.custom_field_type as enum ('text', 'number', 'date', 'select', 'checkbox', 'url');

create table public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  entity public.custom_entity not null,
  -- Stable identifier used in the `custom` jsonb; made from the label, never changes.
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,49}$'),
  label text not null check (char_length(btrim(label)) between 1 and 80),
  type public.custom_field_type not null,
  -- Choices for dropdowns; empty for other types.
  options text[] not null default '{}',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (workspace_id, entity, key),
  constraint custom_fields_select_has_options check (type <> 'select' or cardinality(options) > 0)
);
create index custom_fields_entity_idx on public.custom_fields (workspace_id, entity, position);

alter table public.custom_fields enable row level security;
create policy "members read custom fields" on public.custom_fields for select
  using (public.is_workspace_member(workspace_id));
-- Only owners and admins change the field setup.
create policy "admins manage custom fields" on public.custom_fields for all
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]));

alter table public.leads add column custom jsonb not null default '{}' check (jsonb_typeof(custom) = 'object');
alter table public.contacts add column custom jsonb not null default '{}' check (jsonb_typeof(custom) = 'object');
alter table public.companies add column custom jsonb not null default '{}' check (jsonb_typeof(custom) = 'object');
alter table public.deals add column custom jsonb not null default '{}' check (jsonb_typeof(custom) = 'object');

-- Timeline: report each changed custom value as its own field ("custom.budget")
-- instead of the whole jsonb blob.
create or replace function public.changed_fields(old_row jsonb, new_row jsonb, skip text[])
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(change order by change ->> 'field'), '[]'::jsonb)
  from (
    select case when n.key = 'notes'
      then jsonb_build_object('field', n.key)
      else jsonb_build_object('field', n.key, 'from', old_row -> n.key, 'to', n.value)
    end as change
    from jsonb_each(new_row) n
    where not (n.key = any (skip)) and n.key <> 'custom'
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

-- Converting a lead copies custom values whose key matches a contact field.
create function public.copy_lead_custom_to_contact()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.stage_kind = 'converted' and old.stage_kind is distinct from 'converted'
     and new.converted_contact_id is not null and new.custom <> '{}' then
    update public.contacts c
    set custom = c.custom || coalesce((
      select jsonb_object_agg(e.key, e.value)
      from jsonb_each(new.custom) e
      join public.custom_fields f
        on f.workspace_id = new.workspace_id and f.entity = 'contact' and f.key = e.key
      where not (c.custom ? e.key)
    ), '{}')
    where c.id = new.converted_contact_id;
  end if;
  return null;
end;
$$;
create trigger leads_copy_custom after update of stage_id on public.leads
  for each row execute function public.copy_lead_custom_to_contact();
