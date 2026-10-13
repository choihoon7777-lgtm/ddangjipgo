
-- Development Focus: public, source-attributed official Applyhome notice cache.
-- New isolated table: does not modify article/editorial or legacy application tables.
create table if not exists public.df_housing_offers (
 offer_key text primary key,
 supply_kind text not null check (supply_kind in ('APT','REMAIN','OPTIONAL')),
 house_manage_no text not null,
 pblanc_no text not null,
 house_name text not null,
 region_name text,
 address text,
 published_date date,
 special_start_date date,
 special_end_date date,
 first_date date,
 second_date date,
 application_start_date date,
 application_end_date date,
 winner_date date,
 contract_start_date date,
 contract_end_date date,
 total_households integer check (total_households is null or total_households >= 0),
 top_price_manwon bigint check (top_price_manwon is null or top_price_manwon >= 0),
 official_url text not null default 'https://www.applyhome.co.kr/',
 models_json jsonb not null default '[]'::jsonb,
 source_json jsonb not null default '{}'::jsonb,
 refreshed_at timestamptz not null default now(),
 unique (supply_kind,house_manage_no,pblanc_no)
);
create index if not exists df_housing_offers_published_idx on public.df_housing_offers (published_date desc);
create index if not exists df_housing_offers_region_idx on public.df_housing_offers (region_name,published_date desc);
alter table public.df_housing_offers enable row level security;
drop policy if exists "Official housing notices public read" on public.df_housing_offers;
create policy "Official housing notices public read" on public.df_housing_offers for select to anon,authenticated using (true);
revoke insert,update,delete on public.df_housing_offers from anon,authenticated;
grant select on public.df_housing_offers to anon,authenticated;
