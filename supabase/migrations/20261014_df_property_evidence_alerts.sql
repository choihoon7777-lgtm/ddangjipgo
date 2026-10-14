-- Registered-property notifications: do not confuse regional coverage with parcel impact.
-- Does not read subscriber property data publicly or publish any articles.
alter table public.df_land_watchlists
 add column if not exists watch_official boolean not null default true,
 add column if not exists watch_dong_updates boolean not null default false;

-- Prevent authenticated clients from inventing alert bodies or changing owner records.
revoke update on public.df_land_alerts from authenticated;
grant update(status) on public.df_land_alerts to authenticated;
create unique index if not exists df_land_alerts_watch_doc_unique
on public.df_land_alerts(watchlist_id,alert_type,((payload->>'document_id')))
where alert_type in ('official_parcel','official_dong') and payload ? 'document_id';

-- Historic region-only alerts were misleading: never seed them on registration.
create or replace function public.df_seed_watchlist_alerts()
returns trigger language plpgsql security definer
set search_path=public,pg_temp as $$
begin
  return new;
end $$;
revoke all on function public.df_seed_watchlist_alerts() from public,anon,authenticated;

-- This conservative alerting job finds confirmed *document mentions*.
-- A document mention is not proof of inclusion, distance or legal zoning change.
create or replace function public.df_monitor_watchlist_official_mentions()
returns jsonb language plpgsql security definer
set search_path=public,pg_temp as $$
declare
 w record; d record;
 parts text[];
 lot_number text; dong_name text;
 text_body text; pnu text;
 direct boolean; dong_only boolean; created int:=0; scanned int:=0;
begin
 if not pg_try_advisory_xact_lock(931026,19) then
   return jsonb_build_object('ok',false,'reason','BUSY');
 end if;
 for w in
   select id,profile_id,address_text,parcel_key,created_at,watch_dong_updates
   from public.df_land_watchlists
   where is_active=true and watch_official=true and profile_id is not null
     and nullif(trim(address_text),'') is not null
   order by created_at desc limit 2000
 loop
   parts:=regexp_match(w.address_text,
     '([가-힣]{1,20}(동|읍|면|리))[[:space:]]+(산[[:space:]]*)?([0-9]{1,5})(-([0-9]{1,4}))?[[:space:]]*$');
   dong_name:=case when parts is not null then parts[1] else null end;
   lot_number:=case when parts is not null then
     (case when parts[3] is not null then '산 ' else '' end)||parts[4]||coalesce(parts[5],'')
    else null end;
   pnu:=case when w.parcel_key ~ '^[0-9]{19}$' then w.parcel_key else null end;
   if pnu is null and (dong_name is null or lot_number is null) then continue; end if;
   for d in
    select id,title,source_url,published_at,content_text
    from public.df_source_documents
    where verification_status='verified' and detail_status='complete'
      and published_at>=greatest(w.created_at,now()-interval '7 days')
      and published_at<=now()+interval '1 day'
      and coalesce(raw_payload->>'public_hidden','false')<>'true'
      and source_url ~ '^https://([a-z0-9-]+[.])*[a-z0-9-]+[.]go[.]kr/'
      and nullif(trim(content_text),'') is not null
    order by published_at desc limit 300
   loop
      scanned:=scanned+1;
      text_body:=left(d.title||E'\n'||d.content_text,100000);
      direct:=pnu is not null and position(pnu in text_body)>0;
      if not direct and dong_name is not null and lot_number is not null then
        -- District name and exact parcel number must appear close together.
        direct:=text_body ~ (dong_name||'.{0,80}(^|[^[:digit:]])'||
                           replace(lot_number,' ','[[:space:]]*')||'([^[:digit:]]|$)');
      end if;
      dong_only:=not direct and w.watch_dong_updates and
                 dong_name is not null and position(dong_name in text_body)>0;
      if not direct and not dong_only then continue; end if;
      insert into public.df_land_alerts(watchlist_id,alert_type,title,payload,status)
      values (w.id,case when direct then 'official_parcel' else 'official_dong' end,
        case when direct then '등록 필지 언급 공식자료: ' else '같은 동 참고자료: ' end||left(d.title,155),
        jsonb_build_object('document_id',d.id,'source_url',d.source_url,
          'source_published_at',d.published_at,'match_level',
          case when direct then 'same_parcel_reference' else 'same_dong_reference' end,
          'evidence_note',case when direct
            then '동일 필지 번호가 정부·지자체 문서에 언급되었습니다. 사업구역 포함·권리제한 변경은 미확정입니다.'
            else '같은 행정동이 문서에 언급됐습니다. 거리·영향·사업구역 포함은 확인되지 않았습니다.' end),
        'pending')
      on conflict do nothing;
      if found then created:=created+1; end if;
   end loop;
 end loop;
 return jsonb_build_object('ok',true,'created',created,'checked_watch_document_pairs',scanned);
end $$;
revoke all on function public.df_monitor_watchlist_official_mentions() from public,anon,authenticated;
-- Runs 08:15 KST, using UTC scheduler. No email/push is sent by this job.
select cron.schedule('df-watchlist-official-daily','15 23 * * *',
  $cron$select public.df_monitor_watchlist_official_mentions();$cron$);