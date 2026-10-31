-- CRM-04: deleting a contact, company or deal must not wipe activity that
-- also belongs to another record (e.g. a note on a contact that is linked to
-- the deleted company). Unlink those first; the FK cascade then removes only
-- activity that pointed at the deleted record alone.

create function public.unlink_shared_activities()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'companies' then
    update public.activities set company_id = null
    where company_id = old.id and (contact_id is not null or deal_id is not null);
  elsif tg_table_name = 'deals' then
    update public.activities set deal_id = null
    where deal_id = old.id and (contact_id is not null or company_id is not null);
  elsif tg_table_name = 'contacts' then
    update public.activities set contact_id = null
    where contact_id = old.id and (deal_id is not null or company_id is not null);
  end if;
  return old;
end;
$$;

create trigger companies_unlink_activities before delete on public.companies
  for each row execute function public.unlink_shared_activities();
create trigger deals_unlink_activities before delete on public.deals
  for each row execute function public.unlink_shared_activities();
create trigger contacts_unlink_activities before delete on public.contacts
  for each row execute function public.unlink_shared_activities();
