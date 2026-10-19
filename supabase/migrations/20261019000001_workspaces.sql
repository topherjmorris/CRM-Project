-- FND-02: multi-tenant workspaces with row-level security.
-- Every tenant-owned table carries workspace_id and uses the
-- is_workspace_member / has_workspace_role helpers in its policies.

create type public.workspace_role as enum ('owner', 'admin', 'member');

-- Profiles: one per auth user
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$'),
  created_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index workspace_members_user_idx on public.workspace_members (user_id);

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email text not null,
  role public.workspace_role not null default 'member' check (role <> 'owner'),
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references auth.users (id),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index workspace_invites_open_idx
  on public.workspace_invites (workspace_id, lower(email)) where accepted_at is null;

-- Helpers (security definer so policies don't recurse through RLS)
create function public.is_workspace_member(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid()
  );
$$;

create function public.has_workspace_role(ws uuid, roles public.workspace_role[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_id = ws and user_id = auth.uid() and role = any (roles)
  );
$$;

-- Create a workspace and make the caller its owner, atomically
create function public.create_workspace(ws_name text, ws_slug text)
returns public.workspaces language plpgsql security definer set search_path = '' as $$
declare
  ws public.workspaces;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  insert into public.workspaces (name, slug, created_by)
    values (ws_name, lower(ws_slug), auth.uid())
    returning * into ws;
  insert into public.workspace_members (workspace_id, user_id, role)
    values (ws.id, auth.uid(), 'owner');
  return ws;
end;
$$;

-- Accept an invite addressed to the caller's email
create function public.accept_invite(invite_token uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  inv public.workspace_invites;
begin
  select * into inv from public.workspace_invites
    where token = invite_token and accepted_at is null and expires_at > now()
    for update;
  if inv.id is null then
    raise exception 'invite not found or expired';
  end if;
  if lower(inv.email) <> lower((select email from auth.users where id = auth.uid())) then
    raise exception 'invite is for a different email';
  end if;
  insert into public.workspace_members (workspace_id, user_id, role)
    values (inv.workspace_id, auth.uid(), inv.role)
    on conflict (workspace_id, user_id) do nothing;
  update public.workspace_invites set accepted_at = now() where id = inv.id;
  return inv.workspace_id;
end;
$$;

-- Profile row on signup
create function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-level security
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;

create policy "read own profile or teammates" on public.profiles for select
  using (
    id = auth.uid() or exists (
      select 1 from public.workspace_members m
      where m.user_id = profiles.id and public.is_workspace_member(m.workspace_id)
    )
  );
create policy "update own profile" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());

create policy "members read workspace" on public.workspaces for select
  using (public.is_workspace_member(id));
create policy "owners and admins update workspace" on public.workspaces for update
  using (public.has_workspace_role(id, array['owner', 'admin']::public.workspace_role[]));
create policy "owners delete workspace" on public.workspaces for delete
  using (public.has_workspace_role(id, array['owner']::public.workspace_role[]));
-- Inserts go through create_workspace()

create policy "members read membership" on public.workspace_members for select
  using (public.is_workspace_member(workspace_id));
create policy "admins change non-owner roles" on public.workspace_members for update
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]) and role <> 'owner')
  with check (role <> 'owner');
create policy "admins remove members, anyone leaves" on public.workspace_members for delete
  using (
    role <> 'owner' and (
      user_id = auth.uid()
      or public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    )
  );
-- Inserts go through create_workspace() and accept_invite()

create policy "admins manage invites" on public.workspace_invites for all
  using (public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[]))
  with check (
    public.has_workspace_role(workspace_id, array['owner', 'admin']::public.workspace_role[])
    and invited_by = auth.uid()
  );

revoke execute on function public.create_workspace(text, text) from anon;
revoke execute on function public.accept_invite(uuid) from anon;
