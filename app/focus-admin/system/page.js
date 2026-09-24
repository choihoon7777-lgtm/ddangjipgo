"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../../components/df-shell";
export default function System(){
 const[health,setHealth]=useState(null),[counts,setCounts]=useState({}),[refreshing,setRefreshing]=useState(false);
 async function load(){
  setRefreshing(true);
  const h=await fetch("/api/health",{cache:"no-store"}).then(r=>r.json()).catch(()=>({error:true}));
  const [docs,arts,watch,alerts]=await Promise.all([
   dfSupabase.from("df_source_documents").select("id",{count:"exact",head:true}),
   dfSupabase.from("df_articles").select("id",{count:"exact",head:true}),
   dfSupabase.from("df_land_watchlists").select("id",{count:"exact",head:true}),
   dfSupabase.from("df_land_alerts").select("id",{count:"exact",head:true})
  ]);
  const dbError=docs.error||arts.error||watch.error||alerts.error;setHealth({...h,components:{...(h.components||{}),database:dbError?"error":"configured"},databaseError:dbError?.message||null});setCounts({docs:docs.count??null,articles:arts.count??null,watchlists:watch.count??null,alerts:alerts.count??null});setRefreshing(false);
 }
 useEffect(()=>{load()},[]);
 const c=health?.components||{};
 const items=[
  ["공식자료 URL 수집","연결됨"],
  ["공식 RSS 수집",c.officialCollector==="rss_plus_html_fallback"?"연결됨 · RSS+목록 대체수집":c.officialCollector==="rss_manual"?"연결됨 · 수동 실행":"확인 필요"],
  ["중복·변경 감지","연결됨"],
  ["AI 기사작성",c.ai==="configured"?"연결됨 · "+(c.aiTransport||""):"인증 확인 필요"],
  ["검증·발행 게이트","연결됨"],
  ["Supabase 운영DB",c.database==="configured"?"연결됨":c.database==="error"?"조회 실패":"확인 필요"],
  ["토지 실거래 API",c.landTradeApi==="configured"?"연결됨":"외부 API 키 미연결"],
  ["자동수집·예약발행",c.automation==="configured"?"운영 준비됨":"배포 환경키 필요"],
  ["이메일 알림",c.emailAlerts==="configured"?"운영 준비됨":"RESEND 키·발신주소 필요"],
  ["SEO 사이트 URL",c.siteUrl==="configured"?"연결됨":"배포 URL 확인 필요"],
  ["땅짚고 관심부동산","연결됨"]
 ];
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="시스템 상태" kicker="OPERATIONS"/>
 <section className="adminPanel"><div className="adminSectionTitle"><div><small>HEALTH</small><h2>서비스 연결상태</h2></div><button className="miniBtn" onClick={load} disabled={refreshing}>{refreshing?"확인 중…":"새로고침"}</button></div><div className="systemList">{items.map(([a,b])=><div key={a}><b>{a}</b><span>{b}</span></div>)}</div>{health?.databaseError&&<p className="adminDataNote">DB 조회 오류 · {health.databaseError}</p>}<p className="adminDataNote">연결되지 않은 외부 서비스는 정상으로 표시하지 않습니다.</p></section>
 <section className="adminPanel"><div className="adminSectionTitle"><div><small>DATA</small><h2>운영 데이터</h2></div></div><div className="adminStats"><div><b>{counts.docs??"—"}</b><span>공식자료</span></div><div><b>{counts.articles??"—"}</b><span>기사</span></div><div><b>{counts.watchlists??"—"}</b><span>관심부동산</span></div><div><b>{counts.alerts??"—"}</b><span>알림</span></div></div></section>
 <section className="adminPanel"><div className="adminSectionTitle"><div><small>TOOLS</small><h2>운영 도구</h2></div></div><div className="adminMenu"><a href="/focus-admin/sources"><div><b>공식자료 수집센터</b><span>국토부·과기정통부·행안부 공식 RSS를 수집하고 변경자료를 감지합니다.</span></div><strong>›</strong></a><a href="/focus-admin/ai-test"><div><b>AI 기사작성</b><span>수집자료 또는 공식 URL을 FACT → 기자 → 데스크 → 검증 순으로 처리합니다.</span></div><strong>›</strong></a><a href="/focus-admin/publish"><div><b>검증·발행 대기열</b><span>출처·사실·숫자·날짜·중복·법적검토를 통과한 기사만 발행합니다.</span></div><strong>›</strong></a></div></section>
 <DFAdminBottomNav active="system"/></main>
}