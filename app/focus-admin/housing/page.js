"use client";
import{useEffect,useState}from"react";
import{DFAdminHeader,DFAdminBottomNav}from"../../../components/df-shell";
const clock=x=>x?new Date(x).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"}):"이력 없음";
const errorLabel=x=>({API_KEY_MISSING:"서버 API 인증키가 적용되지 않았습니다.",API_AUTH_FAILED:"공공데이터 인증키가 거부됐습니다.",API_ZERO_VALID_ROWS:"공식 데이터 응답에 유효한 분양공고가 없습니다.",NO_RECENT_OFFERS:"최근 확인된 분양공고가 없습니다.",DATABASE_READ_FAILED:"분양 DB 조회에 실패했습니다.",DATA_NOT_SYNCED:"분양공고 저장 이력이 없습니다."}[x]||"공식 분양정보를 확보하지 못했습니다.");
export default function HousingAdmin(){
 const[status,setStatus]=useState(null),[feed,setFeed]=useState(null),[busy,setBusy]=useState(false);
 async function refresh(){
  setBusy(true);
  const result=await Promise.allSettled([
   fetch("/api/focus-housing-health",{cache:"no-store"}).then(async r=>({http:r.status,body:await r.json()})),
   fetch("/api/focus-housing",{cache:"no-store"}).then(async r=>({http:r.status,body:await r.json()}))
  ]);
  setStatus(result[0].status==="fulfilled"?result[0].value.body:{ok:false,error:"HEALTH_NETWORK_ERROR"});
  setFeed(result[1].status==="fulfilled"?result[1].value:{http:0,body:{ok:false,error:"NETWORK_ERROR"}});
  setBusy(false);
 }
 useEffect(()=>{refresh()},[]);
 const notices=status?.counts?.notices??null;
 const pipeline=!!status?.pipelineConfigured;
 const hasApiKey=!!status?.officialKeyConfigured;
 const available=!!feed?.body?.ok&&Array.isArray(feed.body.items)&&feed.body.items.length>0;
 const items=available?feed.body.items.slice(0,5):[];
 const failure=feed&&!available;
 const issue=!status?.ok||notices===0||!hasApiKey||!pipeline||failure;
 const line=(title,value,bad=false)=><div className="dfV2HousingLine"><b>{title}</b><span className={bad?"bad":""}>{value}</span></div>;
 return <main className="adminShell dfAdminUnified dfV2Housing"><DFAdminHeader title="분양·청약 운영" kicker="REAL ESTATE"/>
  <section className="adminPanel">
   <div className="adminSectionTitle"><div><small>공식 분양 데이터</small><h2>청약 서비스 연결 상태</h2></div><button type="button" className="miniBtn" disabled={busy} onClick={refresh}>{busy?"확인 중…":"연결 재확인 ↻"}</button></div>
   <div className={"dfV2HousingStatus "+(issue?"issue":"good")} role="status"><strong>{busy?"연결 상태 확인 중":issue?"확인이 필요한 항목이 있습니다":"최근 공식 데이터 조회 정상"}</strong><p>{failure?"공개 분양정보 API: "+errorLabel(feed.body?.reason||feed.body?.error):"데이터 확보 상태는 아래에서 확인하세요."}</p></div>
   <div className="dfV2HousingMetrics">
    <div><small>DB 저장 공고</small><strong>{notices===null?"—":notices.toLocaleString("ko-KR")}<em>건</em></strong></div>
    <div><small>분양가 확인</small><strong>{status?.counts?.priced===undefined?"—":status.counts.priced.toLocaleString("ko-KR")}<em>건</em></strong></div>
    <div><small>공개 API 목록</small><strong>{available?feed.body.items.length:"—"}<em>건</em></strong></div>
   </div>
   {status?.ok?<div className="dfV2HousingDetails">
     {line("최근 데이터 갱신",clock(status.lastUpdated),!status.lastUpdated)}
     {line("공공데이터 인증키",hasApiKey?"환경 설정 감지됨":"환경 설정 미확인",!hasApiKey)}
     {line("서버 정기 동기화",pipeline?"실행 설정 감지됨":"서버 권한·예약 설정 필요",!pipeline)}
     {line("최근 동기화 작업",status.latestSync?.status||"작업 이력 없음",!status.latestSync)}
     {status.latestSync?.error_code&&line("최근 작업 오류",status.latestSync.error_code,true)}
     {status.latestSync?.partial_coverage&&line("분양정보 범위","일부 데이터만 확보됨",true)}
   </div>:<p className="adminDataNote" role="alert">운영 데이터 상태를 읽지 못했습니다. 다시 확인해 주세요.</p>}
   {failure&&<div className="dfV2HousingProblem" role="alert"><b>연결 점검</b><p>공개 API 응답: HTTP {feed.http||"네트워크 오류"} · {errorLabel(feed.body?.reason||feed.body?.error)}</p><p>API 키를 채팅에 노출하지 말고 Vercel 환경 설정에서 확인하세요. 최초 동기화는 서버 인증 후 실행해야 합니다.</p></div>}
   <div className="dfV2HousingLinks"><a href="/focus-admin/system">시스템 점검 →</a><a href="/focus-admin/radar">개발레이더 →</a><a href="/my/properties">관심 부동산 →</a><a href="/focus/housing">공개 분양정보 확인 ↗</a></div>
  </section>
  {items.length>0&&<section className="adminPanel dfV2HousingRecent"><div className="adminSectionTitle"><div><small>공식 API 조회</small><h2>최근 분양공고</h2></div></div>{items.map(x=><div key={x.offer_key}><b>{x.house_name}</b><span>{x.region_name||"지역 미확인"} · {x.published_date||"공고일 미확인"}{x.top_price_manwon?" · 최고 "+x.top_price_manwon.toLocaleString("ko-KR")+"만원":" · 분양가 미확인"}</span></div>)}</section>}
  <p className="adminDataNote">공식 공고가 확인되지 않았을 때 임의로 일정이나 분양가를 표시하지 않습니다. 인증키 원문·서버 권한은 화면에 출력하지 않습니다.</p>
  <DFAdminBottomNav active="housing"/>
 </main>
}
