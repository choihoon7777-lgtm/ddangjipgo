
# 개발포커스 분양·청약 데이터 연동

- 경로: /focus/housing, /api/focus-housing, /api/focus-housing-sync
- 원천: 한국부동산원 청약홈 공공데이터포털 분양정보 API (https://www.data.go.kr/data/15098547/openapi.do)
- 공급: APT 일반분양, 무순위·잔여세대, 임의공급. 공급가액은 주택형별 최고분양가(단위: **만원**)로 표시. 실제 동·층·옵션별 가격은 원문 확인.
- DB 변경: supabase/migrations/20261013_df_housing_offers_official.sql. 서비스 배포 전 DB에 적용하고 RLS SELECT 및 anon write 거부를 검증.
- Vercel 서버 환경변수: `DATA_GO_KR_API_KEY` (공공데이터포털에서 한국부동산원 분양정보 API 활용신청 후 발급), `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`. 키는 서버에서만 사용. 브라우저 및 GitHub에 키 저장 금지.
- 정기 수집: Vercel Cron 매일 00:00 UTC(한국 09:00), GET /api/focus-housing-sync, Authorization: Bearer CRON_SECRET.
- 테스트: `npm run test:housing` / `npm run build`.
- 초기 수집은 배포 후 승인된 운영 환경에서 인증된 경로로 1회 실행하며, `counts`와 `df_housing_offers` 최신 데이터를 검증.
- 데이터가 비거나 인증키가 없을 때 가상 데이터를 보여주지 않고 원문 사이트로 안내.
- 모델별 API 실패 시 이전 저장된 가격은 유지. 재시도·실제 청약일정 변경·전수 동기화는 운영 검수 필요.
- **운영 공개/기존 정식 배포는 별도 승인 전 금지.** 신규 분양사업자 홍보 기사가 아니라 공식 모집공고 데이터베이스.

- 데이터베이스 이관 전에도 서버에 허용된 공공데이터 키가 있으면 청약홈 실시간 API를 직접 조회하는 읽기 전용 대체 경로가 있습니다. 요청 결과는 30분 캐시합니다. 공공데이터포털에서 해당 API 활용신청 승인이 필요합니다.
