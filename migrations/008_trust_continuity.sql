create table if not exists public.game_shop_capability_incidents (
  incident_id text primary key,
  capability_name text not null,
  severity text not null check (severity in ('low','medium','high')),
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists game_shop_capability_incidents_name_idx on public.game_shop_capability_incidents(capability_name,created_at desc);

create table if not exists public.game_shop_ai_handoffs (
  handoff_id text primary key,
  execution_id text not null,
  from_client text not null,
  to_client text not null,
  note text,
  artifact_ids jsonb not null default '[]'::jsonb,
  evidence_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists game_shop_ai_handoffs_execution_idx on public.game_shop_ai_handoffs(execution_id,created_at desc);
