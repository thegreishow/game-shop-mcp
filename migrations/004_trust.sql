create table if not exists public.game_shop_capability_trust (
  capability_id text primary key,
  name text not null,
  description text,
  endpoint text,
  state text not null,
  score integer not null default 0,
  tools jsonb not null default '[]'::jsonb,
  reasons jsonb not null default '[]'::jsonb,
  source text not null,
  approved_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);
create index if not exists game_shop_capability_trust_state_idx on public.game_shop_capability_trust(state);
