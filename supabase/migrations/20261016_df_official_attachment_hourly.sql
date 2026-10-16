-- Official HWPX notices are downloaded and held for editorial fact/legal review.
-- The scheduler invokes a token-authenticated Edge worker; it never bypasses
-- the existing article-publishing gates.
select cron.schedule(
 'df-official-attachments-hourly',
 '47 * * * *',
 $command$
 do $worker$
 declare
  run_token uuid := gen_random_uuid();
  http_request_id bigint;
 begin
  delete from public.df_ingest_run_tokens where issued_at < now()-interval '2 hours';
  insert into public.df_ingest_run_tokens(token,batch_id) values(run_token,9);
  select net.http_post(
   url:='https://svafsvyjjufbqvxzoqee.supabase.co/functions/v1/df-official-attachments',
   body:='{"action":"run"}'::jsonb,
   headers:=jsonb_build_object('Content-Type','application/json','x-df-collector-token',run_token::text),
   timeout_milliseconds:=120000
  ) into http_request_id;
 end $worker$;
 $command$
);
