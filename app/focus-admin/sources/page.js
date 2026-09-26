"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav,DFToast}from"../../../components/df-shell";

const statusLabel={pending:"검토대기",verified:"확인완료",rejected:"제외"};
export default function Sources(){
 const[items,setItems]=useState([]),[sources,setSources]=useState([]),[filter,setFilter]=useState("all"),[sourceUrl,setSourceUrl]=useState(""),[busy,setBusy]=useState(false),[importing,setImporting]=useState(false),[msg,setMsg]=useState("");

 async function load(){
  let q=dfSupabase.from("df_source_documents").select("id,title,source_url,published_at,fetched_at,verification_status,content_text,df_sources(name,trust_grade)").order("published_at",{ascending:false,nullsFirst:false}).order("fetched_at",{ascending:false}).limit(100);
  if(filter!=="all")q=q.eq("verification_status",filter);
  const[d,s]=await Promise.all([q,dfSupabase.from("df_sources").select("id,name,base_url,trust_grade,collector_enabled,last_collected_at").eq("is_active",true).order("name")]);
  if(d.error||s.error)setMsg(d.error?.message||s.error?.message);else{setItems(d.data||[]);setSources(s.data||[])}
 }
 useEffect(()=>{load()},[filter]);

 async function token(){
  const{data:{session}}=await dfSupabase.auth.getSession();
  if(!session?.access_token)throw new Error("편집국 로그인이 필요합니다.");
  return session.access_token;
 }

 async function collect(){
  setBusy(true);setMsg("");
  try{
   const access=await token();
   const r=await fetch("/api/focus-collector",{method:"POST",headers:{Authorization:"Bearer "+access}});
   const p=await r.json();if(!r.ok)throw new Error(p.error||"수집 실패");
   setMsg("RSS 수집 완료 · 신규 "+p.created+"건 · 변경 "+p.changed+"건 · 기존 "+p.unchanged+"건"+(p.failed?" · 실패 "+p.failed+"개":""));
   await load();
  }catch(e){setMsg(e.message)}finally{setBusy(false)}
 }

 async function importUrl(){
  setImporting(true);setMsg("");
  try{
   const access=await token();
   const x=await fetch("/api/focus-source",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+access},body:JSON.stringify({url:sourceUrl.trim()})});
   const p=await x.json();if(!x.ok)throw new Error(p.error||"공식자료 불러오기 실패");
   const{data:cmp,error:cmpErr}=await dfSupabase.rpc("df_source_compare",{p_source_url:p.url,p_source_text:p.text});if(cmpErr)throw cmpErr;
   const status=cmp?.[0]?.status||"new";
   if(status==="duplicate"){setMsg("이미 동일한 공식자료가 수집되어 있습니다.");return}
   let sourceId=null;
   try{const host=new URL(p.url).hostname.replace(/^www\./,"");const matched=sources.find(s=>{try{return new URL(s.base_url).hostname.replace(/^www\./,"")===host}catch{return false}});sourceId=matched?.id||null}catch{}
   const{data,error}=await dfSupabase.from("df_source_documents").insert({
    source_id:sourceId,title:p.title||"공식자료",source_url:p.url,published_at:null,content_text:p.text,
    content_hash:cmp?.[0]?.current_hash||null,raw_payload:{collector:"manual_url",compare_status:status,content_type:p.contentType||null,previous_document_id:cmp?.[0]?.previous_document_id||null},verification_status:"pending"
   }).select().single();
   if(error)throw error;
   setSourceUrl("");setMsg(status==="changed"?"같은 공식 URL의 변경자료로 저장했습니다. 검토 후 AI 기사화할 수 있습니다.":"공식 URL 원문을 저장했습니다. 검토 후 AI 기사화할 수 있습니다.");await load();
  }catch(e){setMsg(e.message||"공식 URL 수집 실패")}finally{setImporting(false)}
 }

 async function verify(id,status){setBusy(true);const{error}=await dfSupabase.from("df_source_documents").update({verification_status:status}).eq("id",id);if(error)setMsg(error.message);await load();setBusy(false)}

 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="공식자료 수집" kicker="SOURCE DESK"/>
 <section className="adminPanel"><div className="adminSectionTitle"><div><small>OFFICIAL SOURCES</small><h2>수집 실행</h2></div><button className="miniBtn" disabled={busy} onClick={collect}>{busy?"수집 중…":"RSS 지금 수집"}</button></div>
 <p className="adminDataNote">RSS가 없는 자료는 아래 공식 URL 직접 수집을 사용합니다. 정부·공공기관 도메인만 서버에서 허용합니다.</p>
 <div className="dfSourceImport"><label>공식자료 URL<input value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://...go.kr / ...or.kr"/></label><button className="adminPrimary" disabled={importing||!sourceUrl.trim()} onClick={importUrl}>{importing?"원문 확인 중…":"공식 URL 수집"}</button></div>
 <div className="dfSourceStatus">{sources.map(s=><div key={s.id}><b>{s.name}</b><span>{s.collector_enabled?"RSS 연결":"URL 수집"}{s.last_collected_at?" · 최근 "+new Date(s.last_collected_at).toLocaleString("ko-KR"):""}</span></div>)}</div>
 </section>

 <section className="adminPanel"><div className="adminSectionTitle"><div><small>COLLECTED</small><h2>수집 자료</h2></div><span>{items.length}건</span></div>
 <div className="statTabs">{["all","pending","verified","rejected"].map(x=><button key={x} className={filter===x?"on":""} onClick={()=>setFilter(x)}>{x==="all"?"전체":x==="pending"?"검토대기":x==="verified"?"확인완료":"제외"}</button>)}</div>
 {!items.length?<div className="adminEmpty"><b>수집된 공식자료가 없습니다.</b><span>RSS 또는 공식 URL로 첫 자료를 수집하세요.</span></div>:<div className="dfSourceList">{items.map(x=><article key={x.id}><div><small>{x.df_sources?.name||"공식기관"} · {x.df_sources?.trust_grade||"S"} · {statusLabel[x.verification_status]||x.verification_status}</small><b>{x.title}</b><span>{x.published_at?new Date(x.published_at).toLocaleString("ko-KR"):"공개일 미확인"}</span><p>{(x.content_text||"").slice(0,180)}</p></div><div className="dfReviewActions">{x.source_url&&<a className="adminSecondary" href={x.source_url} target="_blank" rel="noreferrer">원문 ↗</a>}<a className="adminPrimary" href={"/focus-admin/ai-test?doc="+x.id}>AI 기사화</a>{x.verification_status!=="verified"&&<button className="adminSecondary" disabled={busy} onClick={()=>verify(x.id,"verified")}>확인</button>}{x.verification_status!=="rejected"&&<button className="adminSecondary" disabled={busy} onClick={()=>verify(x.id,"rejected")}>제외</button>}</div></article>)}</div>}
 </section><DFToast message={msg} onClose={()=>setMsg("")}/><DFAdminBottomNav active="system"/></main>
}