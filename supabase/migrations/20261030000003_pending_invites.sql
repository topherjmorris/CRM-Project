-- FND-03: let a signed-in user find open invites addressed to their email,
-- so sign-in can route them to the invite instead of "create a workspace".

create function public.my_pending_invites()
returns table (token uuid, workspace_name text, role public.workspace_role)
language sql stable security definer set search_path = '' as $$
  select i.token, w.name, i.role
  from public.workspace_invites i
  join public.workspaces w on w.id = i.workspace_id
  where i.accepted_at is null
    and i.expires_at > now()
    and lower(i.email) = lower((select email from auth.users where id = auth.uid()))
    and not exists (
      select 1 from public.workspace_members m
      where m.workspace_id = i.workspace_id and m.user_id = auth.uid()
    )
  order by i.created_at desc;
$$;

revoke execute on function public.my_pending_invites() from anon;
