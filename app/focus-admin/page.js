"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../components/df-shell";

const groups=[
 {name:"콘텐츠·편집",items:[["언론 모니터링","기사 후보와 공식자료 대조","/focus-admin/media"],["공식자료 등록","공식 URL과 문서 관리","/focus-admin/sources"],["AI 원고 작성","검증을 거치는 원고 제작","/focus-admin/ai-test"],["투자GO 글 관리","블로그 이식·중복 검토","/focus-admin/blog-import"],["정정·신고","독자 요청과 정정 이력","/focus-admin/claims"]]},
 {name:"부동산 정보",items:[["분양·청약","청약 데이터와 API 연결 상태","/focus-admin/housing"],["개발레이더","관심부지 개발정보 확인","/focus-admin/radar"]]},
 {name:"운영·분석",items:[["운영 통계","기사 조회와 방문 흐름","/focus-admin/stats"],["광고 운영","광고 신청·진행 상태","/focus-admin/ads"],["공지 관리","공지 작성·예약","/focus-admin/notices"],["서비스 상태","DB·공식기관·외부 API 점검","/focus-admin/system"]]}
];
const countOrDash=x=>Number.isInteger(x)?x.toLocaleString("ko-KR"):"—";
const latestTime=x=>x?new Date(x).toLocaleString("ko-KR",{timeZone:"Asia/Seoul",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}):"미확인";

export default function Admin(){
 const[guest,setGuest]=useState(null),[reload,setReload]=useState(0);
 const[stats,setStats]=useState({queue:null,published:null,today:null,claims:null,ads:null});
 const[systems,setSystems]=useState({official:null,housing:null});
 useEffect(()=>{
  let active=true;
  (async()=>{
   try{
    const{data:{user},error:authError}=await dfSupabase.auth.getUser();
    if(authError||!user){if(active)setGuest(true);return}
    const role=await dfSupabase.from("df_admin_roles").select("role").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
    if(role.error||!role.data){if(active)setGuest(true);return}
    if(active)setGuest(false);
    const today=new Date(Date.now()+9*3600000).toISOString().slice(0,10)+"T00:00:00+09:00";
    const [q,p,t,c,a]=await Promise.all([
     dfSupabase.from("df_editorial_queue").select("id",{count:"exact",head:true}).is("reviewed_at",null),
     dfSupabase.from("df_articles").select("id",{count:"exact",head:true}).in("status",["published","corrected"]),
     dfSupabase.from("df_articles").select("id",{count:"exact",head:true}).in("status",["published","corrected"]).gte("published_at",today),
     dfSupabase.from("df_claims").select("id",{count:"exact",head:true}).in("status",["open","reviewing"]),
     dfSupabase.from("df_ad_campaigns").select("id",{count:"exact",head:true}).eq("status","active")
    ]);
    if(active)setStats({queue:q.error?null:q.count,published:p.error?null:p.count,today:t.error?null:t.count,claims:c.error?null:c.count,ads:a.error?null:a.count});
   }catch{if(active)setGuest(true)}
  })();
  (async()=>{
   const result=await Promise.allSettled([
    fetch("/api/health/official",{cache:"no-store"}).then(r=>r.ok?r.json():null),
    fetch("/api/focus-housing-health",{cache:"no-store"}).then(r=>r.ok?r.json():null)
   ]);
   if(active)setSystems({official:result[0].status==="fulfilled"&&result[0].value?.ok?result[0].value:null,housing:result[1].status==="fulfilled"&&result[1].value?.ok?result[1].value:null});
  })();
  return()=>{active=false}
 },[reload]);
 const sources=systems.official?.national;
 const failed=sources?Number(sources.failed||0)+Number(sources.partial||0):null;
 const housing=systems.housing;
 const housingIssue=!!housing&&(!housing.counts?.notices||!housing.officialKeyConfigured||!housing.pipelineConfigured||housing.stale);
 return <main className="adminShell dfAdminUnified dfV2Admin"><DFAdminHeader title="편집국 운영센터" back="/focus"/>
  <section className="dfV2Hero"><div><small>DOSIMAEK · NEWSROOM</small><h1>편집국 운영센터</h1><p>검토부터 발행, 공식자료와 부동산 운영까지 한눈에 확인합니다.</p></div><button type="button" onClick={()=>setReload(n=>n+1)} aria-label="운영 현황 새로고침">새로고침 ↻</button></section>
  {guest===null&&<p className="adminDataNote" role="status">운영자 권한을 확인하고 있습니다.</p>}
  {guest===true&&<section className="dfV2Guest" aria-label="관리자 체험 안내"><div><b>읽기 전용 검수</b><p>로그인 없이 메뉴와 공개 자료를 확인할 수 있습니다. 원고 승인·수정·발행·삭제는 관리자 인증 후 가능합니다.</p></div><a href="/focus-admin/login">운영자 로그인 →</a></section>}
  <section className="dfV2Summary" aria-label="운영 현황">
   <div className="dfV2SectionHead"><h2>운영 현황</h2><span>{guest===false?"운영 DB 실시간 조회":"관리자 로그인 시 내부 지표 표시"}</span></div>
   <div className="dfV2StatGrid">
    <a href="/focus-admin/publish"><small>검토 대기</small><strong>{guest===false?countOrDash(stats.queue):"—"}<em>건</em></strong><span>기사 확인 →</span></a>
    <a href="/focus/live"><small>오늘 발행</small><strong>{guest===false?countOrDash(stats.today):"—"}<em>건</em></strong><span>발행 목록 →</span></a>
    <a href="/focus/live"><small>전체 발행</small><strong>{guest===false?countOrDash(stats.published):"—"}<em>건</em></strong><span>누적 기준</span></a>
    <a href="/focus-admin/claims"><small>정정 요청</small><strong>{guest===false?countOrDash(stats.claims):"—"}<em>건</em></strong><span>처리 확인 →</span></a>
   </div>
  </section>
  <section className="dfV2Priority" aria-label="우선 처리 업무">
   <div className="dfV2SectionHead"><h2>우선 처리할 업무</h2><span>문제 발생 시 먼저 확인하세요</span></div>
   <a href="/focus-admin/publish"><span className="dfV2PriorityIcon" aria-hidden="true">▤</span><span><b>기사 검토·발행</b><small>{guest===false&&stats.queue!==null?stats.queue+"건 검토 대기 · 미통과 항목 확인":"검증 완료 여부와 보류 사유 확인"}</small></span><strong>›</strong></a>
   <a href="/focus-admin/updates"><span className="dfV2PriorityIcon" aria-hidden="true">◈</span><span><b>공식기관 업데이트</b><small>{failed===null?"기관별 최근 상태 확인 중":failed>0?failed+"곳 실패·부분 오류 · 원인 확인":"최근 기관 점검 결과 정상 · 자료 누락 가능성 별도 확인"}{sources?.lastAttempt?" · "+latestTime(sources.lastAttempt):""}</small></span><strong>›</strong></a>
   <a href="/focus-admin/housing" className={housingIssue?"needsAttention":""}><span className="dfV2PriorityIcon" aria-hidden="true">⌂</span><span><b>분양·청약 데이터</b><small>{!housing?"데이터 연결 상태 확인 중":housingIssue?"자료 또는 인증·정기 수집 점검 필요":housing.counts.notices+"건 확보 · 최근 상태 정상"}</small></span><strong>›</strong></a>
  </section>
  <section className="dfV2Actions">
   <div className="dfV2SectionHead"><h2>빠른 실행</h2><span>자주 쓰는 업무</span></div>
   <div className="dfV2ActionGrid">
    <a href="/focus-admin/write"><b>＋</b><strong>기사 작성</strong><small>초안 작성·저장</small></a>
    <a href="/focus-admin/publish"><b>✓</b><strong>검토·발행</strong><small>검증 결과·예약</small></a>
    <a href="/focus-admin/updates"><b>⌕</b><strong>공식자료</strong><small>기관 상태·오류</small></a>
   </div>
  </section>
  <section className="dfV2Services"><div className="dfV2SectionHead"><h2>서비스 바로가기</h2></div><div className="dfV2ServiceLinks"><a href="/focus-admin/housing">분양·청약 →</a><a href="/focus-admin/radar">개발레이더 →</a><a href="/focus-admin/stats">운영 통계 →</a><a href="/focus-admin/system">서비스 상태 →</a></div></section>
  <details className="dfAdminAllMenu dfV2AllMenu" open={guest===true}><summary><span><small>ALL OPERATIONS</small><b>전체 운영 메뉴</b></span><strong>펼치기</strong></summary><div className="dfAdminGroups">{groups.map(g=><section className="dfAdminGroup" key={g.name}><div className="dfAdminGroupHead"><h2>{g.name}</h2></div><div className="adminMenu">{g.items.map(([name,desc,href])=><a href={href} key={href}><div><b>{name}</b><span>{desc}</span></div><strong>›</strong></a>)}</div></section>)}</div></details>
  <DFAdminBottomNav active="home"/>
 </main>
}
