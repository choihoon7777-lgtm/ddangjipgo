-- Authenticated manual runs / one-time pg_cron credentials for official collection.
-- Apply BEFORE deploying the matching df-public-update edge function.
create table if not exists public.df_ingest_run_tokens(
 token uuid primary key,
 batch_id integer not null check(batch_id between 0 and 9),
 issued_at timestamptz not null default now(),
 expires_at timestamptz not null default(now()+interval '3 minutes'),
 consumed_at timestamptz
);
alter table public.df_ingest_run_tokens enable row level security;
revoke all on table public.df_ingest_run_tokens from public, anon, authenticated;
create or replace function public.df_claim_ingest_token(p_token uuid,p_batch integer)
returns boolean language plpgsql security definer set search_path=''
as $$
declare claimed uuid;
begin
 if p_token is null or p_batch is null or p_batch not between 0 and 9 then return false; end if;
 update public.df_ingest_run_tokens
 set consumed_at=now()
 where token=p_token and batch_id=p_batch and consumed_at is null and expires_at>now()
 returning token into claimed;
 return claimed is not null;
end;
$$;
revoke all on function public.df_claim_ingest_token(uuid,integer) from public,anon,authenticated;
grant execute on function public.df_claim_ingest_token(uuid,integer) to service_role;
do $migration$
declare collector_job_id bigint;
begin
 select jobid into collector_job_id from cron.job
 where jobname='df-official-public-hourly-10-batches';
 if collector_job_id is not null then
  perform cron.alter_job(collector_job_id,command:=$cron$
DO $collector$
DECLARE issued_token uuid:=gen_random_uuid();
 batch_value integer:=extract(minute from now())::integer/6;
 request_id bigint;
BEGIN
 DELETE FROM public.df_ingest_run_tokens WHERE issued_at<now()-interval '1 hour';
 INSERT INTO public.df_ingest_run_tokens(token,batch_id) VALUES(issued_token,batch_value);
 SELECT net.http_post(
  url:='https://svafsvyjjufbqvxzoqee.supabase.co/functions/v1/df-public-update',
  body:=jsonb_build_object('batch',batch_value),
  headers:=jsonb_build_object('Content-Type','application/json','x-df-collector-token',issued_token::text),
  timeout_milliseconds:=120000
 ) INTO request_id;
END $collector$;
$cron$);
 end if;
end $migration$;
