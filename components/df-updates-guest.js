"use client";
import {useEffect,useMemo,useState} from "react";
import {dfSupabase} from "../lib/df-browser";
import {DFAdminHeader,DFAdminBottomNav} from "./df-shell";

const ENDPOINT="https://svafsvyjjufbqvxzoqee.supabase.co/functions/v1/df-public-update";
const time=x=>x?new Date(x).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"}):"미점검";
const date=x=>x?new Date(x).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"}):"공개일 미확인";
export default function GuestUpdates(){
 const [status,setStatus]=useState(null),[records,setRecords]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[progress,setProgress]=useState(""),[results,setResults]=useState([]),[message,setMessage]=useState(""),[view,setView]=useState("all");
 async function load(){
  setLoading(true);
  const [a,b]=await Promise.allSettled([
   fetch(ENDPOINT,{method:"GET",cache:"no-store"}).then(async r=>{const v=await r.json();if(!r.ok)throw Error(v.error||"기관 현황 조회 실패");return v}),
   dfSupabase.rpc("df_public_development_policy",{p_channel:null,p_topic:null,p_limit:100,p_offset:0})
  ]);
  if(a.status==="fulfilled")setStatus(a.value);else setMessage("수집 현황을 불러오지 못했습니다: "+a.reason.message);
  if(b.status==="fulfilled"&&!b.value.error)setRecords(b.value.data||[]);
  else setMessage("공개자료 조회 오류: "+(b.status==="rejected"?b.reason.message:b.value.error.message));
  setLoading(false);
 }
 useEffect(()=>{load()},[]);
 async function callBatch(i){
  const r=await fetch(ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({batch:i})});
  const data=await r.json().catch(()=>({error:"서버 응답 오류"}));
  if(!r.ok&&r.status!==429)throw Error(data.error||"실제 수집 실행 실패");
  return data;
 }
 async function run(all){
  if(busy)return;
  setBusy(true);setMessage("");setProgress("");setResults([]);
  const sourceList=status?.sources||[];
  const batches=all?Array.from({length:10},(_,i)=>i):[Array.from({length:10},(_,i)=>({batch:i,last:Math.max(0,...sourceList.slice(i*3,i*3+3).map(s=>Date.parse(s.last_attempt_at||"")||0))})).sort((a,b)=>a.last-b.last)[0].batch];
  let cursor=0;const done=[];
  try{
   await Promise.all(Array.from({length:all?2:1},async()=>{
    while(cursor<batches.length){
     const batch=batches[cursor++];
     try{
      const result=await callBatch(batch);
      done.push({...result,batch});
     }catch(e){done.push({batch,error:e.message})}
     setProgress("실제 서버 실행 "+done.length+"/"+batches.length+"묶음 · 신규 "+done.reduce((n,x)=>n+(x.created||0),0)+"건");
    }
   }));
   setResults(done.sort((a,b)=>a.batch-b.batch));
   const created=done.reduce((n,x)=>n+(x.created||0),0),published=done.reduce((n,x)=>n+(x.published||0),0),fail=done.reduce((n,x)=>n+(x.failed||0),0);
   setMessage("실제 업데이트 완료 · 신규 등록 "+created+"건 · 검증 후 공개 "+published+"건 · 수집 오류 "+fail+"건"+(done.some(x=>x.busy)?" · 일부 기관은 15분 재수집 제한 적용":""));
  }catch(e){setMessage("수집 중 오류: "+e.message)}
  finally{setBusy(false);await load()}
 }
 const agencies=status?.sources||[];
 const sorted=useMemo(()=>records.filter(d=>view==="all"||(view==="verified"&&d.detail_status==="complete")||(view==="partial"&&d.detail_status!=="complete")),[records,view]);
 const completed=agencies.filter(x=>x.last_result==="success").length,errors=agencies.filter(x=>x.last_result==="failed"||x.last_result==="partial").length;
 return <main className="adminShell dfAdminUnified">
  <DFAdminHeader title="신규자료 업데이트" kicker="LIVE OFFICIAL COLLECTION · NO LOGIN"/>
  <section className="adminPanel">
   <div className="adminSectionTitle"><div><small>LIVE OPERATION</small><h2>전국 공식자료 실제 업데이트</h2></div><a className="adminSecondary" href="/focus/policy">공개화면 보기 ↗</a></div>
   <p className="adminDataNote">로그인 없이 등록된 공식기관 자료를 직접 조회하고 DB에 업데이트합니다. 서버에서 공식 URL만 수집하고, 원문 검증에 실패한 자료는 자동 비공개됩니다.</p>
   <div className="adminStats">
    <div><b>{status?.total??"—"}</b><span>DB 저장 자료</span></div>
    <div><b>{status?.ready??"—"}</b><span>핵심 내용 확보</span></div>
    <div><b>{status?.pending??"—"}</b><span>원문 검증 대기</span></div>
    <div><b>{completed}</b><span>최근 정상 기관</span></div>
    <div><b>{errors}</b><span>오류 기관</span></div>
   </div>
   <div className="dfReviewActions">
    <button className="adminPrimary" disabled={busy} onClick={()=>run(true)}>{busy?"실제 수집 실행 중…":"전국 29개 기관 지금 업데이트"}</button>
    <button className="adminSecondary" disabled={busy} onClick={()=>run(false)}>미점검 3개 기관 우선 수집</button>
    <button className="adminSecondary" disabled={busy} onClick={load}>DB 현황 새로고침</button>
   </div>
   {!!progress&&<p className="adminDataNote" role="status">{progress}</p>}
   {!!message&&<p className="adminDataNote" role="status">{message}</p>}
   <p className="adminDataNote">대상 기관별 실제 결과를 아래에서 확인할 수 있습니다. 같은 묶음의 과도한 반복 실행을 막기 위해 15분 간격 제한이 적용됩니다.</p>
   {results.length>0&&<div className="dfSourceStatus">{results.map(r=><div key={r.batch}><b>기관 묶음 {r.batch+1} · {r.busy?"재수집 대기":r.error?"요청 실패":"실제 처리"}</b><span>{r.error||r.message||("신규 "+(r.created||0)+"건 · 검증 후 공개 "+(r.published||0)+"건 · 오류 "+(r.failed||0)+"건")}</span>{r.sources?.map(s=><p key={s.source}>{s.source} · 발견 {s.found}건 · 신규 {s.created}건 · 공개 {s.published}건{s.error?" · "+s.error:""}</p>)}</div>)}</div>}
  </section>
  <section className="adminPanel"><div className="adminSectionTitle"><div><small>ACTUAL SOURCE HEALTH</small><h2>29개 공식기관 수집 현황</h2></div><span>{agencies.length}곳</span></div>
   <div className="dfSourceStatus">{agencies.map(s=><div key={s.name}><b>{s.name}</b><span>{s.region_code||"전국"} · 최종 점검 {time(s.last_attempt_at)} · {s.last_result==="success"?"정상":s.last_result==="failed"?"오류":s.last_result==="partial"?"부분 성공":"미실행"} · 발견 {s.last_found||0}건 · 신규 {s.last_created||0}건{s.last_error?" · 원인: "+s.last_error:""}</span></div>)}</div>
  </section>
  <section className="adminPanel"><div className="adminSectionTitle"><div><small>REAL PUBLISHED DOCUMENTS</small><h2>실제 공개자료</h2></div><span>{sorted.length}건</span></div>
   <div className="statTabs">{[["all","전체"],["verified","원문 확보"],["partial","핵심 요약"]].map(([k,v])=><button key={k} className={view===k?"on":""} onClick={()=>setView(k)}>{v}</button>)}</div>
   {loading&&<p className="adminDataNote">실제 데이터를 조회하고 있습니다.</p>}
   <div className="dfSourceList">{sorted.map(x=><article key={x.id}><div><small>{x.source_name||"공식기관"} · {x.detail_status==="complete"?"본문 확보":"핵심 요약"}</small><b>{x.title}</b><span>{date(x.published_at)}</span><p>{(x.key_content||"").slice(0,320)||"본문 확인 필요"}</p></div><div className="dfReviewActions"><a className="adminPrimary" href={"/focus/policy?id="+x.id}>개발포커스 내용 보기 ↗</a>{x.source_url&&<a className="adminSecondary" href={x.source_url} target="_blank" rel="noreferrer">공식기관 원문 ↗</a>}</div></article>)}{!loading&&!sorted.length&&<div className="adminEmpty">현재 공개 자료가 없습니다.</div>}</div>
  </section>
  <section className="adminPanel"><div className="adminSectionTitle"><div><small>SECURITY</small><h2>관리자 수정 권한</h2></div></div><p className="adminDataNote">공식자료 수집 및 원문 검증은 로그인 없이 실제 실행됩니다. 임의 문서 등록·관리자 승인·삭제·내용 조작은 공개하지 않았습니다. 자동 검증을 통과한 공식 문서만 공개합니다.</p><a className="adminSecondary" href="/focus-admin/login">관리자 수정 기능 로그인 ↗</a></section>
  <DFAdminBottomNav active="system"/>
 </main>;
}
