# 개발포커스 공식자료 시간별 기사 공장

## 실제 배포된 Supabase 구성 (2026-10-13)
- 프로젝트: `svafsvyjjufbqvxzoqee`
- `df-official-public-hourly-10-batches`: 매시 00, 06, 12, 18, 24, 30, 36, 42, 48, 54분 UTC에 공식기관 소스 3개씩 점검 (총 29개)
- `df-official-article-factory-hourly`: 매시 58분 UTC에 SQL 함수 `public.df_run_official_article_factory(30)` 실행
- 기존 네이버 RSS 일일 동기화 `df-investgo-naver-rss-daily`는 별도이며 변경하지 않음.
- Supabase migration: `df_hourly_official_article_factory_with_strict_autopublish_gate`, `df_official_factory_connect_admin_editorial_review_queue`
- 함수/테이블: `df_run_official_article_factory`, `df_official_article_factory_runs`, `df_official_article_factory_jobs`, `df_official_factory_health`, `df_editorial_queue`.
- 자동 발행: 공식기관 레코드가 검증됐고, 본문 600자 이상, 핵심 120자 이상, 원문 링크가 실제 상세페이지이며, 비공개/첨부 검증대기 상태가 아니어야 함. 이 조건을 만족하지 않으면 공개되지 않는 `review` 기사 및 `manual_required` 편집 검토 대기열로 보냄.
- 기사 발행일은 수집시간이 아닌 기관의 원 발표일 `df_source_documents.published_at`을 사용함.
- 중복 방지: 원본 문서 UUID → 기사 UUID 일대일 인덱스, 원본 기사 제목과의 중복 검사, SQL advisory transaction lock.
- 공개 뷰 `df_official_factory_health`는 집계 수치만 노출, 실제 기사 공장 함수는 anon/authenticated 실행 권한 없음.
- 독자 화면: `/focus/live` 및 `/focus/policy`. 개발팀 검수: `/focus-admin/updates`. 보호된 수동 검토: `/focus-admin/publish`.
- 웹앱 Vercel 정식 운영 배포는 사용자 승인이 있어야 함. DB Cron은 사용자 요청으로 활성화됨.

## 검증 절차
1. `select public.df_run_official_article_factory(30);` 결과의 생성·오류 확인.
2. 재실행 시 `processed=0`인 중복 방지 확인.
3. `df_official_article_factory_jobs`와 `df_editorial_queue`의 `review` 기사 수 일치 확인.
4. `df_official_factory_health`의 전반적인 상황 및 소스 오류 점검.
5. `cron.job_run_details`에서 시간별 실행 성공 여부, `net._http_response`에서 외부기관 수집 호출 성공 확인.
6. 부분요약·첨부 미확보·목록 전용 URL·비공개는 자동발행 금지.
7. 실제 공식기관별 상세 파서와 HWP/PDF 원문 추출 실패는 남은 작업. 일부 원문이 부족하면 해당 시간에 공개 기사 0건은 정상 안전 동작.

## 제한
문서 기반 결정론적 자동 기사 원고 생성입니다. 자동 LLM 창작·해석·법률 의견 생성은 포함하지 않으며, 출처와 검증되지 않은 사업 수치를 만들어내지 않습니다.
