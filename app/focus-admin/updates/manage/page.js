"use client";
import {useEffect,useMemo,useState} from "react";
import {dfSupabase} from "../../../../lib/df-browser";
import {DFAdminHeader,DFAdminBottomNav,DFToast} from "../../../../components/df-shell";


const t=x=>x?new Date(x).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"}):"미실행";
const label=x=>({complete:"원문 확인",partial:"요약 확인",queued:"원문 대기",discovered:"발견",failed:"추출 실패",fetching:"추출 중"})[x]||x||"미확인";
export default function PolicyUpdates(){
 const [sources,setSources]=useState([]),[docs,setDocs]=useState([]),[counts,setCounts]=useState({}),[mode,setMode]=useState("all"),[busy,setBusy]=useState(""),[progress,setProgress]=useState(""),[msg,setMsg]=useState(""),[runs,setRuns]=useState([]),[accessMode,setAccessMode]=useState("checking");
 async function refresh(){
  const [s,d,total,ready,pending,failed,changes]=await Promise.all([
   dfSupabase.from("df_sources").select("id,name,region_code,collector_enabled,last_attempt_at,last_collected_at,last_result,last_error,last_found,last_created,last_changed").eq("is_active",true).order("name"),
   dfSupabase.from("df_source_documents").select("id,title,source_url,published_at,fetched_at,detail_status,detail_retry_count,key_extract_status,key_content,raw_payload,verification_status,df_sources(name)").order("fetched_at",{ascending:false}).limit(150),
   dfSupabase.from("df_source_documents").select("id",{count:"exact",head:true}),
   dfSupabase.from("df_source_documents").select("id",{count:"exact",head:true}).eq("key_extract_status","ready"),
   dfSupabase.from("df_source_documents").select("id",{count:"exact",head:true}).in("detail_status",["queued","discovered","partial"]),
   dfSupabase.from("df_source_documents").select("id",{count:"exact",head:true}).eq("detail_status","failed"),
   dfSupabase.from("df_project_updates").select("id",{count:"exact",head:true}).eq("update_type","source_changed")
  ]);
  const error=[s,d,total,ready,pending,failed,changes].find(x=>x.error)?.error;
  if(error){setMsg("데이터 조회 오류: "+error.message);return}
  setSources(s.data||[]);setDocs(d.data||[]);
  setCounts({total:total.count||0,ready:ready.count||0,pending:pending.count||0,failed:failed.count||0,changes:changes.count||0});
 }
 useEffect(()=>{
  let active=true;
  (async()=>{
   const {data:{user}}=await dfSupabase.auth.getUser();
   if(!active)return;
   if(!user){setAccessMode("guest");return}
   const {data:admin}=await dfSupabase.from("df_admin_roles").select("role").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
   if(!active)return;
   if(!admin){setAccessMode("guest");return}
   setAccessMode("admin");await refresh();
  })();
  return()=>{active=false};
 },[]);
 async function access(){
  const {data:{session}}=await dfSupabase.auth.getSession();
  if(!session?.access_token)throw new Error("관리자 로그인 후 이용하세요.");
  return session.access_token;
 }
 async function call(path,token){
  const r=await fetch(path,{method:"POST",cache:"no-store",headers:{Authorization:"Bearer "+token}});
  const body=await r.json().catch(()=>({error:"서버 응답을 읽지 못했습니다."}));
  if(!r.ok)throw new Error(body.error||"수집기 호출 실패");
  return body;
 }
 async function run(kind,all=false){
  setBusy(kind);setProgress("");setMsg("");setRuns([]);
  const reports=[];
  try{
   const token=await access();
   const base=kind==="collector"?"/api/focus-collector":"/api/focus-detail-collector";
   const paths=!all?[base]:kind==="collector"?
     Array.from({length:10},(_,i)=>base+"/"+i):
     Array.from({length:16},(_,i)=>base+"/"+i.toString(16));
   let cursor=0;
   const workers=Array.from({length:all?2:1},async()=>{
    while(cursor<paths.length){
     const current=cursor++;const path=paths[current];
     try{const result=await call(path,token);reports.push({path,...result})}
     catch(e){reports.push({path,error:e.message})}
     setProgress("실행 "+reports.length+"/"+paths.length+" · 실패 "+reports.filter(x=>x.error).length+"건");
    }
   });
   await Promise.all(workers);
   setRuns(reports);
   const created=reports.reduce((n,x)=>n+(x.created||0),0);
   const complete=reports.reduce((n,x)=>n+(x.complete||0),0);
   const errors=reports.filter(x=>x.error).length;
   setMsg("작업 종료 · 신규 "+created+"건 · 상세 확인 "+complete+"건"+(errors?" · 요청 실패 "+errors+"건":""));
  }catch(e){setMsg(e.message)}
  finally{setBusy("");await refresh()}
 }
 async function moderate(d,status){
  setMsg("");setBusy("moderate");
  try{
   if(status==="verified"&&d.key_extract_status!=="ready")throw new Error("원문 또는 검증된 요약이 없어 공개할 수 없습니다.");
   const payload={...(d.raw_payload||{}),public_hidden:status!=="verified",auto_hidden:false};
   const {error}=await dfSupabase.from("df_source_documents").update({verification_status:status,raw_payload:payload}).eq("id",d.id);
   if(error)throw error;
   setMsg(status==="verified"?"검토 승인 및 공개 반영 완료":"자료를 비공개했습니다.");
   await refresh();
  }catch(e){setMsg(e.message)}finally{setBusy("")}
 }
 async function retry(d){
  setMsg("");setBusy("retry");
  const {error}=await dfSupabase.from("df_source_documents").update({detail_status:"queued",detail_retry_count:0,last_detail_attempt_at:null,raw_payload:{...(d.raw_payload||{}),needs_detail_fetch:true}}).eq("id",d.id);
  setMsg(error?error.message:"원문 추출 재시도를 예약했습니다.");
  await refresh();setBusy("");
 }
 const shown=useMemo(()=>docs.filter(d=>{
  const hidden=d.raw_payload?.public_hidden===true||d.raw_payload?.public_hidden==="true";
  if(mode==="hidden")return hidden;
  if(mode==="pending")return d.key_extract_status!=="ready"||["queued","discovered","partial"].includes(d.detail_status);
  if(mode==="failed")return d.detail_status==="failed";
  return true;
 }),[docs,mode]);
 const delayed=sources.filter(s=>!s.last_attempt_at||Date.now()-new Date(s.last_attempt_at).getTime()>36*3600000).length;
 if(accessMode==="guest")return <main className="adminShell dfAdminUnified"><section className="adminPanel"><p>운영자 로그인이 필요합니다.</p><a href="/focus-admin/updates">로그인 없는 자료 수집으로 이동 →</a></section></main>;
 if(accessMode==="checking")return <main className="adminShell dfAdminUnified"><div className="adminPanel"><b>관리자 접근 모드를 확인하는 중입니다.</b></div></main>;
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="신규자료 업데이트" kicker="OFFICIAL COLLECTION CONTROL"/>
 <section className="adminPanel">
  <div className="adminSectionTitle"><div><small>COLLECTION HEALTH</small><h2>전국 공식자료 수집 관제</h2></div><button className="miniBtn" onClick={refresh} disabled={!!busy}>현황 새로고침</button></div>
  <div className="adminStats">
   <div><b>{counts.total??"—"}</b><span>전체 저장</span></div>
   <div><b>{counts.ready??"—"}</b><span>핵심 내용 확보</span></div>
   <div><b>{counts.pending??"—"}</b><span>원문 처리대기</span></div>
   <div><b>{counts.failed??"—"}</b><span>추출 실패</span></div>
   <div><b>{counts.changes??"—"}</b><span>원문 변경 이력</span></div>
  </div>
  <p className="adminDataNote">등록 기관 {sources.length}곳 · 최근 36시간 미점검 {delayed}곳. 성공과 실패를 구분하여 기록합니다.</p>
  <div className="dfReviewActions">
   <button className="adminPrimary" disabled={!!busy} onClick={()=>run("collector",true)}>전국 전체 수집 시작</button>
   <button className="adminSecondary" disabled={!!busy} onClick={()=>run("collector")}>다음 3개 기관 수집</button>
   <button className="adminSecondary" disabled={!!busy} onClick={()=>run("detail",true)}>대기 원문 전체 분산 추출</button>
   <button className="adminSecondary" disabled={!!busy} onClick={()=>run("detail")}>대기 원문 3건 추출</button>
  </div>
  {progress&&<p className="adminDataNote" role="status">{progress}</p>}
  <p className="adminDataNote">자동 실행은 운영 배포와 CRON_SECRET·SUPABASE_SERVICE_ROLE_KEY 설정 이후 활성화됩니다. 신뢰할 수 없는 목록 자료는 검증 전 공개하지 않습니다.</p>
  {!!runs.length&&<details className="dfReviewEvidence"><summary>최근 실행 내역 {runs.length}회 확인</summary>{runs.map((r,i)=><p key={i}><b>{r.path}</b> · {r.error||("신규 "+(r.created||0)+", 추출완료 "+(r.complete||0)+", 실패 "+(r.failed||0))}{(r.detail||[]).filter(x=>x.error).map(x=><span key={x.source||x.id}> · {x.source||x.id}: {x.error}</span>)}</p>)}</details>}
 </section>
 <section className="adminPanel"><div className="adminSectionTitle"><div><small>SOURCE HEALTH</small><h2>기관별 수집 이력</h2></div></div>
  <div className="dfSourceStatus">{sources.map(s=><div key={s.id}><b>{s.name}</b><span>{s.region_code||"전국"} · {s.collector_enabled?"활성":"중지"} · 최종 점검 {t(s.last_attempt_at)} · {s.last_result==="success"?"수집 성공":s.last_result==="failed"?"수집 실패":"미점검"} · 발견 {s.last_found||0}건 · 신규 {s.last_created||0}건{s.last_error?" · 오류: "+s.last_error:""}</span></div>)}</div>
 </section>
 <section className="adminPanel">
  <div className="adminSectionTitle"><div><small>REVIEW QUEUE</small><h2>자료 검증·공개 관리</h2></div><span>최근 {shown.length}건</span></div>
  <div className="statTabs">{[["all","전체"],["pending","원문 대기"],["failed","추출 실패"],["hidden","비공개"]].map(([key,name])=><button key={key} className={mode===key?"on":""} onClick={()=>setMode(key)}>{name}</button>)}</div>
  <div className="dfSourceList">{shown.map(d=>{
   const hidden=d.raw_payload?.public_hidden===true||d.raw_payload?.public_hidden==="true";
   return <article key={d.id}><div><small>{d.df_sources?.name||"공식기관"} · {label(d.detail_status)} · {d.key_extract_status==="ready"?"핵심 정리 완료":"본문 확인 필요"} · {hidden?"비공개":"공개"} · {d.verification_status}</small><b>{d.title}</b><span>{d.published_at?t(d.published_at):"발표일 미확인"} · 시도 {d.detail_retry_count||0}회</span><p>{(d.key_content||"").slice(0,230)||"확인된 상세 내용이 없습니다."}</p></div>
    <div className="dfReviewActions">
     {d.source_url&&<a className="adminSecondary" href={d.source_url} target="_blank" rel="noreferrer">공식 출처 ↗</a>}
     {d.detail_status!=="complete"&&<button className="adminSecondary" disabled={!!busy} onClick={()=>retry(d)}>원문 재시도</button>}
     {hidden&&<button className="adminPrimary" disabled={!!busy||d.key_extract_status!=="ready"} onClick={()=>moderate(d,"verified")}>검토 승인·공개</button>}
     {!hidden&&<button className="adminSecondary" disabled={!!busy} onClick={()=>moderate(d,"rejected")}>비공개</button>}
    </div>
   </article>;
  })}{!shown.length&&<div className="adminEmpty">표시할 자료가 없습니다.</div>}</div>
 </section>
 <DFToast message={msg} onClose={()=>setMsg("")}/><DFAdminBottomNav active="system"/></main>;
}
