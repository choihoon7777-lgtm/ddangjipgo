-- One query for the administrator's article list. Read-only server eligibility
-- is calculated by the same guarded code that publishes on button click.
create or replace function public.df_admin_publish_preflight()
returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
 v_result jsonb;
begin
 if not public.df_is_admin() or (auth.role()<>'service_role' and auth.uid() is null) then
   raise exception '관리자 권한이 필요합니다.';
 end if;
 select coalesce(jsonb_object_agg(s.article_id::text,s.verdict),'{}'::jsonb)
   into v_result
 from (
   select q.article_id, public.df_publish_article_one_click(q.article_id,true) as verdict
   from public.df_editorial_queue q
   where q.reviewed_at is null
   order by q.queued_at desc
   limit 150
 ) s;
 return v_result;
end
$function$;
revoke all on function public.df_admin_publish_preflight() from public,anon;
grant execute on function public.df_admin_publish_preflight() to authenticated,service_role;