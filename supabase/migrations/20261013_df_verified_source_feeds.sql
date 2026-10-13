-- Verified official feeds only. Preserve all current source state, records and edits.
-- Distinguish government bulletin boards, official press RSS and official JSON APIs.
UPDATE public.df_sources SET feed_url='https://state.gwd.go.kr/road/announce'
 WHERE id='2467dc8a-2624-4a44-8bcd-768dcb16fc92' AND feed_url IN ('https://state.gwd.go.kr','https://state.gwd.go.kr/road/announce');
UPDATE public.df_sources SET feed_url='https://www.jeonbuk.go.kr/board/list.jeonbuk?boardId=BBS_0000129&menuCd=DOM_000000102002003001'
 WHERE id='6355f8d7-2140-412f-a3f7-017d62afba42' AND feed_url IN ('https://www.jeonbuk.go.kr','https://www.jeonbuk.go.kr/board/list.jeonbuk?boardId=BBS_0000129&menuCd=DOM_000000102002003001');
UPDATE public.df_sources SET feed_url='https://www.jeju.go.kr/tool/sido/api.jsp?act=index&page=1'
 WHERE id='ced47473-f331-4f90-ba40-4267a8acad54' AND feed_url IN ('https://www.jeju.go.kr','https://www.jeju.go.kr/tool/sido/api.jsp?act=index&page=1');
UPDATE public.df_sources SET feed_url='https://www.incheon.go.kr/mayor_9/MA05010000'
 WHERE id='6ec50da4-c5de-4651-9bb7-2e0ca50e3e3b' AND feed_url IN ('https://www.incheon.go.kr','https://www.incheon.go.kr/mayor_9/MA05010000');
UPDATE public.df_sources SET feed_url='https://seoulboard.seoul.go.kr/rss/RSSGenerator?bbsNo=158'
 WHERE id='83bbd5f0-a02a-430e-b482-9064cc5fefbd' AND feed_url IN ('https://www.seoul.go.kr','https://seoulboard.seoul.go.kr/rss/RSSGenerator?bbsNo=158');
