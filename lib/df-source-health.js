// Safe, public-facing official-source diagnostics. Never expose raw collector errors.
export const REGIONS=["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
export function failureKind(message){
 const s=String(message||"").toLowerCase();
 if(/certificate|unknownissuer|tls|ssl/.test(s))return "TLS_CERTIFICATE";
 if(/유효한 상세 링크|상세 링크|detail.*link|parse/.test(s))return "DETAIL_LINK_NOT_FOUND";
 if(/redirect|리디렉션/.test(s))return "REDIRECT_ERROR";
 if(/timeout|timed out|시간 초과/.test(s))return "TIMEOUT";
 if(/http[_ ]?5\d\d|500|502|503/.test(s))return "SOURCE_HTTP_ERROR";
 if(/connection|connect|reset by peer|sending request|network/.test(s))return "NETWORK_ERROR";
 return "SOURCE_CHECK_REQUIRED";
}
export function sourceHealth(sources,region="전국",clock=Date.now()){
 const enabled=(Array.isArray(sources)?sources:[]).filter(s=>s.collector_enabled===true);
 const selected=region==="전국"?enabled:enabled.filter(s=>s.region_code===region);
 const success=selected.filter(s=>s.last_result==="success").length;
 const partial=selected.filter(s=>s.last_result==="partial").length;
 const failed=selected.filter(s=>s.last_result==="failed").length;
 const pending=selected.length-success-failed-partial;
 const attempts=selected.map(x=>Date.parse(x.last_attempt_at||"")||0);
 const latestAttemptMs=Math.max(0,...attempts);
 const lastAttempt=latestAttemptMs?new Date(latestAttemptMs).toISOString():null;
 const stale=selected.length>0&&(!lastAttempt||clock-latestAttemptMs>2*60*60*1000);
 return {region,total:selected.length,success,failed,partial,pending,lastAttempt,stale,
  status:selected.length===0?"no-source":failed||partial?"partial":stale?"stale":pending?"not-checked":"healthy",
  errors:selected.filter(x=>x.last_result==="failed"||x.last_result==="partial").map(x=>({
    source:x.name,region:x.region_code||"전국",kind:failureKind(x.last_error),at:x.last_attempt_at||null
  }))};
}
export function healthMessage(h){
 if(!h||h.status==="unavailable")return "공식자료 자동수집 상태를 확인하지 못했습니다.";
 if(h.status==="no-source")return "현재 이 지역의 별도 수집처는 확인되지 않았습니다. 전국 공식자료가 포함될 수 있습니다.";
 if(h.status==="partial")return "일부 기관에서 수집 오류가 발생했습니다. 표시되는 자료가 최신·전체 목록은 아닐 수 있습니다.";
 if(h.status==="stale")return "최근 2시간 이내 수집 실행을 확인하지 못했습니다.";
 if(h.status==="not-checked")return "아직 수집을 완료하지 않은 기관이 있습니다.";
 return "등록된 수집처의 최근 점검은 정상입니다. 신규 고시가 모두 확보됐다는 뜻은 아닙니다.";
}
