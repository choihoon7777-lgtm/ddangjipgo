"use client";
import{useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../../components/df-shell";
const format=x=>{if(!x)return"발표일 미확인";const d=new Date(x);return Number.isFinite(d.getTime())?d.toLocaleDateString("ko-KR"):"발표일 미확인"};
const labels={"parcel-mention":"필지번호 언급","address-mention":"동·지번 언급","district-mention":"행정동 언급"};
export default function RadarReview(){
 const[address,setAddress]=useState(""),[pnu,setPnu]=useState(""),[busy,setBusy]=useState(false),[result,setResult]=useState(null),[error,setError]=useState("");
 async function inspect(e){
  e.preventDefault();setBusy(true);setResult(null);setError("");
  try{
   const session=await dfSupabase.auth.getSession();const token=session.data.session?.access_token;
   if(!token)throw Error("관리자 로그인이 필요합니다.");
   const params=new URLSearchParams({address:address.trim()});
   if(pnu.trim())params.set("pnu",pnu.trim());
   const r=await fetch("/api/focus-radar-evidence?"+params,{headers:{Authorization:"Bearer "+token},cache:"no-store"});
   const data=await r.json();
   if(!r.ok)throw Error(data.error==="ADMIN_LOGIN_REQUIRED"?"관리자 권한을 확인할 수 없습니다.":data.error||"공식자료 조회에 실패했습니다.");
   setResult(data);
  }catch(err){setError(err.message||"자료 조회 오류");}finally{setBusy(false)}
 }
 return <main className="adminShell dfAdminUnified">
  <DFAdminHeader back="/focus-admin"/>
  <section className="dfAdminHero dfAdminHeroCompact"><small>DEVELOPMENT RADAR · OFFICIAL EVIDENCE</small><h1>관심부지 개발레이더</h1><p>공식 문서에 특정 위치가 언급됐는지 검토하고, 고시 원문으로 이동합니다. 추정이나 AI 분석을 법적 변경으로 확정하지 않습니다.</p></section>
  <section className="adminPanel"><div className="adminSectionTitle"><div><small>READ ONLY · ADMIN REVIEW</small><h2>공식자료 위치 연관 후보 검색</h2></div></div>
   <form onSubmit={inspect} style={{display:"grid",gap:12}}>
    <label>관심부지 주소<input className="adminInput" required minLength={5} maxLength={180} value={address} onChange={e=>setAddress(e.target.value)} placeholder="예: 대전광역시 유성구 원촌동 112-4"/></label>
    <label>공식 필지번호 PNU (선택)<input className="adminInput" inputMode="numeric" pattern="[0-9]{19}" value={pnu} onChange={e=>setPnu(e.target.value.replace(/[^0-9]/g,"").slice(0,19))} placeholder="19자리 필지번호"/></label>
    <button type="submit" className="adminPrimary" disabled={busy||address.trim().length<5}>{busy?"검증된 원문 검색 중…":"공식 원문에서 위치 근거 찾기"}</button>
   </form>
   <p className="adminDataNote">인증된 관리자 전용이며 공식 검증문서를 읽기만 합니다. 이 화면에서는 DB 등록·기사발행·자동 알림 발송이 실행되지 않습니다.</p>
  </section>
  {error&&<section className="adminPanel"><div className="dfLandWarn">{error}</div><a href="/focus-admin/login">운영자 로그인 →</a></section>}
  {result&&<section className="adminPanel"><div className="adminSectionTitle"><div><small>OFFICIAL DOCUMENT EVIDENCE</small><h2>연관성 검토 결과</h2></div><span>후보 {result.stats?.candidateCount||0}건</span></div>
   <div className="adminStats"><div><b>{result.stats?.verifiedDocumentsScanned||0}</b><span>검색한 검증문서</span></div><div><b>{result.stats?.exactParcelMentions||0}</b><span>필지번호 언급</span></div><div><b>{result.stats?.exactAddressMentions||0}</b><span>동·지번 언급</span></div></div>
   <p className="adminDataNote">문서 버전 검토: {result.versionInfo?.status==="available"?"비교이력 "+result.versionInfo.withMultipleVersions+"건 · 해시변경 "+result.versionInfo.withChangedVersions+"건":"버전 없음 또는 접근 확인 필요"}. 문서 해시 변화는 법적 고시 변경 확정이 아닙니다.</p>
   {result.candidates?.length?<div className="adminMenu">{result.candidates.map(doc=><article key={doc.documentId} style={{padding:"14px 0",borderBottom:"1px solid var(--line,#ddd)"}}>
    <div><small>{labels[doc.evidenceLevel]||"검토 필요"} · {format(doc.publishedAt)}{doc.noticeNumber?" · "+doc.noticeNumber:""}</small><h3 style={{fontSize:16,margin:"6px 0"}}>{doc.title}</h3><p>{doc.reason}</p><small>거리·구역 포함·사업 영향: 미확정</small></div>
    <a href={doc.sourceUrl} target="_blank" rel="noopener noreferrer">공식 원문 확인 ↗</a>
   </article>)}</div>:<div className="focusEmpty"><b>현재 검증문서에서 해당 위치 언급을 찾지 못했습니다.</b><span>개발계획이 없다는 의미가 아닙니다. 새로운 공식 문서가 추가되면 다시 확인해야 합니다.</span></div>}
  </section>}
  <DFAdminBottomNav active="home"/>
 </main>;
}
