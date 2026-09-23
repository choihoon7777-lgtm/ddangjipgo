"use client";
import{useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../../components/df-shell";
const regions=["전국","서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
export default function Write(){
 const[t,setT]=useState(""),[body,setBody]=useState(""),[category,setCategory]=useState("개발사업"),[region,setRegion]=useState("전국"),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 async function submit(){
  setBusy(true);setMsg("");
  try{
   const slug="manual-"+Date.now();
   const{data:a,error:ae}=await dfSupabase.from("df_articles").insert({slug,title:t.trim(),summary_3line:[],body:[{type:"text",text:body.trim()}],category,region_code:region==="전국"?null:region,status:"review",risk_level:"yellow",confidence:0}).select("id").single();
   if(ae)throw ae;
   const{error:qe}=await dfSupabase.from("df_editorial_queue").insert({article_id:a.id,fact_check_passed:false,numeric_check_passed:false,date_check_passed:false,source_check_passed:false,duplicate_check_passed:false,legal_check_status:"manual_required",source_text:"직접 작성 기사 — 공식 출처 확인 필요",ai_models:{}});
   if(qe)throw qe;
   setMsg("검증 대기열에 저장했습니다. 출처·숫자·날짜 검증 전에는 발행할 수 없습니다.");
   setT("");setBody("");
  }catch(e){setMsg(e.message||"저장에 실패했습니다.")}finally{setBusy(false)}
 }
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="기사 작성" kicker="EDITOR"/>
 <section className="adminPanel formPanel"><label>카테고리<select value={category} onChange={e=>setCategory(e.target.value)}><option>개발사업</option><option>정책·고시</option><option>분양</option><option>금융</option><option>건설사 동향</option></select></label><label>지역<select value={region} onChange={e=>setRegion(e.target.value)}>{regions.map(x=><option key={x}>{x}</option>)}</select></label><label>제목<input value={t} onChange={e=>setT(e.target.value)} placeholder="검증된 사실을 중심으로 제목 작성"/></label><label>본문<textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="기사 초안"/></label><div className="editorGate"><b>발행 안전장치</b><span>직접 작성 기사는 YELLOW로 저장됩니다. 출처·사실·숫자·날짜·중복·법적위험 검증 후에만 발행할 수 있습니다.</span></div><button className="adminPrimary" disabled={busy||!t.trim()||!body.trim()} onClick={submit}>{busy?"저장 중…":"검증 대기열로 보내기"}</button>{msg&&<p className="adminDataNote">{msg}</p>}</section><DFAdminBottomNav active="editor"/></main>
}