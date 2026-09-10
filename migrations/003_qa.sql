create table if not exists public.game_shop_qa_recipes (
  recipe_id text primary key,
  project_id text not null,
  name text not null,
  description text,
  checks jsonb not null default '[]'::jsonb,
  interactions jsonb not null default '[]'::jsonb,
  created_from_execution_id text,
  approved boolean not null default false,
  pass_count integer not null default 0,
  fail_count integer not null default 0,
  last_status text,
  last_run_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index if not exists game_shop_qa_recipes_project_idx on public.game_shop_qa_recipes(project_id);

create table if not exists public.game_shop_qa_evidence (
  evidence_id text primary key,
  execution_id text,
  project_id text not null,
  provider text not null,
  run_id text,
  commit_sha text,
  preview_url text,
  status text not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index if not exists game_shop_qa_evidence_project_idx on public.game_shop_qa_evidence(project_id);
create index if not exists game_shop_qa_evidence_execution_idx on public.game_shop_qa_evidence(execution_id);
create unique index if not exists game_shop_qa_evidence_provider_run_idx on public.game_shop_qa_evidence(provider,run_id) where run_id is not null;
