-- Capture pending detail pages via the same independently verified first-party HTTP client.
-- Only these original provincial government document formats are eligible.
select cron.schedule('df-official-feed-details','8,28,48 * * * *',
 $job$
 insert into public.df_official_feed_pending(request_id,url)
 select net.http_get(
  url:=d.source_url,
  headers:='{"User-Agent":"Mozilla/5.0","Accept":"text/html,application/xhtml+xml"}'::jsonb,
  timeout_milliseconds:=20000
 ),d.source_url
 from public.df_source_documents d
 join public.df_sources s on s.id=d.source_id
 where s.is_active=true and s.source_type='official'
 and d.verification_status='pending' and d.detail_status='queued'
 and d.last_checked_at>now()-interval '5 days'
 and (
 (s.name like '울산광역시%' and d.source_url ~ '^https://ulsan[.]go[.]kr/u/rep/transfer/notice/[0-9]+[.]ulsan[?]mId=001004002000000000&gosiGbn=[ANPE]$')
 or
 (s.name like '충청북도%' and d.source_url ~ '^https://sido[.]chungbuk[.]go[.]kr/citynet/jsp/sap/SAPGosiBizProcess[.]do[?]command=searchDetail&flag=gosiGL&svp=Y&sno=[0-9]+&gosiGbn=[ANPE]$')
 or
 (s.name like '부산광역시%' and d.source_url ~ '^https://sido[.]busan[.]go[.]kr/citynet/jsp/sap/SAPGosiBizProcess[.]do[?]command=searchDetail&flag=gosiGL&svp=Y&sno=[0-9]+&gosiGbn=[ANPE]$')
 )
 order by d.last_checked_at desc limit 10
 $job$
);