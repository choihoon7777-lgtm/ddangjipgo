"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../../components/df-shell";

export default function Preview(){
 const[a,setA]=useState(null),[body,setBody]=useState(""),[note,setNote]=useState(""),[versions,setVersions]=useState([]),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
 async function loadVersions(id){const{data}=await dfSupabase.from("df_article_versions").select("id,version_no,change_note,created_at").eq("article_id",id).order("version_no",{ascending:false});setVersions(data||[])}
 useEffect(()=>{(async()=>{const{data:{user}}=await dfSupabase.auth.getUser();if(!user){location.href="/focus-admin/login";return}const id=new URLSearchParams(location.search).get("id");if(!id)return;const{data,error}=await dfSupabase.from("df_articles").select("*").eq("id",id).single();if(error){setMsg(error.message);return}setA(data);const b=Array.isArray(data.body)?data.body.map(x=>x.text||"").join("\n\n"):String(data.body||"");setBody(b);await loadVersions(id)})()},[]);
 async function save(){setBusy(true);setMsg("");const{data,error}=await dfSupabase.rpc("df_save_article_revision",{p_article_id:a.id,p_title:a.title,p_body:body,p_change_note:note.trim()||null});if(error)setMsg(error.message);else{setA(data);setMsg("수정사항과 이전 버전을 함께 저장했습니다.");setNote("");await loadVersions(a.id)}setBusy(false)}
 if(!a)return <main className="adminShell"><section className="adminPanel">{msg||"기사 불러오는 중…"}</section></main>;
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="모바일 기사 미리보기" kicker="REVIEW BEFORE PUBLISH" back="/focus-admin/publish"/>
 <section className="adminPanel formPanel"><label>제목<input value={a.title} onChange={e=>setA({...a,title:e.target.value})}/></label><label>기사 본문<textarea style={{minHeight:420}} value={body} onChange={e=>setBody(e.target.value)}/></label><label>수정 사유 <span className="muted">권장</span><input value={note} onChange={e=>setNote(e.target.value)} placeholder="예: 수치 정정, 문장 명확화, 공식자료 추가"/></label><button className="adminPrimary" disabled={busy||!a.title.trim()||!body.trim()} onClick={save}>{busy?"저장 중…":"수정 저장"}</button>{msg&&<p className="adminDataNote">{msg}</p>}</section>
 <article className="articleDetail"><small>{a.category} · {(a.risk_level||"green").toUpperCase()} · {a.status}</small><h1>{a.title}</h1><div style={{whiteSpace:"pre-wrap",lineHeight:1.8}}>{body}</div></article>
 <section className="adminPanel"><div className="adminSectionTitle"><div><small>VERSION HISTORY</small><h2>수정 이력</h2></div><span>{versions.length}개</span></div>{versions.length?<div className="dfVersionList">{versions.map(v=><div key={v.id}><b>v{v.version_no}</b><span>{v.change_note||"수정 사유 미기재"}</span><em>{new Date(v.created_at).toLocaleString("ko-KR")}</em></div>)}</div>:<div className="adminEmpty"><b>아직 수정 이력이 없습니다.</b></div>}</section>
 <DFAdminBottomNav active="editor"/></main>
}