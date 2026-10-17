-- Suppress repetitive internal collector metadata in the visible article subtitle.
-- Editorial titles, legal originals and verifiable source records remain intact.
create table if not exists public.df_article_auto_subtitle_backup(
 article_id uuid primary key references public.df_articles(id) on delete cascade,
 old_subtitle text not null,
 saved_at timestamptz not null default now()
);
alter table public.df_article_auto_subtitle_backup enable row level security;
revoke all on public.df_article_auto_subtitle_backup from public,anon,authenticated;
grant select on public.df_article_auto_subtitle_backup to service_role;

-- Restrict the change to known automatically generated article labels.
-- In particular, free-written reporter subtitles must not be removed.
with matches as (
 select a.id,a.subtitle
 from public.df_articles a
 where
  (a.source_channel in ('보도자료','고시공고','입법예고','조례규칙')
    and a.subtitle ~ '^.{2,170} · 공식 (보도자료|고시공고|입법예고|조례규칙))
   or (a.source_channel is null and a.subtitle='공식 지자체 정책·고시')
), backed as (
 insert into public.df_article_auto_subtitle_backup(article_id,old_subtitle)
 select id,subtitle from matches
 on conflict(article_id) do nothing
 returning article_id
)
update public.df_articles a
set subtitle = null
from matches m
where a.id=m.id and a.subtitle=m.subtitle;
-- Do not set updated_at: no article facts or content were changed.

-- Future articles: keep the verified institution in original_source_label,
-- but leave the visible subtitle empty.
CREATE OR REPLACE FUNCTION public.df_run_official_article_factory(p_limit integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  r record;
  v_article_id uuid;
  v_state text;
  v_publish boolean;
  v_channel text;
  v_region text;
  v_section text;
  v_key text;
  v_source_name text;
  v_summary jsonb;
  v_body jsonb;
  v_run_id bigint;
  v_seen integer := 0;
  v_live integer := 0;
  v_draft integer := 0;
  v_errors integer := 0;
  v_err text;
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception 'FACTORY_LIMIT_OUT_OF_RANGE';
  end if;
  -- One worker at a time, including overlapping pg_cron and manual invocations.
  if not pg_try_advisory_xact_lock(281011, 20261013) then
    return jsonb_build_object('ok',false,'reason','ALREADY_RUNNING');
  end if;
  insert into public.df_official_article_factory_runs default values returning id into v_run_id;
  for r in
    select d.*, s.name as source_name, s.region_code as source_region
      from public.df_source_documents d
      join public.df_sources s on s.id=d.source_id and s.source_type='official'
      where d.verification_status='verified'
        and d.key_extract_status='ready'
        and d.detail_status in ('complete','partial')
        and d.published_at is not null
        and d.published_at<=now()+interval '24 hours'
        and length(trim(coalesce(d.key_content,'')))>=90
        and length(trim(coalesce(d.content_text,'')))>=120
        and length(trim(d.title)) between 10 and 180
        and d.source_url ~ '^https://[^[:space:]]+'
        and coalesce(d.raw_payload->>'public_hidden','false')='false'
        and coalesce(d.raw_payload->>'source_change_candidate','false')<>'true'
        and d.title !~ '(채용|입찰결과|담배소매|도로점용|수의계약|안전점검 수행기관|체육시설 임시휴장)'
        and not exists(select 1 from public.df_official_article_factory_jobs j where j.document_id=d.id)
        and not exists(select 1 from public.df_articles a where a.source_document_id=d.id)
        and not exists(select 1 from public.df_articles a where a.original_source_url=d.source_url and coalesce(a.source_channel,'')<>'investgo')
        and not exists(select 1 from public.df_articles a where lower(a.title)=lower(d.title) and a.source_channel<>'investgo')
      order by d.published_at desc, d.id
      limit p_limit
  loop
    begin
      v_seen:=v_seen+1;
      v_source_name:=coalesce(r.source_name,'공식 기관');
      v_key:=trim(r.key_content);
      v_channel:=case
        when r.raw_payload->>'channel' in ('보도자료','고시공고','입법예고')
        then r.raw_payload->>'channel'
        when r.title ~ '(입법예고|조례)' then '입법예고'
        when r.title ~ '(고시|공고)' then '고시공고'
        else '보도자료'
      end;
      v_region:=coalesce(r.source_region,r.raw_payload->>'region_code');
      -- Publication is intentionally STRICT: no list-only or attached-unread excerpts.
      v_publish:=r.detail_status='complete'
        and length(r.content_text)>=600
        and length(v_key)>=120
        and coalesce(r.raw_payload->>'needs_detail_fetch','false')<>'true'
        and coalesce(r.raw_payload->>'detail_ok','false')='true'
        and (coalesce(r.raw_payload->>'attachments_detected','false')<>'true'
             or coalesce(r.raw_payload->>'attachment_text_extracted','false')='true')
        and coalesce(r.raw_payload->>'collector','') not in ('manual_official_source_verification','today_manual_verified')
        and r.source_url !~ '(#view/|MediaList.do|/lst[.]jsp)';
      v_state:=case when v_publish then 'published' else 'review' end;
      v_section:=case when r.detail_status='complete' then '공식 문서 내용' else '공식자료 확인 범위' end;
      v_summary:=jsonb_build_array(
        left(coalesce(nullif(trim(split_part(v_key,E'\n',1)),''),r.title),240),
        left(coalesce(nullif(trim(split_part(v_key,E'\n',2)),''),r.title),240),
        left(coalesce(nullif(trim(split_part(v_key,E'\n',3)),''),'세부 사항은 해당 기관의 자료로 확인해야 합니다.'),240)
      );
      v_body:=jsonb_build_array(r.content_text);
      insert into public.df_articles(
        slug,title,subtitle,summary_3line,body,category,status,source_channel,topic_code,region_code,
        risk_level,confidence,published_at,original_source_url,original_source_label,
        original_source_published_at,source_document_id
      ) values (
        'official-'||replace(r.id::text,'-',''),r.title,
        null::text,v_summary,v_body,'정책·고시',v_state,
        v_channel,coalesce(r.raw_payload->>'category_hint','정책·고시'),v_region,
        case when v_publish then 'green' else 'yellow' end,
        case when v_publish then 0.95 else 0.70 end,
        case when v_publish then r.published_at else null end,
        r.source_url,v_source_name,r.published_at,r.id
      ) on conflict (slug) do nothing returning id into v_article_id;
      if v_article_id is null then
        continue;
      end if;
      insert into public.df_article_sources(article_id,document_id,is_primary)
        values(v_article_id,r.id,true) on conflict do nothing;
      insert into public.df_official_article_factory_jobs(document_id,article_id,state,quality_reason)
        values(r.id,v_article_id,v_state,
               case when v_publish then 'FULL_BODY_VERIFIED'
                 when r.detail_status='partial' then 'ATTACHMENT_OR_FULL_BODY_REVIEW'
                 else 'SOURCE_DOCUMENT_REQUIRES_EDITOR_REVIEW' end)
        on conflict (document_id) do nothing;
      if v_publish then v_live:=v_live+1; else v_draft:=v_draft+1; end if;
    exception when others then
      v_errors:=v_errors+1;
      v_err:=left(SQLERRM,220);
    end;
  end loop;
  update public.df_official_article_factory_runs
    set finished_at=now(),processed=v_seen,published=v_live,review_created=v_draft,
        failed=v_errors,outcome=case when v_errors=0 then 'success' else 'failed' end,error_text=v_err
    where id=v_run_id;
  return jsonb_build_object('ok',v_errors=0,'processed',v_seen,'auto_published',v_live,
                            'review_created',v_draft,'failed',v_errors,'run_id',v_run_id,
                            'last_error',v_err);
exception when others then
  if v_run_id is not null then
    update public.df_official_article_factory_runs
      set finished_at=now(),outcome='failed',error_text=left(SQLERRM,220) where id=v_run_id;
  end if;
  raise;
end;
$function$

)
   or (a.source_channel is null and a.subtitle='공식 지자체 정책·고시')
), backed as (
 insert into public.df_article_auto_subtitle_backup(article_id,old_subtitle)
 select id,subtitle from matches
 on conflict(article_id) do nothing
 returning article_id
)
update public.df_articles a
set subtitle = null
from matches m
where a.id=m.id and a.subtitle=m.subtitle;
-- Do not set updated_at: no article facts or content were changed.

-- Future articles: keep the verified institution in original_source_label,
-- but leave the visible subtitle empty.
CREATE OR REPLACE FUNCTION public.df_run_official_article_factory(p_limit integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  r record;
  v_article_id uuid;
  v_state text;
  v_publish boolean;
  v_channel text;
  v_region text;
  v_section text;
  v_key text;
  v_source_name text;
  v_summary jsonb;
  v_body jsonb;
  v_run_id bigint;
  v_seen integer := 0;
  v_live integer := 0;
  v_draft integer := 0;
  v_errors integer := 0;
  v_err text;
begin
  if p_limit < 1 or p_limit > 100 then
    raise exception 'FACTORY_LIMIT_OUT_OF_RANGE';
  end if;
  -- One worker at a time, including overlapping pg_cron and manual invocations.
  if not pg_try_advisory_xact_lock(281011, 20261013) then
    return jsonb_build_object('ok',false,'reason','ALREADY_RUNNING');
  end if;
  insert into public.df_official_article_factory_runs default values returning id into v_run_id;
  for r in
    select d.*, s.name as source_name, s.region_code as source_region
      from public.df_source_documents d
      join public.df_sources s on s.id=d.source_id and s.source_type='official'
      where d.verification_status='verified'
        and d.key_extract_status='ready'
        and d.detail_status in ('complete','partial')
        and d.published_at is not null
        and d.published_at<=now()+interval '24 hours'
        and length(trim(coalesce(d.key_content,'')))>=90
        and length(trim(coalesce(d.content_text,'')))>=120
        and length(trim(d.title)) between 10 and 180
        and d.source_url ~ '^https://[^[:space:]]+'
        and coalesce(d.raw_payload->>'public_hidden','false')='false'
        and coalesce(d.raw_payload->>'source_change_candidate','false')<>'true'
        and d.title !~ '(채용|입찰결과|담배소매|도로점용|수의계약|안전점검 수행기관|체육시설 임시휴장)'
        and not exists(select 1 from public.df_official_article_factory_jobs j where j.document_id=d.id)
        and not exists(select 1 from public.df_articles a where a.source_document_id=d.id)
        and not exists(select 1 from public.df_articles a where a.original_source_url=d.source_url and coalesce(a.source_channel,'')<>'investgo')
        and not exists(select 1 from public.df_articles a where lower(a.title)=lower(d.title) and a.source_channel<>'investgo')
      order by d.published_at desc, d.id
      limit p_limit
  loop
    begin
      v_seen:=v_seen+1;
      v_source_name:=coalesce(r.source_name,'공식 기관');
      v_key:=trim(r.key_content);
      v_channel:=case
        when r.raw_payload->>'channel' in ('보도자료','고시공고','입법예고')
        then r.raw_payload->>'channel'
        when r.title ~ '(입법예고|조례)' then '입법예고'
        when r.title ~ '(고시|공고)' then '고시공고'
        else '보도자료'
      end;
      v_region:=coalesce(r.source_region,r.raw_payload->>'region_code');
      -- Publication is intentionally STRICT: no list-only or attached-unread excerpts.
      v_publish:=r.detail_status='complete'
        and length(r.content_text)>=600
        and length(v_key)>=120
        and coalesce(r.raw_payload->>'needs_detail_fetch','false')<>'true'
        and coalesce(r.raw_payload->>'detail_ok','false')='true'
        and (coalesce(r.raw_payload->>'attachments_detected','false')<>'true'
             or coalesce(r.raw_payload->>'attachment_text_extracted','false')='true')
        and coalesce(r.raw_payload->>'collector','') not in ('manual_official_source_verification','today_manual_verified')
        and r.source_url !~ '(#view/|MediaList.do|/lst[.]jsp)';
      v_state:=case when v_publish then 'published' else 'review' end;
      v_section:=case when r.detail_status='complete' then '공식 문서 내용' else '공식자료 확인 범위' end;
      v_summary:=jsonb_build_array(
        left(coalesce(nullif(trim(split_part(v_key,E'\n',1)),''),r.title),240),
        left(coalesce(nullif(trim(split_part(v_key,E'\n',2)),''),r.title),240),
        left(coalesce(nullif(trim(split_part(v_key,E'\n',3)),''),'세부 사항은 해당 기관의 자료로 확인해야 합니다.'),240)
      );
      v_body:=jsonb_build_array(r.content_text);
      insert into public.df_articles(
        slug,title,subtitle,summary_3line,body,category,status,source_channel,topic_code,region_code,
        risk_level,confidence,published_at,original_source_url,original_source_label,
        original_source_published_at,source_document_id
      ) values (
        'official-'||replace(r.id::text,'-',''),r.title,
        null::text,v_summary,v_body,'정책·고시',v_state,
        v_channel,coalesce(r.raw_payload->>'category_hint','정책·고시'),v_region,
        case when v_publish then 'green' else 'yellow' end,
        case when v_publish then 0.95 else 0.70 end,
        case when v_publish then r.published_at else null end,
        r.source_url,v_source_name,r.published_at,r.id
      ) on conflict (slug) do nothing returning id into v_article_id;
      if v_article_id is null then
        continue;
      end if;
      insert into public.df_article_sources(article_id,document_id,is_primary)
        values(v_article_id,r.id,true) on conflict do nothing;
      insert into public.df_official_article_factory_jobs(document_id,article_id,state,quality_reason)
        values(r.id,v_article_id,v_state,
               case when v_publish then 'FULL_BODY_VERIFIED'
                 when r.detail_status='partial' then 'ATTACHMENT_OR_FULL_BODY_REVIEW'
                 else 'SOURCE_DOCUMENT_REQUIRES_EDITOR_REVIEW' end)
        on conflict (document_id) do nothing;
      if v_publish then v_live:=v_live+1; else v_draft:=v_draft+1; end if;
    exception when others then
      v_errors:=v_errors+1;
      v_err:=left(SQLERRM,220);
    end;
  end loop;
  update public.df_official_article_factory_runs
    set finished_at=now(),processed=v_seen,published=v_live,review_created=v_draft,
        failed=v_errors,outcome=case when v_errors=0 then 'success' else 'failed' end,error_text=v_err
    where id=v_run_id;
  return jsonb_build_object('ok',v_errors=0,'processed',v_seen,'auto_published',v_live,
                            'review_created',v_draft,'failed',v_errors,'run_id',v_run_id,
                            'last_error',v_err);
exception when others then
  if v_run_id is not null then
    update public.df_official_article_factory_runs
      set finished_at=now(),outcome='failed',error_text=left(SQLERRM,220) where id=v_run_id;
  end if;
  raise;
end;
$function$

