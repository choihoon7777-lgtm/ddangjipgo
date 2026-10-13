
"use client";
import {useEffect,useState} from "react";
import {DFAdminHeader,DFAdminBottomNav} from "../../../components/df-shell";
export default function HousingAdmin(){
 const [status,setStatus]=useState(null),[busy,setBusy]=useState(false);
 async function refresh(){
  setBusy(true);
  const r=await fetch("/api/focus-housing-health",{cache:"no-store"}).then(x=>x.json()).catch(()=>({ok:false,error:"NETWORK_ERROR"}));
  setStatus(r);setBusy(false);
 }
 useEffect(()=>{refresh()},[]);
 const row=(k,v)=><div style={{display:"flex",justifyContent:"space-between",gap:12,padding:"12px 0",borderBottom:"1px solid #e6eaf0"}}><b>{k}</b><span>{v}</span></div>;
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="분양·청약 수집상태" kicker="OFFICIAL HOUSING"/>
 <section className="adminPanel"><div className="adminSectionTitle"><div><small>DATA STATUS</small><h2>청약홈 공식 분양 데이터</h2></div><button className="miniBtn" disabled={busy} onClick={refresh}>{busy?"확인 중":"새로고침"}</button></div>
 {!status?<p className="adminDataNote">수집 현황 확인 중</p>:!status.ok?<p role="alert" className="adminDataNote">상태 조회 실패 · {status.error}</p>:<>
  {row("저장된 공식 공고",(status.counts?.notices??0)+"건")}
  {row("분양가 확인 공고",(status.counts?.priced??0)+"건")}
  {row("최근 데이터 수집",status.lastUpdated?new Date(status.lastUpdated).toLocaleString("ko-KR"):"수집 이력 없음")}
  {row("데이터 상태",status.stale?"갱신 필요":"최근 자료")}
  {row("공공데이터 API 키",status.officialKeyConfigured?"설정됨":"미설정")}
  {row("정기수집 서버 인증",status.pipelineConfigured?"설정됨":"CRON_SECRET / 서버 DB 키 설정 필요")}
 </>}
 <p className="adminDataNote">상태만 공개하며 인증키는 표시하지 않습니다. 정기 수집은 인증된 서버에서만 실행됩니다. 실시간 수집 결과와 실제 단지별 공급공고를 대조한 뒤 운영 공개하십시오.</p>
 <a href="/focus/housing">분양·청약 공개화면 확인 →</a>
 </section><DFAdminBottomNav active="system"/></main>
}
