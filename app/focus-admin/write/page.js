"use client";
import{useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../../components/df-shell";
const regions=["전국","서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
export default function Write(){
 const[t,setT]=useState(""),[body,setBody]=useState(""),[category,setCategory]=useState("개발사업"),[region,setRegion]=useState("전국"),[sourceTitle,setSourceTitle]=useState(""),[sourceUrl,setSourceUrl]=useState(""),[sourceText,setSourceText]=useState(""),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 async function submit(){
  setBusy(true);setMsg("");
  try{
   const{data:cmp,error:cmpErr}=await dfSupabase.rpc("df_source_compare",{p_source_url:sourceUrl.trim()||null,p_source_text:sourceText.trim()||""});if(cmpErr)throw cmpErr;const sourceStatus=cmp?.[0]?.status||"new";
   const{data:sourceSeen,error:seenErr}=await dfSupabase.rpc("df_article_source_seen",{p_source_url:sourceUrl.trim()||null,p_source_text:sourceText.trim()||""});if(seenErr)throw seenErr;
   const{data,error}=await dfSupabase.rpc("df_create_article_candidate",{
    p_title:t.trim(),
    p_body:body.trim(),
    p_category:category,
    p_region_code:region==="전국"?null:region,
    p_risk_level:"yellow",
    p_confidence:0,
    p_source_title:sourceTitle.trim()||"공식자료",
    p_source_url:sourceUrl.trim()||null,
    p_source_text:sourceText.trim()||null,
    p_source_verified:false,
    p_fact_check_passed:false,
    p_numeric_check_passed:false,
    p_date_check_passed:false,
    p_source_check_passed:false,
    p_duplicate_check_passed:!sourceSeen,
    p_legal_check_status:"manual_required",
    p_ai_fact:"",
    p_ai_verification:"",
    p_ai_models:{source_status:sourceStatus}
   });
   if(error)throw error;
   setMsg(sourceSeen?"같은 공식자료를 사용한 기사 후보가 이미 있어 중복 확인 상태로 저장했습니다.":"검증 대기열에 저장했습니다. 공식 출처를 확인한 뒤에만 발행할 수 있습니다.");
   setT("");setBody("");setSourceTitle("");setSourceUrl("");setSourceText("");
  }catch(e){setMsg(e.message||"저장에 실패했습니다.")}finally{setBusy(false)}
 }
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="기사 작성" kicker="EDITOR"/>
 <section className="adminPanel formPanel">
  <div className="dfAiClassify"><label>카테고리<select value={category} onChange={e=>setCategory(e.target.value)}><option>개발사업</option><option>정책·고시</option><option>분양</option><option>금융</option><option>건설사 동향</option></select></label><label>지역<select value={region} onChange={e=>setRegion(e.target.value)}>{regions.map(x=><option key={x}>{x}</option>)}</select></label></div>
  <label>제목<input value={t} onChange={e=>setT(e.target.value)} placeholder="검증된 사실을 중심으로 제목 작성"/></label>
  <label>본문<textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="기사 초안"/></label>
  <div className="dfSourceEditor"><b>공식 출처</b><label>자료명<input value={sourceTitle} onChange={e=>setSourceTitle(e.target.value)} placeholder="예: 국토교통부 보도자료"/></label><label>원문 URL<input value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://..."/></label><label>근거 원문<textarea value={sourceText} onChange={e=>setSourceText(e.target.value)} placeholder="기사 작성에 사용한 1차 공식자료 원문 또는 핵심 구간"/></label></div>
  <div className="editorGate"><b>발행 안전장치</b><span>직접 작성 기사는 YELLOW로 저장됩니다. 공식 원문 URL과 근거 원문이 모두 필요하며 사실·숫자·날짜·출처·중복·법적위험을 각각 확인한 뒤에만 발행할 수 있습니다.</span></div>
  <button className="adminPrimary" disabled={busy||!t.trim()||!body.trim()||!sourceText.trim()||!sourceUrl.trim()} onClick={submit}>{busy?"저장 중…":"검증 대기열로 보내기"}</button>{msg&&<p className="adminDataNote">{msg}</p>}
 </section><DFAdminBottomNav active="editor"/></main>
}