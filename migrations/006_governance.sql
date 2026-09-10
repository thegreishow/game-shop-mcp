create table if not exists public.game_shop_budgets (
  execution_id text primary key,
  budget_usd numeric not null,
  provider_budgets jsonb not null default '{}'::jsonb,
  estimated_cost_usd numeric not null default 0,
  actual_cost_usd numeric not null default 0,
  credits_used numeric not null default 0,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.game_shop_cost_entries (
  cost_id text primary key,
  execution_id text not null,
  provider text not null,
  action text not null,
  estimated_cost_usd numeric not null default 0,
  actual_cost_usd numeric,
  credits_used numeric,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);
create index if not exists game_shop_cost_entries_execution_idx on public.game_shop_cost_entries(execution_id,created_at desc);

create table if not exists public.game_shop_events (
  event_id text primary key,
  execution_id text,
  project_id text,
  category text not null,
  action text not null,
  actor text,
  client_id text,
  scope text,
  status text,
  duration_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null
);
create index if not exists game_shop_events_execution_idx on public.game_shop_events(execution_id,created_at desc);
create index if not exists game_shop_events_project_idx on public.game_shop_events(project_id,created_at desc);

create table if not exists public.game_shop_previews (
  preview_id text primary key,
  project_id text not null,
  branch text not null,
  commit_sha text,
  provider text not null,
  deployment_id text,
  preview_url text,
  status text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  tested_at timestamptz
);
create index if not exists game_shop_previews_project_idx on public.game_shop_previews(project_id,created_at desc);
create unique index if not exists game_shop_previews_deployment_idx on public.game_shop_previews(provider,deployment_id) where deployment_id is not null;
