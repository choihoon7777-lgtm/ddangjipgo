"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../../components/df-shell";
const initial={title:"",body:"",notice_type:"general",placement:"home",region_code:"",starts_at:"",ends_at:"",is_pinned:false,status:"draft"};
export default function Notices(){
 const[items,setItems]=useState([]),[form,setForm]=useState(initial),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 async function load(){const{data,error}=await dfSupabase.from("df_notices").select("*").order("created_at",{ascending:false});if(error)setMsg(error.message);else setItems(data||[])}
 useEffect(()=>{load()},[]);
 async function create(){
  setBusy(true);setMsg("");
  try{
   const{data:{user}}=await dfSupabase.auth.getUser();
   const start=form.starts_at?new Date(form.starts_at).toISOString():new Date().toISOString();
   const end=form.ends_at?new Date(form.ends_at).toISOString():null;
   const status=form.status==="published"&&new Date(start)>new Date()?"scheduled":form.status;
   const{error}=await dfSupabase.from("df_notices").insert({title:form.title.trim(),body:form.body.trim(),notice_type:form.notice_type,placement:form.placement,region_code:form.region_code.trim()||null,starts_at:start,ends_at:end,is_pinned:form.is_pinned,status,created_by:user?.id||null,updated_at:new Date().toISOString()});
   if(error)throw error;setForm(initial);setShow(false);await load();setMsg("공지를 저장했습니다.");
  }catch(e){setMsg(e.message||"공지 저장 실패")}finally{setBusy(false)}
 }
 async function changeStatus(id,status){setBusy(true);const patch={status,updated_at:new Date().toISOString()};if(status==="published")patch.starts_at=new Date().toISOString();if(status==="ended")patch.ends_at=new Date().toISOString();const{error}=await dfSupabase.from("df_notices").update(patch).eq("id",id);if(error)setMsg(error.message);await load();setBusy(false)}
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="공지 관리" kicker="NOTICE"/>
 <section className="adminPanel"><div className="adminSectionTitle"><div><small>PUBLIC NOTICE</small><h2>공지</h2></div><button className="miniBtn" onClick={()=>setShow(!show)}>+ 새 공지</button></div>
 {show&&<div className="dfAdminFormBox">
   <label>제목<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label>
   <label>내용<textarea value={form.body} onChange={e=>setForm({...form,body:e.target.value})}/></label>
   <div className="dfAiClassify"><label>유형<select value={form.notice_type} onChange={e=>setForm({...form,notice_type:e.target.value})}><option value="general">일반</option><option value="urgent">긴급</option><option value="maintenance">점검</option><option value="event">이벤트</option></select></label><label>노출 위치<select value={form.placement} onChange={e=>setForm({...form,placement:e.target.value})}><option value="home">홈</option><option value="article">기사</option><option value="land">땅짚고</option><option value="all">전체</option></select></label></div>
   <label>지역 <span className="muted">선택</span><input value={form.region_code} onChange={e=>setForm({...form,region_code:e.target.value})} placeholder="예: 대전 / 비워두면 전국"/></label>
   <div className="dfAiClassify"><label>시작일시<input type="datetime-local" value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})}/></label><label>종료일시<input type="datetime-local" value={form.ends_at} onChange={e=>setForm({...form,ends_at:e.target.value})}/></label></div>
   <label className="dfInlineCheck"><input type="checkbox" checked={form.is_pinned} onChange={e=>setForm({...form,is_pinned:e.target.checked})}/> 상단 고정</label>
   <div className="dfReviewActions"><button className="adminSecondary" disabled={busy} onClick={()=>setForm({...form,status:"draft"})}>초안</button><button className="adminPrimary" disabled={busy||!form.title.trim()||!form.body.trim()} onClick={()=>{setForm(x=>({...x,status:"published"}));setTimeout(create,0)}}>저장·게시</button></div>
 </div>}
 {msg&&<p className="adminDataNote">{msg}</p>}
 {!items.length?<div className="adminEmpty"><b>등록된 공지 없음</b><span>새 공지를 만들면 홈·기사·땅짚고에 실제로 노출할 수 있습니다.</span></div>:<div className="dfAdminList">{items.map(x=><article key={x.id}><div><small>{x.notice_type} · {x.placement}{x.region_code?" · "+x.region_code:" · 전국"}</small><b>{x.title}</b><span>{x.body}</span><em>{x.status} · {new Date(x.starts_at).toLocaleString("ko-KR")}</em></div><div className="dfListActions">{x.status!=="published"&&<button onClick={()=>changeStatus(x.id,"published")}>게시</button>}{x.status!=="ended"&&<button onClick={()=>changeStatus(x.id,"ended")}>종료</button>}<button onClick={()=>changeStatus(x.id,"draft")}>초안</button></div></article>)}</div>}
 </section><DFAdminBottomNav active="home"/></main>
}