create table if not exists public.game_shop_cost_ledger (
  execution_id text primary key,
  budget_usd numeric not null check (budget_usd >= 0),
  provider_budgets jsonb not null default '{}'::jsonb,
  estimated_cost numeric not null default 0 check (estimated_cost >= 0),
  actual_cost numeric not null default 0 check (actual_cost >= 0),
  credits_used numeric not null default 0 check (credits_used >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_shop_cost_entries (
  cost_id text primary key,
  execution_id text not null,
  provider text not null,
  action text not null,
  estimated_cost numeric not null default 0,
  actual_cost numeric,
  credits_used numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists game_shop_cost_entries_execution_idx on public.game_shop_cost_entries(execution_id,created_at desc);

create table if not exists public.game_shop_events (
  event_id text primary key,
  type text not null,
  execution_id text,
  project_id text,
  client_id text,
  scope jsonb not null default '[]'::jsonb,
  provider text,
  latency_ms integer,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists game_shop_events_execution_idx on public.game_shop_events(execution_id,created_at desc);
create index if not exists game_shop_events_project_idx on public.game_shop_events(project_id,created_at desc);
create index if not exists game_shop_events_type_idx on public.game_shop_events(type,created_at desc);

create table if not exists public.game_shop_previews (
  preview_id text primary key,
  project_id text not null,
  branch text not null,
  commit_sha text,
  provider text not null,
  deployment_id text,
  preview_url text,
  status text not null,
  created_at timestamptz not null default now(),
  tested_at timestamptz
);
create index if not exists game_shop_previews_project_idx on public.game_shop_previews(project_id,created_at desc);
create index if not exists game_shop_previews_commit_idx on public.game_shop_previews(project_id,commit_sha,created_at desc);
