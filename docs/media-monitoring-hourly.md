# 개발포커스 언론 모니터링 공장 — 실제 구현 기록

기준일: 2026-10-13 / 작업 브랜치: `dev-focus-signature-v1` / Supabase: `svafsvyjjufbqvxzoqee`

## 범위와 저작권
- **언론사 RSS는 공개 뉴스 메타데이터(기사 제목·원문 URL·발행일·언론사)만 수집**한다. RSS description에 기사 전문이 포함돼 있더라도 저장하지 않는다. 본문·사진·신문 원문을 스크레이핑하거나 자동 재게시하지 않는다.
- 개발포커스 기사 작성은 반드시 독자적인 집필을 한다. 수집된 언론보도는 사실 확인의 단서일 뿐이고, 공식 정부·지자체·시행자 자료를 **별도 확인**한다.
- 자동 외부 보도 → 공개 기사로 직접 생성·발행하는 기능 없음. 관리자 검증 후 기존 `/focus-admin/write`에서 초안 작성 → 검토·발행 단계로 이어진다.
- 한국경제 RSS는 당시 HTTP 403(Cloudflare)이었으므로 우회 시도 없이 제외했고, 매일경제TV 부동산 RSS도 SSL 인증서 오류로 제외했다.

## 검증된 언론사·7채널 (실제 HTTP 200, RSS XML)
| 언론사 | 채널 | RSS |
| --- | --- | --- |
| 뉴시스 | 경제 | https://www.newsis.com/RSS/economy.xml |
| 뉴시스 | 산업 | https://www.newsis.com/RSS/industry.xml |
| 뉴시스 | 수도권 | https://www.newsis.com/RSS/met.xml |
| 뉴시스 | 지방 | https://www.newsis.com/RSS/country.xml |
| 매일경제 | 부동산 | https://www.mk.co.kr/rss/50300009/ |
| 매일경제 | 경제 | https://www.mk.co.kr/rss/30100041/ |
| 연합뉴스 | 경제 | https://www.yna.co.kr/rss/economy.xml |

## 운영
- DB 테이블: `df_media_feeds`, `df_media_feed_requests`, `df_media_leads`.
- Cron 15 `df-media-rss-fetch-hourly` 매시 07분 UTC: 고정된 7개 RSS에 pg_net GET.
- Cron 16 `df-media-rss-ingest-hourly` 매시 10분 UTC: HTTP 200 XML의 title/link/pubDate만 해석·키워드 선별·중복 원문 URL 차단.
- 첫 실시간 RSS 7개 입력에서 관련 후보 43건 저장, 중복 0. 2차 정기 실행에서 신규 0건, 정상 처리 7/7. 명백히 무관한 6건은 비공개 제외 처리했으나 감사용 메타데이터는 보존.
- RLS: 세 테이블 전부 활성화. 일반 비회원 조회 불가. 인증된 활성 관리자만 목록 열람 및 후보 상태 전환. 관리자도 외부 기사 원문·이미지를 서버에 복제하는 기능이 없다.
- 관리자 UI: `/focus-admin/media` (관리자 로그인 필수) → 기사 원문 직접 확인 → 공식 1차 자료 URL 대조 → 새 기사 작성.
- 신규 기사 본문은 반드시 독립 집필하고, 기존 `df_create_article_candidate` 검증 프로세스로 제출. 법적 검토, 사실, 수치, 날짜, 출처, 중복 승인 이전에는 발행하지 않는다.

## 상태 검증
```sql
select jobid,jobname,schedule,active from cron.job where jobname like 'df-media-%';
select publisher,section,last_status,last_new from public.df_media_feeds order by id;
select result,count(*),sum(leads_created) from public.df_media_feed_requests group by result;
select review_status,count(*) from public.df_media_leads group by review_status;
select has_function_privilege('anon','public.df_media_collect_feeds()','execute'),
       has_table_privilege('anon','public.df_media_leads','select');
```

### 남은 점검
- Vercel 무료 계정 배포 한도(24시간 내 100회 초과) 때문에 관리자 UI 테스트 프리뷰를 새로 배포하지 못함. GitHub 코드 저장과 백엔드 실가동만 확인됨.
- 원문 URL 기준 중복은 차단되지만 **타 언론사에서 동일 사업을 다르게 보도한 건은 별도 후보로 남음**. 추후 유사 기사 묶음, 공식자료 자동 추천 및 기사 품질 평가를 도입할 수 있음.
- 뉴스별 저작권 이용약관은 별도 검토. RSS 제공 자체가 뉴스 전문 복제 라이선스를 주는 것은 아님.
