"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../../components/df-shell";
export default function Sources(){
 const[items,setItems]=useState([]),[filter,setFilter]=useState("all"),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 async function load(){let q=dfSupabase.from("df_source_documents").select("id,title,source_url,published_at,fetched_at,verification_status,content_text,df_sources(name,trust_grade)").order("published_at",{ascending:false,nullsFirst:false}).order("fetched_at",{ascending:false}).limit(100);if(filter!=="all")q=q.eq("verification_status",filter);const{data,error}=await q;if(error)setMsg(error.message);else setItems(data||[])}
 useEffect(()=>{load()},[filter]);
 async function collect(){setBusy(true);setMsg("");try{const{data:{session}}=await dfSupabase.auth.getSession();if(!session)throw new Error("편집국 로그인이 필요합니다.");const r=await fetch("/api/focus-collector",{method:"POST",headers:{Authorization:"Bearer "+session.access_token}});const p=await r.json();if(!r.ok)throw new Error(p.error||"수집 실패");setMsg("수집 완료 · 신규 "+p.created+"건 · 변경 "+p.changed+"건 · 기존 "+p.unchanged+"건"+(p.failed?" · 실패 "+p.failed+"개":""));await load()}catch(e){setMsg(e.message)}finally{setBusy(false)}}
 async function verify(id,status){setBusy(true);const{error}=await dfSupabase.from("df_source_documents").update({verification_status:status}).eq("id",id);if(error)setMsg(error.message);await load();setBusy(false)}
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="공식자료 수집" kicker="SOURCE DESK"/>
 <section className="adminPanel"><div className="adminSectionTitle"><div><small>OFFICIAL FEEDS</small><h2>수집 자료</h2></div><button className="miniBtn" disabled={busy} onClick={collect}>{busy?"수집 중…":"지금 수집"}</button></div>
 <div className="statTabs">{["all","pending","verified","rejected"].map(x=><button key={x} className={filter===x?"on":""} onClick={()=>setFilter(x)}>{x==="all"?"전체":x==="pending"?"검토대기":x==="verified"?"확인완료":"제외"}</button>)}</div>
 {msg&&<div className="editorGate"><span>{msg}</span></div>}
 {!items.length?<div className="adminEmpty"><b>수집된 공식자료가 없습니다.</b><span>‘지금 수집’을 누르면 연결된 정부·공공기관 RSS에서 최신 자료를 가져옵니다.</span></div>:<div className="dfSourceList">{items.map(x=><article key={x.id}><div><small>{x.df_sources?.name||"공식기관"} · {x.df_sources?.trust_grade||"S"} · {x.verification_status}</small><b>{x.title}</b><span>{x.published_at?new Date(x.published_at).toLocaleString("ko-KR"):"공개일 미확인"}</span><p>{(x.content_text||"").slice(0,180)}</p></div><div className="dfReviewActions">{x.source_url&&<a className="adminSecondary" href={x.source_url} target="_blank" rel="noreferrer">원문 ↗</a>}<a className="adminPrimary" href={"/focus-admin/ai-test?doc="+x.id}>AI 기사화</a>{x.verification_status!=="verified"&&<button className="adminSecondary" onClick={()=>verify(x.id,"verified")}>확인</button>}{x.verification_status!=="rejected"&&<button className="adminSecondary" onClick={()=>verify(x.id,"rejected")}>제외</button>}</div></article>)}</div>}
 </section><DFAdminBottomNav active="system"/></main>
}