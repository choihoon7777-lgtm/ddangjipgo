
-- Independent official housing ingestion & publication history (safe additive schema).
alter table public.df_housing_offers add column if not exists source_hash text;
alter table public.df_housing_offers add column if not exists verified_at timestamptz;
create index if not exists df_housing_offers_verified_idx on public.df_housing_offers(refreshed_at desc);
create table if not exists public.df_housing_sync_runs (
 id bigint generated always as identity primary key,
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 status text not null default 'running' check(status in ('running','success','partial','error')),
 counts jsonb not null default '{}'::jsonb,
 error_code text,
 warning_count integer not null default 0,
 partial_coverage boolean not null default false
);
create index if not exists df_housing_sync_runs_started_idx on public.df_housing_sync_runs(started_at desc);
alter table public.df_housing_sync_runs enable row level security;
revoke all on public.df_housing_sync_runs from anon,authenticated;
create table if not exists public.df_housing_offer_versions (
 id bigint generated always as identity primary key,
 offer_key text not null references public.df_housing_offers(offer_key) on delete cascade,
 captured_at timestamptz not null default now(),
 previous_hash text,
 changed_fields text[] not null default '{}',
 previous_snapshot jsonb not null
);
create index if not exists df_housing_offer_versions_offer_idx on public.df_housing_offer_versions(offer_key,captured_at desc);
alter table public.df_housing_offer_versions enable row level security;
revoke all on public.df_housing_offer_versions from anon,authenticated;
-- Only API service role writes history and ingestion diagnostics. Public reads offers only.
