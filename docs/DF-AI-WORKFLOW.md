# Development Focus AI Newsroom

기존 investment-google-pipeline에서 검증된 원칙을 뉴스룸에 맞게 이식한다.

1. OFFICIAL_SOURCE_RADAR — 1차 공식자료 수집
2. DUPLICATE_GUARD — 동일 사건/검색의도/공고 중복 차단
3. CHANGE_DETECTOR — 기존 문서와 신규 문서의 숫자·일정·사업단계·토지이용 변경 탐지
4. FACT_ENGINE — 기사에 쓸 사실과 출처 식별
5. REPORTER_AI — FACT bundle만으로 초안
6. DESK_AI — 제목·리드·기사순서·모바일 가독성·중립성 편집
7. VERIFIER_AI — 숫자·날짜·기관·사업단계·확정성·인용을 원문과 재대조
8. QUALITY_GATE — 9.0 미만 또는 hard fail이면 hold
9. RISK_GATE — GREEN/YELLOW/RED. RED 자동발행 금지
10. EDITORIAL_QUEUE — 대표 승인 대기
11. PUBLISH — 승인 후 발행 및 DB/MAP/땅짚고 동시 업데이트

## 이식하지 않는 것
- 티스토리 어댑터
- SEO keyword stuffing/검색순위용 분할
- 블로그식 FAQ/메타태그 중심 구성
- 하루 발행량을 맞추기 위한 저품질 생산

## 보존하는 것
- 공식 1차자료 우선
- 중복 방지
- 9.0 품질 게이트
- 숫자/법률/최신정보 검증
- 제목 과장 금지
- 원본 가치 요구
- 실패 시 hold
