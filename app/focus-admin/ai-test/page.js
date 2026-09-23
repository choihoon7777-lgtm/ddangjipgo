"use client";
import{useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../../components/df-shell";

const SAMPLE=`[공식자료] 국토교통부 보도자료
제목: 청년·고령자·양육가구 등 수요자 맞춤형 특화주택 공모
담당부서: 청년주거정책과
등록일: 2026-09-20 11:00
공식 요지: 9월 21일부터 특화주택 공모를 시작한다. 주거에 돌봄·복지·일자리 서비스를 연계해 수요자 맞춤형 주거지원을 강화한다.
관련 국정과제: 63. 두텁고 촘촘한 주거복지 실현
출처: 국토교통부 공식 보도자료
공식URL: https://www.molit.go.kr/USR/NEWS/m_71/dtl.jsp?id=95092441
주의: 위 내용 외 숫자·유형·일정·평가를 임의로 추가하지 말 것.`;
const regions=["전국","서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];

function sourceMeta(text){
 const title=(text.match(/^제목:\s*(.+)$/m)||[])[1]?.trim()||(text.match(/^\[공식자료\]\s*(.+)$/m)||[])[1]?.trim()||"공식자료";
 const url=(text.match(/공식URL:\s*(https?:\/\/\S+)/i)||[])[1]?.trim()||null;
 return{title,url};
}
function extractSummary(article){
 const lines=article.split("\n").map(x=>x.trim()).filter(Boolean);
 const start=lines.findIndex(x=>x.includes("핵심요약"));
 if(start<0)return[];
 const out=[];
 for(let i=start+1;i<lines.length&&out.length<3;i++){
  if(/^(본문|앞으로 볼 것|공식 출처)/.test(lines[i]))break;
  const clean=lines[i].replace(/^[\-•·*\d.①②③④⑤\s]+/,"").trim();
  if(clean)out.push(clean);
 }
 return out;
}

export default function AITest(){
 const[s,setS]=useState(""),[sourceUrl,setSourceUrl]=useState(""),[r,setR]=useState(null),[loading,setLoading]=useState(false),[importing,setImporting]=useState(false),[saving,setSaving]=useState(false),[saved,setSaved]=useState(""),[category,setCategory]=useState("개발사업"),[region,setRegion]=useState("전국");
 async function authToken(){const{data:{session}}=await dfSupabase.auth.getSession();if(!session?.access_token)throw new Error("편집국 로그인이 필요합니다.");return session.access_token}
 async function importOfficial(){
  setImporting(true);setSaved("");
  try{
   const token=await authToken();
   const x=await fetch("/api/focus-source",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({url:sourceUrl.trim()})});
   const p=await x.json();if(!x.ok)throw new Error(p.error||"공식자료 불러오기 실패");
   setS(`[공식자료] ${p.title}\n제목: ${p.title}\n공식URL: ${p.url}\n\n${p.text}`);
   setSaved("공식 URL에서 원문을 불러왔습니다. 내용 확인 후 AI 기사 생성을 진행하세요.");
  }catch(e){setSaved(e.message)}finally{setImporting(false)}
 }
 async function run(){
  setLoading(true);setR(null);setSaved("");
  try{
   const token=await authToken();
   const x=await fetch("/api/focus-ai",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:JSON.stringify({source:s})});
   const payload=await x.json();if(!x.ok)throw new Error(payload.error||"AI 요청에 실패했습니다.");setR(payload);
  }catch(e){setR({error:e.message})}finally{setLoading(false)}
 }
 async function saveQueue(){
  if(!r?.article)return;setSaving(true);setSaved("");
  try{
   const lines=r.article.split("\n").map(x=>x.trim()).filter(Boolean);
   const title=(lines[0]||"AI 기사 후보").replace(/^제목[:：]?\s*/,"");
   const articleBody=lines.slice(1).join("\n")||r.article;
   const risk=(r.verification||"").trim().toUpperCase().startsWith("RED")?"red":(r.verification||"").trim().toUpperCase().startsWith("YELLOW")?"yellow":"green";
   const meta=sourceMeta(s);
   const{data:cmp,error:cmpErr}=await dfSupabase.rpc("df_source_compare",{p_source_url:meta.url,p_source_text:s});if(cmpErr)throw cmpErr;
   const sourceStatus=cmp?.[0]?.status||"new";
   const duplicatePassed=sourceStatus!=="duplicate";
   const legal=risk==="red"?"blocked":risk==="yellow"?"manual_required":"pending";
   const{data:articleId,error}=await dfSupabase.rpc("df_create_article_candidate",{
    p_title:title,p_body:articleBody,p_category:category,p_region_code:region==="전국"?null:region,p_risk_level:risk,p_confidence:risk==="green"?0.9:0.5,
    p_source_title:meta.title,p_source_url:meta.url,p_source_text:s,p_source_verified:false,
    p_fact_check_passed:risk==="green",p_numeric_check_passed:risk==="green",p_date_check_passed:risk==="green",
    p_source_check_passed:false,p_duplicate_check_passed:duplicatePassed,p_legal_check_status:legal,
    p_ai_fact:r.fact||"",p_ai_verification:r.verification||"",p_ai_models:{...(r.models||{}),transport:r.transport||null,source_status:sourceStatus}
   });
   if(error)throw error;
   const summary=extractSummary(r.article);
   if(summary.length)await dfSupabase.from("df_articles").update({summary_3line:summary}).eq("id",articleId);
   setSaved(sourceStatus==="duplicate"?"같은 원문이 이미 있어 중복 확인 상태로 저장했습니다.":sourceStatus==="changed"?"같은 공식 URL의 변경자료로 감지해 승인대기함에 저장했습니다.":"승인대기함에 저장했습니다. 공식 출처는 사람이 확인해야 발행할 수 있습니다.");
  }catch(e){setSaved(e.message||"저장 실패")}finally{setSaving(false)}
 }
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="AI 편집국" kicker="SOURCE → FACT → DESK → VERIFY"/>
 <section className="adminPanel formPanel">
  <div className="dfAiClassify"><label>카테고리<select value={category} onChange={e=>setCategory(e.target.value)}><option>개발사업</option><option>정책·고시</option><option>분양</option><option>금융</option><option>건설사 동향</option></select></label><label>지역<select value={region} onChange={e=>setRegion(e.target.value)}>{regions.map(x=><option key={x}>{x}</option>)}</select></label></div>
  <div className="dfSourceImport"><label>공식자료 URL<input value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://...go.kr / ...or.kr"/></label><button className="adminSecondary" disabled={importing||!sourceUrl.trim()} onClick={importOfficial}>{importing?"불러오는 중…":"공식URL 가져오기"}</button></div>
  <button className="adminSecondary" onClick={()=>setS(SAMPLE)}>국토부 샘플자료 불러오기</button>
  <label>공식자료 원문<textarea value={s} onChange={e=>setS(e.target.value)} placeholder="정부·지자체·공공기관·공시 등 1차 공식자료 원문을 넣으세요."/></label>
  <button className="adminPrimary" disabled={loading||s.trim().length<80} onClick={run}>{loading?"FACT → 기자 → 데스크 → 검증 진행 중…":"AI 기사 생성"}</button>
  {saved&&!r&&<p className="adminDataNote">{saved}</p>}
 </section>
 {r&&<section className="adminPanel">{r.error?<div className="editorGate"><b>확인 필요</b><span>{r.error}</span></div>:<><h2>최종 기사</h2><pre className="dfAiOutput">{r.article}</pre><button className="adminPrimary" disabled={saving} onClick={saveQueue}>{saving?"저장 중…":"승인대기함에 저장"}</button>{saved&&<p className="adminDataNote">{saved}</p>}<h3>검증 결과</h3><pre className="dfAiOutput compact">{r.verification}</pre><details><summary>FACT 추출 결과</summary><pre className="dfAiOutput compact">{r.fact}</pre></details></>}</section>}
 <DFAdminBottomNav active="editor"/></main>
}