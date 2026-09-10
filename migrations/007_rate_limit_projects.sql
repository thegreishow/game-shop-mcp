create table if not exists public.game_shop_rate_limits (
  key text primary key,
  count integer not null default 0,
  reset_at timestamptz not null
);

create or replace function public.game_shop_take_rate_limit(p_key text,p_limit integer,p_window_seconds integer)
returns table(allowed boolean,retry_after integer,remaining integer)
language plpgsql
security definer
as $$
declare
  now_ts timestamptz := now();
  row_count integer;
  row_reset timestamptz;
begin
  insert into public.game_shop_rate_limits(key,count,reset_at)
  values(p_key,1,now_ts + make_interval(secs => p_window_seconds))
  on conflict(key) do update set
    count = case when game_shop_rate_limits.reset_at <= now_ts then 1 else game_shop_rate_limits.count + 1 end,
    reset_at = case when game_shop_rate_limits.reset_at <= now_ts then now_ts + make_interval(secs => p_window_seconds) else game_shop_rate_limits.reset_at end
  returning count, reset_at into row_count,row_reset;
  allowed := row_count <= p_limit;
  retry_after := greatest(1,ceil(extract(epoch from (row_reset-now_ts)))::integer);
  remaining := greatest(0,p_limit-row_count);
  return next;
end;$$;

create table if not exists public.game_shop_projects (
  project_id text primary key,
  name text not null,
  product_kind text not null,
  repo text not null,
  project_root text not null,
  default_branch text not null default 'main',
  framework text,
  deployment_provider text,
  deployment_project text,
  artifact_destinations jsonb not null default '{}'::jsonb,
  qa_policy jsonb not null default '{}'::jsonb,
  required_regressions jsonb not null default '[]'::jsonb,
  permission_profile jsonb not null default '{}'::jsonb,
  budget_profile jsonb not null default '{}'::jsonb,
  brand_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists game_shop_projects_kind_idx on public.game_shop_projects(product_kind);
