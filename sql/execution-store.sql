create table if not exists public.game_shop_executions (
  execution_id text primary key,
  plan_digest text not null,
  project_id text not null,
  mode text not null check (mode in ('dry-run','execute')),
  status text not null check (status in ('planned','running','input_required','completed','failed','cancelled')),
  completed_operations integer not null default 0,
  total_operations integer not null default 0,
  last_error text,
  operation_results jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists game_shop_executions_updated_at_idx on public.game_shop_executions(updated_at desc);

alter table public.game_shop_executions enable row level security;

-- Game Shop accesses this table server-side with its service-role credential.
-- No anonymous/authenticated client policies are created intentionally.
