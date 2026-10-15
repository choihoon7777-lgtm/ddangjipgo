# 도시맥 공식자료 수집 보안 및 운영 (2026-10-15)
- **공개 GET**: /api/focus-public-updates, Supabase df-public-update 상태/공개자료 조회 가능.
- **관리자 수동 POST**: 웹에서 Supabase 로그인 → 활성 df_admin_roles 권한 확인 → Bearer access token을 Vercel 서버가 검증한 후 Edge에 전달. 임의 방문자는 401/403. 비로그인 관리자 미리보기는 읽기 전용.
- **정기 실행**: 기존 6분 간격 pg_cron 유지. DB에서 일회용 UUID 토큰 생성 → Edge가 df_claim_ingest_token으로 일회성 확인 → 재사용 거부. Supabase 공개 HTTP 주소로 인증 없는 POST는 403.
- **DB**: df_ingest_run_tokens RLS 켜짐; anon/authenticated 직접 테이블 접근 차단. df_claim_ingest_token RPC 실행은 service_role에만 허용.
- **재배포 순서**: SQL 마이그레이션 → cron 보안 헤더 반영 → Edge 함수(verify_jwt:false, 자체 토큰/JWT 검증 포함) → Vercel 배포.
- **검수**: 미인증 Edge POST 403, GET 200, 1회용 토큰 사용 후 consumed_at 기록, 2차 사용 실패, 최근 cron 이력/df_public_collection_claims 갱신 확인. 정상 시에도 실제 신규자료 확보 여부는 별도 검증.
- **운영자 테스트**: 관리자 계정으로 실제 수동 갱신 1배치 실행 및 권한 없는 계정 403 확인 필요. 공개 DB 건수/발행 기록을 수동으로 조작하거나 검토대기를 일괄 승인하지 말 것.
- **분양·청약**: df_housing_offers 0건; 서비스 키의 실제 런타임 적용, SUPABASE_SERVICE_ROLE_KEY/CRON_SECRET 및 별도 스케줄 연결은 미완료. 키는 채팅·클라이언트에 노출하지 말 것.
