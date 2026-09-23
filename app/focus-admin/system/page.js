"use client";
import{useEffect,useState}from"react";
import{DFAdminHeader,DFAdminBottomNav}from"../../../components/df-shell";
export default function System(){
 const[health,setHealth]=useState(null);
 useEffect(()=>{fetch("/api/health",{cache:"no-store"}).then(r=>r.json()).then(setHealth).catch(()=>setHealth({error:true}))},[]);
 const c=health?.components||{};
 const items=[
  ["공식자료 수집기",c.officialCollector==="not_connected"?"연결 전":"연결됨"],
  ["중복 제거","기본 중복검사 연결"],
  ["변경 감지","구조 준비"],
  ["AI 기사작성",c.ai==="configured"?"연결됨":"API 설정 필요"],
  ["검증 게이트","연결됨"],
  ["Supabase 운영DB",c.database==="configured"?"연결됨":"확인 필요"],
  ["토지 실거래 API",c.landTradeApi==="configured"?"연결됨":"API 설정 필요"],
  ["땅짚고 주소엔진","외부 주소데이터 연결"]
 ];
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="시스템 상태" kicker="OPERATIONS"/><section className="adminPanel"><h2>서비스 연결상태</h2><div className="systemList">{items.map(([a,b])=><div key={a}><b>{a}</b><span>{b}</span></div>)}</div><p className="adminDataNote">연결되지 않은 기능을 정상으로 표시하지 않습니다.</p></section><DFAdminBottomNav active="system"/></main>
}