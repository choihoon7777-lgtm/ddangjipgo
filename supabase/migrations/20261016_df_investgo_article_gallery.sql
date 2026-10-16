-- Store only URLs of images copied to the owned, public investor-insight bucket.
-- Editorial body and the original blog text remain unchanged.
alter table public.df_articles
  add column if not exists body_image_urls jsonb not null default '[]'::jsonb;
comment on column public.df_articles.body_image_urls is
  'Owned Supabase Storage URLs for supplementary images in the original article; hero image stored separately.';