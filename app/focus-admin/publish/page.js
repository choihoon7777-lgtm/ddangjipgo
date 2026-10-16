"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav,DFToast,DFConfirmModal}from"../../../components/df-shell";

const articleStatus={draft:"초안",review:"검토중",approved:"승인",published:"발행완료",held:"보류",rejected:"반려",corrected:"정정완료"};
const legalStatus={pending:"검토대기",manual_required:"수동검토",passed:"통과",blocked:"차단"};
const checks=[
 ["fact_check_passed","사실"],
 ["numeric_check_passed","숫자"],
 ["date_check_passed","날짜"],
 ["source_check_passed","출처"],
 ["duplicate_check_passed","중복"]
];

export default function Publish(){
 const[expandedArticle,setExpandedArticle]=useState(""),[showCount,setShowCount]=useState(12),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(""),[items,setItems]=useState([]),[queueFilter,setQueueFilter]=useState("all"),[search,setSearch]=useState(""),[focusId,setFocusId]=useState(""),[publishedArticle,setPublishedArticle]=useState(null),[busy,setBusy]=useState(""),[msg,setMsg]=useState(""),[scheduleTimes,setScheduleTimes]=useState({}),[confirmTask,setConfirmTask]=useState(null);
 async function load(){
  setLoading(true);setLoadError("");
  try{
  const{data,error}=await dfSupabase.from("df_editorial_queue").select("id,article_id,fact_check_passed,numeric_check_passed,date_check_passed,source_check_passed,duplicate_check_passed,legal_check_status,queued_at,ai_fact,ai_verification,source_text,df_articles(id,title,category,region_code,status,risk_level,body,created_at,scheduled_at)").is("reviewed_at",null).order("queued_at",{ascending:false});
  if(error)throw error;setItems(data||[]);
  }catch(e){setLoadError("기사를 불러오지 못했습니다: "+e.message)}finally{setLoading(false)}
 }
 useEffect(()=>{const id=new URLSearchParams(window.location.search).get("article")||"";if(/^[0-9a-f-]{36}$/i.test(id))setFocusId(id);load()},[]);
 async function setCheck(x,field,value=true){
  setBusy(x.article_id+field);setMsg("");
  try{
   if(field==="source_check_passed"&&value){
    const{error:verifyError}=await dfSupabase.rpc("df_verify_article_sources",{p_article_id:x.article_id});
    if(verifyError)throw verifyError;
   }
   const{error}=await dfSupabase.from("df_editorial_queue").update({[field]:value}).eq("article_id",x.article_id);
   if(error)throw error;
  }catch(e){setMsg(field==="source_check_passed"?"공식 출처 확인 실패: "+e.message:e.message)}
  await load();setBusy("");
 }
 async function resolveYellow(x){
  const all=checks.every(([f])=>x[f]);
  if(!all){setMsg("YELLOW 해제 전 사실·숫자·날짜·출처·중복을 모두 확인하세요.");return}
  setBusy(x.article_id+"yellow");setMsg("");
  const{error}=await dfSupabase.from("df_articles").update({risk_level:"green"}).eq("id",x.article_id);
  if(error)setMsg(error.message);else{
   const q=await dfSupabase.from("df_editorial_queue").update({legal_check_status:"pending"}).eq("article_id",x.article_id);
   if(q.error)setMsg(q.error.message);
  }
  await load();setBusy("");
 }
 async function finalGate(x){
  const a=x.df_articles||{};const all=checks.every(([f])=>x[f]);
  if(a.risk_level!=="green"){setMsg("GREEN 기사만 최종 발행검토를 통과할 수 있습니다.");return}
  if(!all){setMsg("미확인 검증 항목이 있습니다.");return}
  setBusy(x.article_id+"gate");setMsg("");
  const{error}=await dfSupabase.from("df_editorial_queue").update({legal_check_status:"passed"}).eq("article_id",x.article_id);
  if(error)setMsg(error.message);await load();setBusy("");
 }
 async function hold(x){
  setBusy(x.article_id+"hold");setMsg("");
  const{data:{user}}=await dfSupabase.auth.getUser();
  const next=x.df_articles?.status==="held"?"review":"held";
  const{error}=await dfSupabase.from("df_articles").update({status:next,scheduled_at:null,scheduled_by:null,updated_at:new Date().toISOString()}).eq("id",x.article_id);
  if(error)setMsg(error.message);else{const{error:logError}=await dfSupabase.from("df_article_actions").insert({article_id:x.article_id,action:next==="held"?"hold":"edit",actor_id:user?.id||null,reason:next==="held"?"편집국 보류":"편집국 보류 해제",metadata:next==="held"?{}:{workflow_action:"resume"}});if(logError)setMsg("상태는 변경됐지만 감사로그 저장에 실패했습니다: "+logError.message)}
  await load();setBusy("");
 }
 async function doSchedule(x,when){
  setBusy(x.article_id+"schedule");setMsg("");
  const{data:{user}}=await dfSupabase.auth.getUser();
  const{error}=await dfSupabase.rpc("df_schedule_article",{p_article_id:x.article_id,p_scheduled_at:when.toISOString(),p_actor:user?.id||null});
  if(error)setMsg(error.message);else setMsg("예약발행을 설정했습니다.");
  await load();setBusy("");
 }
 function schedule(x){
  const value=scheduleTimes[x.article_id];if(!value){setMsg("예약 발행일시를 선택하세요.");return}
  const when=new Date(value);if(Number.isNaN(when.getTime())||when<=new Date()){setMsg("현재 이후의 예약시간을 선택하세요.");return}
  setConfirmTask({title:"예약발행",body:when.toLocaleString("ko-KR")+"에 공개합니다.",label:"예약하기",run:()=>doSchedule(x,when)});
 }
 async function doCancelSchedule(x){
  setBusy(x.article_id+"cancel");setMsg("");
  const{data:{user}}=await dfSupabase.auth.getUser();
  const{error}=await dfSupabase.rpc("df_cancel_scheduled_article",{p_article_id:x.article_id,p_actor:user?.id||null});
  if(error)setMsg(error.message);else setMsg("예약발행을 취소했습니다.");
  await load();setBusy("");
 }
 function cancelSchedule(x){setConfirmTask({title:"예약발행 취소",body:"설정된 예약시간을 삭제하고 검토 상태로 되돌립니다.",label:"예약 취소",danger:true,run:()=>doCancelSchedule(x)})}
 async function requestReviewAndPublish(x){
  if(busy)return;
  setBusy(x.article_id+"reviewRequest");setMsg("");
  try{
   const {data:{user},error:authError}=await dfSupabase.auth.getUser();
   if(authError||!user)throw new Error("실제 발행은 운영자 로그인 후 가능합니다.");
   const {data:q,error:qError}=await dfSupabase.from("df_editorial_queue")
    .select("article_id,fact_check_passed,numeric_check_passed,date_check_passed,source_check_passed,duplicate_check_passed,legal_check_status,df_articles(id,title,status,risk_level)")
    .eq("article_id",x.article_id).is("reviewed_at",null).maybeSingle();
   if(qError)throw qError;
   if(!q)throw new Error("검토 대상 기사가 없거나 이미 처리되었습니다.");
   const a=q.df_articles||{};
   if(["published","corrected"].includes(a.status))throw new Error("이미 공개된 기사입니다.");
   const notReady=checks.filter(([field])=>q[field]!==true).map(([,label])=>label);
   if(a.risk_level!=="green"||q.legal_check_status!=="passed"||notReady.length){
    const reasons=[...(a.risk_level!=="green"?["위험등급 "+(a.risk_level||"미확인")]:[]),
      ...(notReady.length?["미완료 검증: "+notReady.join("·")]:[]),
      ...(q.legal_check_status!=="passed"?["법적 검토 미통과"]:[])];
    setMsg("발행 전 확인이 필요합니다: "+reasons.join(" / "));
    return;
   }
   const {data:published,error:publishError}=await dfSupabase.rpc("df_publish_article",{p_article_id:q.article_id,p_actor:user.id});
   if(publishError)throw publishError;
   if(!published||!["published","corrected"].includes(published.status))throw new Error("발행 응답을 확인하지 못했습니다. 다시 조회하세요.");
   const {data:live,error:verifyError}=await dfSupabase.from("df_articles").select("id,title,status,published_at").eq("id",q.article_id).in("status",["published","corrected"]).maybeSingle();
   if(verifyError||!live){setMsg("발행 요청을 완료했습니다. 기사 공개 여부를 새로고침하여 확인하세요.");return;}
   setPublishedArticle({id:live.id,title:live.title});
   setMsg("발행 완료 · 아래 기사 보기에서 확인하세요.");
  }catch(e){setMsg("발행 보류: "+(e?.message||"알 수 없는 오류"))}
  finally{await load();setBusy("")}
 }

 const checklist=x=>checks.filter(([f])=>x[f]!==true).map(([,label])=>label);
 const scheduled=x=>Boolean(x.df_articles?.scheduled_at);
 const blocked=x=>x.df_articles?.risk_level==="red"||x.legal_check_status==="blocked"||["held","rejected"].includes(x.df_articles?.status);
 const ready=x=>!blocked(x)&&!scheduled(x)&&!["published","corrected"].includes(x.df_articles?.status)&&x.df_articles?.risk_level==="green"&&x.legal_check_status==="passed"&&checklist(x).length===0;
 const legalWait=x=>!blocked(x)&&!ready(x);
 const counts={all:items.length,ready:items.filter(ready).length,legal:items.filter(legalWait).length,blocked:items.filter(blocked).length};
 const visibleItems=items.filter(x=>(!focusId||x.article_id===focusId)&&(queueFilter==="all"||queueFilter==="ready"&&ready(x)||queueFilter==="legal"&&legalWait(x)||queueFilter==="blocked"&&blocked(x))&&(!search.trim()||String(x.df_articles?.title||"").toLocaleLowerCase("ko-KR").includes(search.trim().toLocaleLowerCase("ko-KR")))).sort((a,b)=>{
  const rank=x=>ready(x)?0:blocked(x)?2:1;
  return rank(a)-rank(b)||new Date(b.queued_at||0).getTime()-new Date(a.queued_at||0).getTime();
 });
 const shownItems=visibleItems.slice(0,showCount);
 const toggleArticle=id=>setExpandedArticle(current=>current===id?"":id);
 const changeFilter=next=>{setQueueFilter(next);setShowCount(12);setExpandedArticle("")};

 return <main className="adminShell dfAdminUnified dfPublishMobile dfPublishEfficient"><DFAdminHeader title="기사 발행" kicker="EDITORIAL DESK"/>
  <section className="adminPanel dfPublishWorkspace" aria-label="기사 발행 관리">
   <header className="dfPublishWorkspaceHeader">
    <div><small>DOSIMAEK NEWSROOM</small><h2>기사 발행</h2><p>준비된 기사부터 확인하고 바로 발행하세요.</p></div>
    <div className="dfPublishWorkspaceLinks"><a href="/focus-admin/write">+ 기사 작성</a><button type="button" onClick={load} disabled={loading||busy!==""}>새로고침</button></div>
   </header>
   {publishedArticle&&<div className="dfQuickSaved dfPublishResult" role="status">
    <b>✓ 기사 발행 완료</b><span>{publishedArticle.title}</span>
    <a className="adminPrimary" href={"/focus/article?id="+encodeURIComponent(publishedArticle.id)} target="_blank" rel="noopener noreferrer">발행된 기사 보기 ↗</a>
   </div>}
   {focusId&&<div className="dfQuickFocusInfo"><b>선택한 기사만 표시 중</b><button type="button" onClick={()=>{setFocusId("");window.history.replaceState(null,"","/focus-admin/publish")}}>전체 기사 보기</button></div>}
   <nav className="dfPublishStateTabs" aria-label="기사 검토 상태">
    {[
     ["all","전체",counts.all],
     ["ready","발행 가능",counts.ready],
     ["legal","확인 필요",counts.legal],
     ["blocked","보류·차단",counts.blocked]
    ].map(([k,label,n])=><button key={k} type="button" className={queueFilter===k?"active":""} aria-pressed={queueFilter===k} onClick={()=>changeFilter(k)}><span>{label}</span><strong>{n}</strong></button>)}
   </nav>
   <label className="dfPublishSearch"><span className="dfPublishSrOnly">기사 제목 검색</span><input type="search" value={search} onChange={e=>{setSearch(e.target.value);setShowCount(12)}} placeholder="기사 제목 검색" aria-label="기사 제목 검색"/></label>
   {msg&&<p className="editorGate dfPublishStatusMessage" role="status">{msg}</p>}
   {loadError?<div role="alert" className="emptyFocus">{loadError}<button type="button" className="adminSecondary" onClick={load}>다시 불러오기</button></div>
   :loading?<p role="status" className="dfPublishLoading">기사 목록을 불러오는 중…</p>
   :visibleItems.length===0?<div className="emptyFocus">{items.length===0?"현재 검토 대기 기사가 없습니다.":"해당 조건의 기사가 없습니다."}</div>
   :<div className="dfPublishCardList">
   {shownItems.map(x=>{const a=x.df_articles||{};const passed=ready(x);const stop=blocked(x);const open=expandedArticle===x.article_id;const missing=checklist(x);
    const stateLabel=passed?"발행 가능":stop?"보류·차단":scheduled(x)?"예약됨":"확인 필요";
    return <article className="dfPublishArticleCard" key={x.id}>
     <div className="dfPublishArticleHeading">
      <small className="dfPublishArticleMeta">{a.category||"미분류"}{a.region_code?" · "+a.region_code:""} · {articleStatus[a.status]||a.status||"검토중"}</small>
      <b className={"dfPublishState "+(passed?"ready":stop?"blocked":"pending")}>{stateLabel}</b>
     </div>
     <h3 className="dfPublishArticleTitle">{a.title||"제목 없는 기사"}</h3>
     <p className="dfPublishReadiness">
      {passed?"사실·수치·출처 및 법적 검토 완료":
       stop?"보류 또는 검토 차단 상태입니다. 사유를 확인하세요.":
       scheduled(x)?"예약 발행이 설정되어 있습니다.":
       missing.length?"미확인: "+missing.join(" · "):
       a.risk_level==="yellow"?"위험등급 검토가 필요합니다.":"최종 검토가 필요합니다."}
     </p>
     <div className="dfPublishMainActions">
      {passed?
       <button type="button" className="adminPrimary" disabled={busy!==""} onClick={()=>requestReviewAndPublish(x)}>{busy===x.article_id+"reviewRequest"?"발행 중…":"즉시 발행"}</button>:
       <button type="button" className="adminSecondary dfPublishReviewButton" aria-expanded={open} aria-controls={"df-audit-"+x.id} onClick={()=>toggleArticle(x.article_id)}>{open?"검토 닫기":stop?"사유 확인":scheduled(x)?"예약 확인":"검토하기"}</button>}
      <a className="adminSecondary dfPublishPreviewLink" href={"/focus-admin/preview?id="+x.article_id}>미리보기</a>
      {passed&&<button type="button" className="dfPublishMoreButton" aria-expanded={open} aria-controls={"df-audit-"+x.id} onClick={()=>toggleArticle(x.article_id)}>{open?"닫기":"예약·상세"} <span aria-hidden="true">{open?"⌃":"⌄"}</span></button>}
     </div>
     {open&&<section className="dfPublishAudit" id={"df-audit-"+x.id} aria-label="기사 검토 상세">
      <div className="dfPublishAuditHead"><b>검증 항목</b><span>{checks.length-missing.length}/{checks.length} 확인</span></div>
      <p className="adminDataNote">{x.ai_verification||"AI 검증 결과 없음 — 직접 확인이 필요합니다."}</p>
      <div className="dfCheckGrid">{checks.map(([field,label])=><button type="button" key={field} className={x[field]?"ok":""} disabled={busy!==""||a.risk_level==="red"} onClick={()=>setCheck(x,field,!x[field])}><b>{x[field]?"✓":"○"}</b><span>{label}</span></button>)}</div>
      <div className="editorGate"><span>법적검토 · {legalStatus[x.legal_check_status]||x.legal_check_status||"미확인"}</span></div>
      {(x.source_text||x.ai_fact)&&<details className="dfReviewEvidence dfPublishSource"><summary>근거자료 확인</summary>{x.source_text&&<><b>공식자료</b><pre>{x.source_text}</pre></>}{x.ai_fact&&<><b>FACT</b><pre>{x.ai_fact}</pre></>}</details>}
      <div className="dfReviewActions dfPublishAuditActions">
       {a.risk_level==="yellow"&&<button type="button" className="adminSecondary" disabled={missing.length!==0||busy!==""} onClick={()=>resolveYellow(x)}>위험등급 검토완료</button>}
       {a.risk_level==="green"&&x.legal_check_status!=="passed"&&<button type="button" className="adminSecondary" disabled={missing.length!==0||busy!==""} onClick={()=>finalGate(x)}>최종 발행검토</button>}
       {passed&&<div className="dfScheduleBox"><input aria-label="예약 발행 시각" type="datetime-local" value={scheduleTimes[x.article_id]||""} onChange={e=>setScheduleTimes({...scheduleTimes,[x.article_id]:e.target.value})}/><button type="button" className="adminSecondary" disabled={busy!==""} onClick={()=>schedule(x)}>예약발행</button></div>}
       {a.scheduled_at&&<><p className="dfScheduleState">예약 · {new Date(a.scheduled_at).toLocaleString("ko-KR")}</p><button type="button" className="adminSecondary" disabled={busy!==""} onClick={()=>cancelSchedule(x)}>예약취소</button></>}
       <button type="button" className="adminSecondary" disabled={busy!==""||["published","corrected"].includes(a.status)} onClick={()=>hold(x)}>{a.status==="held"?"보류 해제":"보류"}</button>
      </div>
     </section>}
    </article>
   })}
   {shownItems.length<visibleItems.length&&<button type="button" className="dfPublishShowMore" onClick={()=>setShowCount(n=>n+12)}>기사 더 보기 ({visibleItems.length-shownItems.length}건 남음)</button>}
   </div>}
  </section>
  <DFToast message={msg} onClose={()=>setMsg("")}/>
  <DFConfirmModal open={!!confirmTask} title={confirmTask?.title} body={confirmTask?.body} confirmLabel={confirmTask?.label} danger={confirmTask?.danger} onCancel={()=>setConfirmTask(null)} onConfirm={()=>{const task=confirmTask;setConfirmTask(null);task?.run?.()}}/>
  <DFAdminBottomNav active="editor"/>
 </main>;
}
