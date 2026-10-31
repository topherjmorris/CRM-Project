-- CRM-04: log an activity whenever a contact or company is edited, listing
-- each changed field with its old and new value. Company changes on a contact
-- are already logged as contact_joined_company, and system columns are skipped.
-- Long text (notes) is recorded as changed without its contents.

create function public.changed_fields(old_row jsonb, new_row jsonb, skip text[])
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(jsonb_agg(
    case when n.key = 'notes'
      then jsonb_build_object('field', n.key)
      else jsonb_build_object('field', n.key, 'from', old_row -> n.key, 'to', n.value)
    end order by n.key), '[]'::jsonb)
  from jsonb_each(new_row) n
  where not (n.key = any (skip))
    and (old_row -> n.key) is distinct from n.value;
$$;

create function public.log_record_updated()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  changes jsonb;
begin
  if tg_table_name = 'contacts' then
    changes := public.changed_fields(to_jsonb(old), to_jsonb(new),
      array['id', 'workspace_id', 'created_at', 'updated_at', 'created_by', 'company_id', 'company_name', 'lead_score']);
    if jsonb_array_length(changes) > 0 then
      insert into public.activities (workspace_id, type, contact_id, company_id, actor_id, meta)
      values (new.workspace_id, 'contact_updated', new.id, new.company_id, auth.uid(), jsonb_build_object('changes', changes));
    end if;
  elsif tg_table_name = 'companies' then
    changes := public.changed_fields(to_jsonb(old), to_jsonb(new),
      array['id', 'workspace_id', 'created_at', 'updated_at', 'created_by']);
    if jsonb_array_length(changes) > 0 then
      insert into public.activities (workspace_id, type, company_id, actor_id, meta)
      values (new.workspace_id, 'company_updated', new.id, auth.uid(), jsonb_build_object('changes', changes));
    end if;
  end if;
  return null;
end;
$$;

create trigger contacts_log_updated after update on public.contacts
  for each row execute function public.log_record_updated();
create trigger companies_log_updated after update on public.companies
  for each row execute function public.log_record_updated();
