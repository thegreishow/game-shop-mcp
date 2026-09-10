create table if not exists public.game_shop_oauth_code_consumptions (
  jti text primary key,
  client_id text not null,
  subject text not null,
  redirect_uri text not null,
  scope text not null,
  code_challenge text not null,
  created_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz not null
);
create index if not exists game_shop_oauth_code_expiry_idx on public.game_shop_oauth_code_consumptions(expires_at);

create table if not exists public.game_shop_oauth_consents (
  consent_id text primary key,
  client_id text not null,
  subject text not null,
  scope text not null,
  approved boolean not null,
  created_at timestamptz not null
);
create index if not exists game_shop_oauth_consents_client_idx on public.game_shop_oauth_consents(client_id,created_at desc);

create table if not exists public.game_shop_oauth_revocations (
  jti text primary key,
  client_id text not null,
  subject text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz not null
);
create index if not exists game_shop_oauth_revocations_expiry_idx on public.game_shop_oauth_revocations(expires_at);
