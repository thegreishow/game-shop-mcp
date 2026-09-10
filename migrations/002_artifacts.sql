create table if not exists public.game_shop_artifacts (
  artifact_id text primary key,
  execution_id text not null,
  project_id text,
  kind text not null,
  purpose text not null,
  status text not null,
  name text not null,
  provider text,
  provider_job_id text,
  mime_type text,
  source_url text,
  storage_url text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index if not exists game_shop_artifacts_execution_idx on public.game_shop_artifacts(execution_id);
create index if not exists game_shop_artifacts_project_idx on public.game_shop_artifacts(project_id);
create index if not exists game_shop_artifacts_status_idx on public.game_shop_artifacts(status);
