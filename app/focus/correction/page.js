"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFSubHeader,DFBottomNav}from"../../../components/df-shell";

export default function Correction(){
 const[id,setId]=useState(""),[article,setArticle]=useState(null),[checked,setChecked]=useState(false),[name,setName]=useState(""),[contact,setContact]=useState(""),[issue,setIssue]=useState(""),[evidence,setEvidence]=useState(""),[busy,setBusy]=useState(false),[submitted,setSubmitted]=useState(false),[msg,setMsg]=useState("");
 useEffect(()=>{const x=new URLSearchParams(location.search).get("id")||"";setId(x);if(!x){setChecked(true);return}(async()=>{const{data}=await dfSupabase.from("df_articles").select("id,title,category,region_code").eq("id",x).in("status",["published","corrected"]).maybeSingle();setArticle(data||null);setChecked(true)})()},[]);
 async function submit(){
  if(submitted||!article)return;
  setBusy(true);setMsg("");
  try{
   const ev=evidence.trim()?[{type:"url_or_note",value:evidence.trim()}]:[];
   const{error}=await dfSupabase.rpc("df_submit_claim",{p_article_id:id,p_claimant_name:name.trim()||null,p_claimant_contact:contact.trim()||null,p_issue_text:issue.trim(),p_evidence:ev});
   if(error)throw error;
   setSubmitted(true);setMsg("정정 요청을 접수했습니다. 편집국 검토 이력에 남습니다.");
  }catch(e){setMsg("접수에 실패했습니다. 입력 내용을 확인한 뒤 다시 시도해 주세요.")}finally{setBusy(false)}
 }
 return <main className="focusShell dfHigh"><DFSubHeader title="정정 요청" kicker="CORRECTION" back={id?"/focus/article?id="+id:"/focus"} right={null}/>
 <section className="dfCorrectionHero"><small>TRUST & CORRECTION</small><h1>사실 오류나 보완이 필요한 내용을 알려주세요.</h1><p>기사 원문과 공식자료를 다시 대조해 검토합니다. 접수 내용은 공개되지 않습니다.</p></section>
 <section className="adminPanel formPanel">
  {article?<div className="dfCorrectionArticle"><small>{article.category}{article.region_code?" · "+article.region_code:""}</small><b>{article.title}</b></div>:checked&&<div className="editorGate"><span>정정 요청할 공개 기사를 찾을 수 없습니다.</span></div>}
  <label>이름 또는 기관명 <span className="muted">선택</span><input disabled={submitted} value={name} onChange={e=>setName(e.target.value)} placeholder="선택 입력"/></label>
  <label>회신 연락처 <span className="muted">선택</span><input disabled={submitted} value={contact} onChange={e=>setContact(e.target.value)} placeholder="이메일 또는 연락처"/></label>
  <label>정정·보완 요청 내용 <em>*</em><textarea disabled={submitted} value={issue} onChange={e=>setIssue(e.target.value)} placeholder="어떤 문장이나 사실을 확인해야 하는지 구체적으로 적어주세요."/></label>
  <label>근거 링크 또는 설명 <span className="muted">선택</span><textarea disabled={submitted} value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="공식 문서 URL, 근거자료 설명 등"/></label>
  <button className="adminPrimary" disabled={busy||submitted||issue.trim().length<5||!article} onClick={submit}>{busy?"접수 중…":submitted?"접수 완료":"정정 요청 접수"}</button>
  {msg&&<div className="editorGate"><span>{msg}</span>{submitted&&id&&<a href={"/focus/article?id="+id}>기사로 돌아가기 →</a>}</div>}
 </section><DFBottomNav active="news"/></main>
}
