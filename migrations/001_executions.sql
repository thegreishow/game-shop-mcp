create table if not exists public.game_shop_executions (
  execution_id text primary key,
  plan_digest text not null,
  project_id text not null,
  mode text not null,
  status text not null,
  completed_operations integer not null default 0,
  total_operations integer not null default 0,
  last_error text,
  operation_results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index if not exists game_shop_executions_project_idx on public.game_shop_executions(project_id);
create index if not exists game_shop_executions_status_idx on public.game_shop_executions(status);
