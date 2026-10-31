-- CRM-03: pipelines, stages and deals.
-- Each workspace gets a default "Sales" pipeline. A stage's kind (open/won/lost)
-- decides whether deals in it count as open, won or lost.

create type public.stage_kind as enum ('open', 'won', 'lost');

create table public.pipelines (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index pipelines_workspace_name_idx on public.pipelines (workspace_id, lower(name));

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  kind public.stage_kind not null default 'open',
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index pipeline_stages_pipeline_idx on public.pipeline_stages (pipeline_id, position);

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  pipeline_id uuid not null references public.pipelines (id) on delete cascade,
  -- restrict: a stage with deals can't be deleted until they move
  stage_id uuid not null references public.pipeline_stages (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 200),
  value numeric(14, 2) not null default 0 check (value >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  close_date date,
  company_id uuid references public.companies (id) on delete set null,
  owner_id uuid references auth.users (id) on delete set null,
  notes text check (char_length(notes) <= 10000),
  position double precision not null default 0,
  closed_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index deals_board_idx on public.deals (pipeline_id, stage_id, position);
create index deals_company_idx on public.deals (company_id);

create table public.deal_contacts (
  deal_id uuid not null references public.deals (id) on delete cascade,
  contact_id uuid not null references public.contacts (id) on delete cascade,
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (deal_id, contact_id)
);
create index deal_contacts_contact_idx on public.deal_contacts (contact_id);

create trigger deals_touch before update on public.deals
  for each row execute function public.touch_updated_at();

-- Keep pipeline_id in step with the stage, and stamp closed_at when a deal enters won/lost.
create function public.deals_sync_stage()
returns trigger language plpgsql set search_path = '' as $$
declare
  st public.pipeline_stages;
begin
  select * into st from public.pipeline_stages where id = new.stage_id;
  if st.workspace_id <> new.workspace_id then
    raise exception 'stage belongs to another workspace';
  end if;
  new.pipeline_id := st.pipeline_id;
  if st.kind = 'open' then
    new.closed_at := null;
  elsif tg_op = 'INSERT' or new.stage_id is distinct from old.stage_id then
    new.closed_at := coalesce(new.closed_at, now());
  end if;
  return new;
end;
$$;
create trigger deals_stage_sync before insert or update of stage_id on public.deals
  for each row execute function public.deals_sync_stage();

-- Default pipeline for every workspace
create function public.create_default_pipeline(ws uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  p uuid;
begin
  insert into public.pipelines (workspace_id, name, position) values (ws, 'Sales', 0) returning id into p;
  insert into public.pipeline_stages (workspace_id, pipeline_id, name, kind, position) values
    (ws, p, 'Lead', 'open', 0),
    (ws, p, 'Qualified', 'open', 1),
    (ws, p, 'Proposal', 'open', 2),
    (ws, p, 'Negotiation', 'open', 3),
    (ws, p, 'Won', 'won', 4),
    (ws, p, 'Lost', 'lost', 5);
  return p;
end;
$$;
revoke execute on function public.create_default_pipeline(uuid) from public, anon, authenticated;

create function public.workspaces_default_pipeline()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform public.create_default_pipeline(new.id);
  return new;
end;
$$;
create trigger workspaces_default_pipeline after insert on public.workspaces
  for each row execute function public.workspaces_default_pipeline();

select public.create_default_pipeline(w.id)
from public.workspaces w
where not exists (select 1 from public.pipelines p where p.workspace_id = w.id);

-- RLS: any workspace member can work with pipelines and deals
alter table public.pipelines enable row level security;
alter table public.pipeline_stages enable row level security;
alter table public.deals enable row level security;
alter table public.deal_contacts enable row level security;

create policy "members manage pipelines" on public.pipelines for all
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members manage stages" on public.pipeline_stages for all
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members manage deals" on public.deals for all
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
create policy "members manage deal contacts" on public.deal_contacts for all
  using (public.is_workspace_member(workspace_id)) with check (public.is_workspace_member(workspace_id));
