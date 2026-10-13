"use client";
import {useEffect,useMemo,useState} from "react";
import {DFAdminHeader,DFAdminBottomNav} from "./df-shell";

const ENDPOINT="https://svafsvyjjufbqvxzoqee.supabase.co/functions/v1/df-public-update";
const time=x=>x?new Date(x).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"}):"미점검";
const date=x=>x?new Date(x).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"}):"공개일 미확인";
export default function GuestUpdates(){
 const [status,setStatus]=useState(null),[records,setRecords]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[progress,setProgress]=useState(""),[results,setResults]=useState([]),[message,setMessage]=useState(""),[view,setView]=useState("all"),[shownCount,setShownCount]=useState(6);
 async function load(){
  setLoading(true);
  try{
   const response=await fetch("/api/focus-public-updates",{method:"GET",cache:"no-store"});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||"공개자료 조회 오류");
   setStatus(data.status&&typeof data.status==="object"?data.status:{sources:[],total:null,ready:null,pending:null});
   setRecords(Array.isArray(data.records)?data.records.filter(x=>x&&typeof x==="object"):[]);
   if(Array.isArray(data.warnings)&&data.warnings.length)setMessage(data.warnings.join(" "));
  }catch(err){
   setStatus(old=>old||{sources:[],total:null,ready:null,pending:null});
   setRecords(old=>Array.isArray(old)?old:[]);
   setMessage("데이터 연결이 일시적으로 지연되고 있습니다. 새로고침으로 다시 시도해 주세요.");
  }finally{setLoading(false)}
 }
 useEffect(()=>{load()},[]);
 async function callBatch(i){
  const response=await fetch("/api/focus-public-updates",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({batch:i}),cache:"no-store"});
  const data=await response.json().catch(()=>({error:"서버 응답 오류"}));
  if(!response.ok&&response.status!==429)throw Error(data.error||"실제 수집 실행 실패");
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
 const agencies=Array.isArray(status?.sources)?status.sources:[];
 const sorted=useMemo(()=>(Array.isArray(records)?records:[]).filter(d=>d&&typeof d==="object"&&(view==="all"||(view==="verified"&&d.detail_status==="complete")||(view==="partial"&&d.detail_status!=="complete"))),[records,view]);
 const shown=sorted.slice(0,shownCount);
 const completed=agencies.filter(x=>x.last_result==="success").length;
 const errors=agencies.filter(x=>x.last_result==="failed"||x.last_result==="partial").length;
 const notRun=agencies.filter(x=>!x.last_attempt_at).length;
 const pendingCount=status?.pending??0;
 return <main className="adminShell dfAdminUnified dfUpdateView">
  <DFAdminHeader title="신규자료 업데이트" kicker="공식자료 실시간 수집"/>
  <section className="adminPanel dfUpdateIntroPanel">
   <div className="dfUpdateHeading"><div><small>OFFICIAL DATA</small><h1>전국 개발정보 업데이트</h1></div><a className="dfUpdateTextLink" href="/focus/policy">공개자료 보기 <span aria-hidden="true">↗</span></a></div>
   <p className="dfUpdateIntro">정부·지자체의 공식 고시·공고를 실제 수집합니다. 확인된 내용만 공개하고, 원문이 부족한 자료는 검증 대기로 보관합니다.</p>
   <div className="dfUpdateStats" aria-label="자료 수집 요약">
    <div><strong>{status?.total??"—"}</strong><span>전체 저장</span></div>
    <div><strong>{status?.ready??"—"}</strong><span>핵심 내용 확보</span></div>
    <div><strong>{pendingCount}</strong><span>원문 확인 대기</span></div>
   </div>
   <button className="dfUpdateMainButton" disabled={busy||loading} onClick={()=>run(true)}>{busy?"공식자료 수집 중…":"전국 29개 기관 신규자료 수집"}<span aria-hidden="true">↗</span></button>
   <div className="dfUpdateToolbar">
    <button disabled={busy||loading} onClick={()=>run(false)}>미점검 3개 기관 수집</button>
    <button disabled={busy} onClick={load}>현황 새로고침 <span aria-hidden="true">↻</span></button>
   </div>
   {progress&&<p className="dfUpdateProgress" role="status">{progress}</p>}
   {message&&<p className="dfUpdateMessage" role="status">{message}</p>}
   {results.length>0&&<details className="dfUpdateDisclosure"><summary>방금 실행한 기관별 결과 확인 ({results.length}개 묶음)</summary><div className="dfUpdateRunList">{results.map(r=><div key={r.batch}><strong>{r.batch+1}번째 기관 묶음</strong><span>{r.error||r.message||"신규 "+(r.created||0)+"건 · 공개 "+(r.published||0)+"건 · 오류 "+(r.failed||0)+"건"}</span>{r.sources?.map(row=><p key={row.source}>{row.source}: 신규 {row.created}건{row.error?" / 오류: "+row.error:""}</p>)}</div>)}</div></details>}
  </section>
  <section className="adminPanel dfUpdateSourcesPanel">
   <div className="dfUpdateSectionHead"><div><small>수집 상태</small><h2>공식기관 현황</h2></div><span className="dfUpdateSectionCount">{agencies.length}개 기관</span></div>
   <div className="dfUpdateHealth">
    <span><i className="dfUpdateDot dfUpdateDotGood"/> 정상 {completed}</span>
    <span><i className="dfUpdateDot dfUpdateDotBad"/> 오류 {errors}</span>
    <span><i className="dfUpdateDot"/> 미점검 {notRun}</span>
   </div>
   <details className="dfUpdateDisclosure dfUpdateSourceDisclosure">
    <summary>기관별 수집 현황과 오류 원인 보기</summary>
    <div className="dfUpdateSourceRows">{agencies.map(src=><div key={String(src.name||"미확인 기관")}><div><strong>{src.name}</strong><span>{src.region_code||"전국"} · {time(src.last_attempt_at)}</span></div><em className={src.last_result==="success"?"good":src.last_result==="failed"||src.last_result==="partial"?"bad":""}>{src.last_result==="success"?"정상":src.last_result==="failed"?"오류":src.last_result==="partial"?"부분 완료":"미점검"}</em>{src.last_error&&<p>원인: {src.last_error}</p>}</div>)}</div>
   </details>
  </section>
  <section className="adminPanel dfUpdateFeedPanel">
   <div className="dfUpdateSectionHead"><div><small>검증된 공개자료</small><h2>최근 개발정보</h2></div><span className="dfUpdateSectionCount">{sorted.length}건</span></div>
   <div className="dfUpdateFilters" aria-label="원문 확보 상태별 필터">
    {[["all","전체"],["verified","원문 확보"],["partial","핵심 요약"]].map(([k,label])=><button key={k} type="button" className={view===k?"active":""} aria-pressed={view===k} onClick={()=>{setView(k);setShownCount(6)}}>{label}</button>)}
   </div>
   {loading&&<p className="dfUpdateLoading">공개자료를 불러오는 중입니다.</p>}
   <div className="dfUpdateCards">{shown.map(item=><article className="dfUpdateDocCard" key={item.id}>
    <div className="dfUpdateDocMeta"><span>{String(item.source_name||"공식기관")}</span><span className="dfUpdateMetaDivider">·</span><span>{date(item.published_at||item.fetched_at)}</span></div>
    <h3>{String(item.title||"제목 확인 중")}</h3>
    {item.key_content&&<p className="dfUpdateExcerpt">{String(item.key_content).replace(/\s+/g," ").trim()}</p>}
    <div className="dfUpdateDocFoot"><span className="dfUpdateDocStatus">{item.detail_status==="complete"?"원문 확보":"핵심 요약"}</span><div className="dfUpdateDocLinks"><a href={"/focus/policy?id="+item.id}>핵심 내용 보기 <span aria-hidden="true">→</span></a>{item.source_url&&<a className="dfUpdateSourceLink" href={item.source_url} target="_blank" rel="noreferrer">공식 출처 ↗</a>}</div></div>
   </article>)}</div>
   {!loading&&!sorted.length&&<p className="dfUpdateLoading">현재 해당 조건의 공개자료가 없습니다.</p>}
   {shown.length<sorted.length&&<button className="dfUpdateMore" onClick={()=>setShownCount(c=>c+6)}>자료 더 보기 <span>{sorted.length-shown.length}건 남음</span><span aria-hidden="true">↓</span></button>}
  </section>
  <p className="dfUpdateSecurityNote">신규자료 실제 수집은 로그인 없이 가능하며, 문서 수정·삭제와 수동 공개승인은 관리자 권한이 필요합니다. <a href="/focus-admin/login">관리자 로그인</a></p>
  <DFAdminBottomNav active="system"/>
 </main>;
}
