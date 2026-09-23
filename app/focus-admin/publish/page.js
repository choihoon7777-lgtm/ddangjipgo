"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../../components/df-shell";

const checks=[
 ["fact_check_passed","사실"],
 ["numeric_check_passed","숫자"],
 ["date_check_passed","날짜"],
 ["source_check_passed","출처"],
 ["duplicate_check_passed","중복"]
];

export default function Publish(){
 const[items,setItems]=useState([]),[busy,setBusy]=useState(""),[msg,setMsg]=useState("");
 async function load(){
  const{data,error}=await dfSupabase.from("df_editorial_queue").select("id,article_id,fact_check_passed,numeric_check_passed,date_check_passed,source_check_passed,duplicate_check_passed,legal_check_status,queued_at,ai_fact,ai_verification,source_text,df_articles(id,title,category,region_code,status,risk_level,body,created_at)").order("queued_at",{ascending:false});
  if(error){setMsg(error.message);return}setItems(data||[]);
 }
 useEffect(()=>{load()},[]);
 async function setCheck(x,field,value=true){
  setBusy(x.article_id+field);setMsg("");
  const{error}=await dfSupabase.from("df_editorial_queue").update({[field]:value}).eq("article_id",x.article_id);
  if(error)setMsg(error.message);await load();setBusy("");
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
  const{error}=await dfSupabase.from("df_articles").update({status:"held"}).eq("id",x.article_id);
  if(error)setMsg(error.message);await load();setBusy("");
 }
 async function publish(x){
  setBusy(x.article_id+"publish");setMsg("");
  try{
   const{data:{user}}=await dfSupabase.auth.getUser();
   const{error}=await dfSupabase.rpc("df_publish_article",{p_article_id:x.article_id,p_actor:user.id});
   if(error)throw error;await load();
  }catch(e){setMsg(e.message)}finally{setBusy("")}
 }
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="기사 검토·발행" kicker="PUBLISH QUEUE"/>
 <section className="adminPanel"><h2>기사 검증·발행</h2><p>각 항목은 실제 근거를 확인한 뒤 개별 승인합니다. RED는 발행 차단, YELLOW는 추가 확인이 필요합니다.</p>
 <div className="riskLegend"><span>GREEN · 발행검토 가능</span><span>YELLOW · 추가 확인</span><span>RED · 발행 차단</span></div>
 {msg&&<div className="editorGate"><span>{msg}</span></div>}
 {items.length===0?<div className="emptyFocus">현재 실제 기사 후보 0건</div>:items.map(x=>{const a=x.df_articles||{};const all=checks.every(([f])=>x[f]);const passed=all&&x.legal_check_status==="passed"&&a.risk_level==="green";
 return <article className="adminPanel dfReviewCard" key={x.id}>
  <small>{a.category||"미분류"}{a.region_code?" · "+a.region_code:""} · {(a.risk_level||"green").toUpperCase()}</small>
  <h3>{a.title}</h3>
  <p className="adminDataNote">{x.ai_verification||"AI 검증 결과 없음 — 직접 확인이 필요합니다."}</p>
  <div className="dfCheckGrid">{checks.map(([field,label])=><button key={field} className={x[field]?"ok":""} disabled={busy!==""||a.risk_level==="red"} onClick={()=>setCheck(x,field,!x[field])}><b>{x[field]?"✓":"○"}</b><span>{label}</span></button>)}</div>
  <div className="editorGate"><span>법적검토 · {x.legal_check_status}</span></div>
  {(x.source_text||x.ai_fact)&&<details className="dfReviewEvidence"><summary>근거자료 확인</summary>{x.source_text&&<><b>공식자료</b><pre>{x.source_text}</pre></>}{x.ai_fact&&<><b>FACT</b><pre>{x.ai_fact}</pre></>}</details>}
  <div className="dfReviewActions"><a className="adminSecondary" href={"/focus-admin/preview?id="+x.article_id}>미리보기</a>
   {a.risk_level==="yellow"&&<button className="adminSecondary" disabled={!all||busy!==""} onClick={()=>resolveYellow(x)}>YELLOW 검토완료</button>}
   {a.risk_level==="green"&&x.legal_check_status!=="passed"&&<button className="adminSecondary" disabled={!all||busy!==""} onClick={()=>finalGate(x)}>최종 발행검토</button>}
   <button className="adminSecondary" disabled={busy!==""} onClick={()=>hold(x)}>보류</button>
   <button className="adminPrimary" disabled={!passed||busy!==""||a.status==="published"} onClick={()=>publish(x)}>{a.status==="published"?"발행완료":"발행"}</button>
  </div>
 </article>})}
 </section><DFAdminBottomNav active="editor"/></main>
}