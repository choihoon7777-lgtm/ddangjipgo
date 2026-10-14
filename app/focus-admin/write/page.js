"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav,DFToast}from"../../../components/df-shell";
const regions=["전국","서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
export default function Write(){
 const[t,setT]=useState(""),[body,setBody]=useState(""),[category,setCategory]=useState("개발사업"),[region,setRegion]=useState("전국"),[sourceTitle,setSourceTitle]=useState(""),[sourceUrl,setSourceUrl]=useState(""),[sourceText,setSourceText]=useState(""),[busy,setBusy]=useState(false),[msg,setMsg]=useState(""),[mediaLead,setMediaLead]=useState(null),[savedId,setSavedId]=useState(null);
 useEffect(()=>{let live=true;const id=new URLSearchParams(location.search).get("mediaLead");if(!id||!/^[a-f0-9-]{36}$/i.test(id))return;
  (async()=>{const{data,error}=await dfSupabase.from("df_media_leads").select("publisher,headline,original_url,verified_official_url,review_status").eq("id",id).single();
   if(!live||error||data?.review_status!=="verified"||!data.verified_official_url)return;
   setMediaLead(data);setSourceUrl(data.verified_official_url);setSourceTitle("확인된 1차 공식자료");
  })();return()=>{live=false};},[]);

 async function submit(){
  setBusy(true);setMsg("");setSavedId(null);
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
   setSavedId(typeof data==="string"?data:(data?.id||data?.article_id||null));
   setMsg(sourceSeen?"중복 검토가 필요한 원고로 저장했습니다.":"원고 저장 완료! 아래 버튼을 눌러 이 기사만 검토하고 발행하세요.");
   setT("");setBody("");setSourceTitle("");setSourceUrl("");setSourceText("");
  }catch(e){setMsg(e.message||"저장에 실패했습니다.")}finally{setBusy(false)}
 }
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="기사 작성" kicker="EDITOR"/>
 <section className="adminPanel formPanel"><div className="dfQuickPublishGuide"><b>기사 발행 3단계</b><span>① 기사 작성·저장 → ② 공식자료·내용 검증 → ③ 즉시 발행 후 실제 도시맥에서 확인</span></div>
  {mediaLead&&<section className="dfMediaDraftContext"><b>언론 보도 참고 자료</b><p>{mediaLead.headline}</p><div><a href={mediaLead.original_url} target="_blank" rel="noopener noreferrer">보도 원문 확인 ↗</a><a href={mediaLead.verified_official_url} target="_blank" rel="noopener noreferrer">공식 근거 확인 ↗</a></div><small>언론사 표현을 옮기지 말고 공식자료에 근거해 새로운 제목과 본문을 직접 작성하세요. 출처 본문 입력 후 검증 대기열로 보냅니다.</small></section>}
  <div className="dfAiClassify"><label>카테고리<select value={category} onChange={e=>setCategory(e.target.value)}><option>개발사업</option><option>정책·고시</option><option>분양</option><option>금융</option><option>건설사 동향</option></select></label><label>지역<select value={region} onChange={e=>setRegion(e.target.value)}>{regions.map(x=><option key={x}>{x}</option>)}</select></label></div>
  <label>제목<input value={t} onChange={e=>setT(e.target.value)} placeholder="검증된 사실을 중심으로 제목 작성"/></label>
  <label>본문<textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="기사 초안"/></label>
  <div className="dfSourceEditor"><b>공식 출처</b><label>자료명<input value={sourceTitle} onChange={e=>setSourceTitle(e.target.value)} placeholder="예: 국토교통부 보도자료"/></label><label>원문 URL<input value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} placeholder="https://..."/></label><label>근거 원문<textarea value={sourceText} onChange={e=>setSourceText(e.target.value)} placeholder="기사 작성에 사용한 1차 공식자료 원문 또는 핵심 구간"/></label></div>
  <div className="editorGate"><b>발행 안전장치</b><span>직접 작성 기사는 YELLOW로 저장됩니다. 공식 원문 URL과 근거 원문이 모두 필요하며 사실·숫자·날짜·출처·중복·법적위험을 각각 확인한 뒤에만 발행할 수 있습니다.</span></div>
  <button className="adminPrimary" disabled={busy||!t.trim()||!body.trim()||!sourceText.trim()||!sourceUrl.trim()} onClick={submit}>{busy?"저장 중…":"기사 저장 후 발행 검토 →"}</button>{savedId&&<div className="dfQuickSaved" role="status"><b>✓ 검토할 기사가 저장됐습니다.</b><a className="adminPrimary" href={"/focus-admin/publish?article="+encodeURIComponent(savedId)}>이 기사 검토·발행하기 →</a><small>검증을 통과해야 실제 공개됩니다.</small></div>}{msg&&!savedId&&<a className="dfNextAction" href="/focus-admin/publish">검토·발행으로 이동 →</a>}
 </section><DFToast message={msg} onClose={()=>setMsg("")}/><DFAdminBottomNav active="editor"/></main>
}