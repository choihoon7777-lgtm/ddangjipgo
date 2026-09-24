"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../../components/df-shell";

export default function Claims(){
 const[items,setItems]=useState([]),[notes,setNotes]=useState({}),[filter,setFilter]=useState("open"),[busy,setBusy]=useState(""),[msg,setMsg]=useState("");
 async function load(){
  let q=dfSupabase.from("df_claims").select("id,article_id,claimant_name,claimant_contact,issue_text,evidence,status,created_at,resolved_at,resolution_note,df_articles(title,status)").order("created_at",{ascending:false});
  if(filter!=="all")q=q.eq("status",filter);
  const{data,error}=await q;if(error)setMsg(error.message);else setItems(data||[]);
 }
 useEffect(()=>{load()},[filter]);
 async function setStatus(x,status){
  setMsg("");
  const resolution=(notes[x.id]??x.resolution_note??"").trim();
  if((status==="resolved"||status==="rejected")&&!resolution){setMsg("처리완료 또는 반려 전 처리 메모를 입력하세요.");return}
  setBusy(x.id);
  const{data:{user}}=await dfSupabase.auth.getUser();
  const patch={status,updated_at:new Date().toISOString()};
  if(status==="resolved"||status==="rejected"){patch.resolved_at=new Date().toISOString();patch.resolved_by=user?.id||null;patch.resolution_note=resolution}
  else{patch.resolved_at=null;patch.resolved_by=null}
  const{error}=await dfSupabase.from("df_claims").update(patch).eq("id",x.id);
  if(error)setMsg(error.message);await load();setBusy("");
 }
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="정정·신고" kicker="CLAIMS & HISTORY"/>
 <section className="adminPanel"><div className="adminSectionTitle"><div><small>TRUST DESK</small><h2>정정 요청</h2></div><span>{items.length}건</span></div>
 <div className="statTabs">{["open","reviewing","resolved","rejected","all"].map(x=><button key={x} className={filter===x?"on":""} onClick={()=>setFilter(x)}>{x==="open"?"접수":x==="reviewing"?"검토중":x==="resolved"?"처리완료":x==="rejected"?"반려":"전체"}</button>)}</div>
 {msg&&<div className="editorGate"><span>{msg}</span></div>}
 {!items.length?<div className="adminEmpty"><b>해당 상태의 정정 요청이 없습니다.</b><span>독자 정정 요청이 접수되면 기사·근거·처리이력을 이곳에서 관리합니다.</span></div>:items.map(x=><article className="dfClaimCard" key={x.id}>
   <div className="dfClaimHead"><div><small>{new Date(x.created_at).toLocaleString("ko-KR")} · {x.status}</small><b>{x.df_articles?.title||"기사 연결 없음"}</b></div>{x.article_id&&<a href={"/focus/article?id="+x.article_id} target="_blank" rel="noreferrer">기사보기 ↗</a>}</div>
   <p>{x.issue_text}</p>
   {(x.claimant_name||x.claimant_contact)&&<span className="adminDataNote">요청자 {x.claimant_name||"미기재"} · {x.claimant_contact||"연락처 미기재"}</span>}
   {Array.isArray(x.evidence)&&x.evidence.length>0&&<details><summary>근거자료</summary><pre className="dfAiOutput compact">{JSON.stringify(x.evidence,null,2)}</pre></details>}
   <label>처리 메모<textarea value={notes[x.id]??x.resolution_note??""} onChange={e=>setNotes({...notes,[x.id]:e.target.value})} placeholder="검토 결과 또는 정정 근거를 기록하세요."/></label>
   <div className="dfReviewActions">
    <button className="adminSecondary" disabled={!!busy} onClick={()=>setStatus(x,"reviewing")}>검토중</button>
    <button className="adminPrimary" disabled={!!busy} onClick={()=>setStatus(x,"resolved")}>처리완료</button>
    <button className="adminSecondary" disabled={!!busy} onClick={()=>setStatus(x,"rejected")}>반려</button>
   </div>
 </article>)}
 </section><DFAdminBottomNav active="home"/></main>
}