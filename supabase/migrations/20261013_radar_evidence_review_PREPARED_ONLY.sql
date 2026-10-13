-- PREPARED ONLY: Do not run on the production Supabase project without an explicit approval.
-- The radar never treats a title match or API hash change as a confirmed legal change.
begin;

create table if not exists public.df_radar_official_locations (
 id uuid primary key default gen_random_uuid(),
 source_document_id uuid not null references public.df_source_documents(id) on delete cascade,
 pnu text check (pnu is null or pnu ~ '^[0-9]{19}$'),
 site_address text,
 latitude numeric check (latitude is null or latitude between 33 and 39.5),
 longitude numeric check (longitude is null or longitude between 124 and 132),
 geometry_geojson jsonb,
 evidence_url text not null,
 evidence_text text not null,
 verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
 location_basis text not null check (location_basis in ('verified_point','verified_polygon','verified_pnu','official_address')),
 approved_by uuid references auth.users(id),
 approved_at timestamptz,
 created_at timestamptz not null default now(),
 constraint radar_geo_pair check ((latitude is null) = (longitude is null)),
 constraint radar_approval_check check (verification_status <> 'verified' or (approved_at is not null and approved_by is not null))
);

create table if not exists public.df_radar_observations (
 id uuid primary key default gen_random_uuid(),
 watchlist_id uuid not null references public.df_land_watchlists(id) on delete cascade,
 source_document_id uuid references public.df_source_documents(id) on delete set null,
 location_id uuid references public.df_radar_official_locations(id) on delete set null,
 source_content_hash text,
 evidence_level text not null check (evidence_level in ('parcel-mention','address-mention','district-mention','verified-radius','verified-intersection','official-snapshot-diff')),
 review_status text not null default 'pending' check (review_status in ('pending','confirmed','dismissed')),
 impact_confirmed boolean not null default false,
 change_confirmed boolean not null default false,
 distance_m numeric,
 detail jsonb not null default '{}'::jsonb,
 reviewed_by uuid references auth.users(id),
 reviewed_at timestamptz,
 detected_at timestamptz not null default now(),
 constraint radar_no_unreviewed_impact check ((not impact_confirmed and not change_confirmed) or (review_status='confirmed' and reviewed_at is not null and reviewed_by is not null)),
 constraint radar_observation_identity unique (watchlist_id,source_document_id,source_content_hash)
);
create index if not exists idx_radar_locations_doc on public.df_radar_official_locations(source_document_id);
create index if not exists idx_radar_observations_watch on public.df_radar_observations(watchlist_id,detected_at desc);
create index if not exists idx_radar_observations_review on public.df_radar_observations(review_status,detected_at desc);

alter table public.df_radar_official_locations enable row level security;
alter table public.df_radar_observations enable row level security;

create policy df_radar_locations_admin on public.df_radar_official_locations
 for all to authenticated using (public.df_is_admin()) with check (public.df_is_admin());
create policy df_radar_observations_admin on public.df_radar_observations
 for all to authenticated using (public.df_is_admin()) with check (public.df_is_admin());
create policy df_radar_observations_owner_reviewed_read on public.df_radar_observations
 for select to authenticated
 using (review_status='confirmed' and exists (
  select 1 from public.df_land_watchlists w
  where w.id=watchlist_id and w.profile_id=auth.uid()
 ));

commit;
