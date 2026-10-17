-- Short-lived first-party response cache for official boards with intermittent TLS/network errors.
-- No public access. Only a fixed list of official HTTPS URLs can be stored.
create table if not exists public.df_official_feed_cache(
 url text primary key,
 body text not null check(length(body) between 600 and 2000000),
 content_type text,
 fetched_at timestamptz not null default now()
);
alter table public.df_official_feed_cache enable row level security;
revoke all on public.df_official_feed_cache from anon,authenticated;
grant select on public.df_official_feed_cache to service_role;
create table if not exists public.df_official_feed_pending(
 request_id bigint primary key,
 url text not null,
 requested_at timestamptz not null default now()
);
alter table public.df_official_feed_pending enable row level security;
revoke all on public.df_official_feed_pending from anon,authenticated;
grant select on public.df_official_feed_pending to service_role;
-- The same request is never pointed at a user-supplied endpoint.
select cron.schedule('df-official-feed-cache-fetch','7,27,47 * * * *',
 $job$
 insert into public.df_official_feed_pending(request_id,url)
 select net.http_get(
  url:=u.url,
  headers:='{"User-Agent":"Mozilla/5.0","Accept":"text/html,application/xhtml+xml"}'::jsonb,
  timeout_milliseconds:=20000
 ),u.url
 from (values
 ('https://sido.busan.go.kr/citynet/jsp/sap/SAPGosiBizProcess.do?command=searchList&flag=gosiGL&svp=Y'),
 ('https://sido.chungbuk.go.kr/citynet/jsp/sap/SAPGosiBizProcess.do?command=searchList&flag=gosiGL&svp=Y'),
 ('https://www.gb.go.kr/Main/open_contents/section/ftc/page.do?mnu_uid=6789'),
 ('https://ulsan.go.kr'),
 ('https://ulsan.go.kr/u/rep/transfer/notice/list.ulsan?mId=001004002000000000')
 ) u(url);
 $job$
);
select cron.schedule('df-official-feed-cache-store','9,29,49 * * * *',
 $job$
 insert into public.df_official_feed_cache(url,body,content_type,fetched_at)
 select q.url,r.content,r.headers->>'content-type',now()
 from public.df_official_feed_pending q join net._http_response r on r.id=q.request_id
 where r.status_code=200 and length(r.content) between 600 and 2000000
 and (r.content ilike '%<html%' or r.content ilike '%<rss%' or r.content ilike '%<?xml%')
 and q.requested_at > now()-interval '5 minutes'
 on conflict (url) do update set body=excluded.body,content_type=excluded.content_type,fetched_at=excluded.fetched_at;
 delete from public.df_official_feed_pending where requested_at<now()-interval '15 minutes';
 $job$
);