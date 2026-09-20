# 국토교통부 토지 매매 실거래가 연동

환경변수: DATA_GO_KR_SERVICE_KEY

내부 API 예시:
/api/trades/land?lawdCd=30200&dealYmd=202609

- LAWD_CD: 법정동 코드 앞 5자리
- DEAL_YMD: 계약년월 6자리 YYYYMM
- 서버에서만 공공데이터포털 인증키를 사용
- 원본 응답과 AI 분석은 분리
- 개인정보 보호 때문에 공개 API의 지번은 일부만 제공될 수 있으므로 특정 필지 일치와 주변시장 분석을 구분

배포 환경변수 입력 전에는 live 호출이 실패하는 것이 정상입니다.
