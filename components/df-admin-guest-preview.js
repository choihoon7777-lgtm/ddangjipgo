"use client";
import{useEffect,useMemo,useState}from"react";
import{dfSupabase}from"../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"./df-shell";

const menu=[
 ["updates","신규자료 업데이트","전국 공식자료 수집·원문 보기"],
 ["media","언론 모니터링","언론 보도 후보·공식 근거 확인"],
 ["sources","공식자료 직접 수집","공식 기관 자료 검토"],
 ["ai-test","AI 기사작성","기사 제작 절차 체험"],
 ["write","직접 기사 작성","원고 입력·미리보기"],
 ["publish","검토·발행","검토 항목·승인 흐름 체험"],
 ["preview","모바일 기사 미리보기","기사 읽기 화면 검수"],
 ["housing","분양·청약","공식 청약 데이터 상태"],
 ["radar","관심부지 개발레이더","공식 문서 위치근거 검색"],
 ["notices","공지 관리","공지 작성 화면 체험"],
 ["claims","정정·신고","정정 요청 처리 흐름 체험"],
 ["ads","광고 관리","광고 접수·검수 화면 체험"],
 ["stats","운영 통계","공개된 기사 현황"],
 ["system","시스템 상태","공개 API 점검"],
 ["blog-import","투자GO 블로그 이식","블로그 이식 후보 검토"]
];
const demoRows={
 "publish":["사실 확인","수치 확인","발표일 확인","공식출처 확인","중복 확인","법적 위험 확인"],
 "sources":["공식 자료 URL 유효성","자료 발표 기관","발표일·첨부 원문","중복 여부"],
 "media":["언론 보도 제목 확인","공식 1차 발표자료 대조","자체 기사 작성","검토 대기열 등록"],
 "claims":["접수 내용 확인","공식 근거 재확인","수정 이력 기록","결과 안내"],
 "ads":["광고 신청","광고 소재 심사","결제 확인","기간 설정","노출 시작"],
 "ai-test":["원천 자료 확인","사실 검토","기사 원고","데스크 검수","발행 승인"]
};
const officialDate=s=>{try{return new Date(s).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"})}catch{return""}};
const safeUrl=u=>{try{const v=new URL(u);return v.protocol==="https:"&&v.hostname.endsWith(".go.kr")?v.href:null}catch{return null}};

export default function DFAdminGuestPreview({path}){
 const slug=path.split("/").filter(Boolean).pop()||"";
 const current=menu.find(x=>x[0]===slug)||["", "운영 메뉴", ""];
 const[official,setOfficial]=useState([]),[articles,setArticles]=useState([]),[health,setHealth]=useState(null);
 const[query,setQuery]=useState(""),[title,setTitle]=useState(""),[body,setBody]=useState(""),[source,setSource]=useState(""),[region,setRegion]=useState("전국"),[checks,setChecks]=useState([]),[notice,setNotice]=useState(""),[showPreview,setShowPreview]=useState(false),[loading,setLoading]=useState(true);
 useEffect(()=>{let alive=true;setLoading(true);(async()=>{
  const needsOfficial=["radar","sources","publish","preview","media"].includes(slug);
  const needsArticle=["publish","preview","stats"].includes(slug);
  const jobs=[];
  if(needsOfficial)jobs.push(dfSupabase.rpc("df_public_development_policy",{p_channel:null,p_topic:null,p_limit:80,p_offset:0}).then(x=>{if(alive)setOfficial(x.data||[])}));
  if(needsArticle)jobs.push(dfSupabase.from("df_articles").select("id,title,category,region_code,published_at,status,subtitle").in("status",["published","corrected"]).order("published_at",{ascending:false}).limit(25).then(x=>{if(alive)setArticles(x.data||[])}));
  if(["system","housing"].includes(slug))jobs.push(fetch(slug==="system"?"/api/health":"/api/focus-housing-health",{cache:"no-store"}).then(r=>r.ok?r.json():null).then(j=>{if(alive)setHealth(j)}).catch(()=>{}));
  await Promise.allSettled(jobs);if(alive)setLoading(false);
 })();return()=>{alive=false}},[slug]);
 const filtered=useMemo(()=>official.filter(d=>(!query||[d.title,d.source_name,d.key_content].join(" ").includes(query))).slice(0,15),[official,query]);
 const filteredArticles=useMemo(()=>articles.filter(a=>!query||a.title.includes(query)).slice(0,12),[articles,query]);
 const confirmDemo=()=>{setNotice("체험 모드에서 화면 흐름만 확인했습니다. 실제 데이터는 변경하지 않았습니다.");setShowPreview(true)};
 const reviewTitle=articles[0]?.title||"개발포커스 검토 시뮬레이션";
 return <main className="adminShell dfAdminUnified dfAdminGuestMode">
  <DFAdminHeader title={current[1]} kicker="ADMIN GUEST PREVIEW" back="/focus-admin"/>
  <section className="adminPanel dfGuestAdminBanner"><small>TEST MODE · NO LOGIN</small><h1>{current[1]}</h1><p>{current[2]} · 로그인 없이 모든 화면을 검수할 수 있습니다.</p><div className="dfGuestAdminMessage"><b>비로그인 체험</b><span>공개된 공식자료만 실제로 조회합니다. 비공개 기사 초안·회원정보는 표시하지 않으며, 발행·삭제·수정 버튼은 시뮬레이션입니다.</span></div></section>
  <section className="adminPanel dfGuestAdminNavigator"><div className="adminSectionTitle"><div><small>ALL OPERATIONS</small><h2>운영 메뉴 전체보기</h2></div><span>{menu.length}개</span></div><div className="dfGuestAdminLinkGrid">{menu.map(([id,name])=><a className={id===slug?"on":""} href={"/focus-admin/"+id} key={id}>{name}<span>›</span></a>)}</div></section>

  {(slug==="publish"||slug==="preview")&&<section className="adminPanel">
   <div className="adminSectionTitle"><div><small>PUBLIC ARTICLES</small><h2>공개 기사로 미리보기</h2></div><span>{loading?"조회 중":"공개 "+articles.length+"건"}</span></div>
   <p className="adminDataNote">관리자 검토 대기 기사와 사실 검증 기록은 권한이 필요한 비공개 자료입니다. 여기서는 이미 공개된 기사만 실제 데이터로 표시합니다.</p>
   {articles.length?<div className="dfGuestAdminArticles">{filteredArticles.map(a=><article key={a.id}><span>{a.category||"개발정보"} · {officialDate(a.published_at)}</span><b>{a.title}</b><a href={"/focus/article?id="+a.id}>실제 기사보기 →</a></article>)}</div>:<p className="adminDataNote">공개 기사를 불러오지 못했거나 표시할 기사가 없습니다.</p>}
  </section>}

  {slug==="publish"&&<section className="adminPanel"><div className="adminSectionTitle"><div><small>EDITORIAL REVIEW · DEMO</small><h2>발행 검증 시뮬레이터</h2></div></div><p className="adminDataNote">샘플 검토 카드로 승인 절차를 체험합니다. 실제 대기 기사나 공개 상태는 수정되지 않습니다.</p><h3 className="dfGuestAdminSampleTitle">[체험용] {reviewTitle}</h3><div className="dfGuestAdminChecks">{demoRows.publish.map((label,i)=><label key={label}><input type="checkbox" checked={checks.includes(i)} onChange={e=>setChecks(a=>e.target.checked?[...a,i]:a.filter(v=>v!==i))}/><span>{label}</span></label>)}</div><button className="adminPrimary" disabled={checks.length<6} onClick={confirmDemo}>{checks.length===6?"발행 승인 흐름 시험":"검증 "+checks.length+"/6 — 전부 확인 후 체험"}</button></section>}

  {["sources","radar","media"].includes(slug)&&<section className="adminPanel"><div className="adminSectionTitle"><div><small>OFFICIAL EVIDENCE</small><h2>공개 공식자료 검색</h2></div><span>{loading?"조회 중":official.length+"건 조회"}</span></div>
   {slug==="media"&&<p className="adminDataNote">언론사 비공개 모니터링 후보 DB는 노출하지 않습니다. 공개 공식자료를 대조하는 절차를 검수할 수 있습니다.</p>}
   <label className="dfGuestAdminLabel">지역·사업·기관 검색<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="예: 대전, 정비사업, 도시계획"/></label>
   {filtered.length?<div className="dfGuestAdminArticles">{filtered.map(d=><article key={d.id}><span>{d.source_name||"공식기관"} · {officialDate(d.published_at)}</span><b>{d.title}</b><p>{d.key_content?.slice(0,300)||"검증된 요약을 확인할 수 없습니다."}</p><a href={"/focus/policy?id="+d.id}>개발포커스 본문보기 →</a>{safeUrl(d.source_url)&&<a href={d.source_url} target="_blank" rel="noreferrer noopener">공식 원문 ↗</a>}</article>)}</div>:<p className="adminDataNote">해당 검색어의 공개 공식자료가 없습니다.</p>}
  </section>}

  {["write","ai-test","notices","ads","claims"].includes(slug)&&<section className="adminPanel"><div className="adminSectionTitle"><div><small>WORKFLOW SIMULATOR</small><h2>{current[1]} 입력·검수 체험</h2></div></div>
   <p className="adminDataNote">입력 내용은 서버로 제출하지 않습니다. 저장 버튼으로 미리보기만 확인할 수 있습니다.</p>
   <label className="dfGuestAdminLabel">{slug==="claims"?"정정 요청 제목":slug==="ads"?"광고 캠페인명":slug==="notices"?"공지 제목":slug==="ai-test"?"자료 제목":"기사 제목"}<input value={title} maxLength={200} onChange={e=>setTitle(e.target.value)} placeholder="검수할 제목을 입력하세요"/></label>
   {["write","ai-test"].includes(slug)&&<label className="dfGuestAdminLabel">공식 근거 URL<input value={source} onChange={e=>setSource(e.target.value)} placeholder="https://www...go.kr/"/></label>}
   <label className="dfGuestAdminLabel">{slug==="ads"?"광고 안내문":slug==="notices"?"공지 내용":slug==="claims"?"정정 사유·원문 확인":"본문 또는 원문 자료"}<textarea rows={7} value={body} onChange={e=>setBody(e.target.value)} placeholder="검수할 내용을 직접 입력하세요"/></label>
   {slug==="ads"&&<label className="dfGuestAdminLabel">대상 지역<select value={region} onChange={e=>setRegion(e.target.value)}>{["전국","서울","경기","대전","부산","인천","세종"].map(x=><option key={x}>{x}</option>)}</select></label>}
   <button className="adminPrimary" disabled={!title.trim()||!body.trim()} onClick={confirmDemo}>체험용 미리보기 확인</button>
   {showPreview&&<article className="dfGuestAdminDraftPreview"><small>미리보기 · 서버 미저장 · {region}</small><h2>{title}</h2><p>{body}</p>{source&&<small>입력한 근거: {source}</small>}</article>}
  </section>}

  {["publish","sources","media","claims","ads","ai-test"].includes(slug)&&demoRows[slug]&&slug!=="publish"&&<section className="adminPanel"><div className="adminSectionTitle"><div><small>REVIEW FLOW</small><h2>처리 단계</h2></div></div><div className="dfGuestAdminSteps">{demoRows[slug].map((s,i)=><div key={i}><em>{i+1}</em><span>{s}</span></div>)}</div></section>}

  {slug==="stats"&&<section className="adminPanel"><div className="adminSectionTitle"><div><small>PUBLIC SCOPE</small><h2>공개 기사 현황</h2></div></div><div className="adminStats"><div><b>{articles.length}</b><span>최근 공개 기사 조회</span></div><div><b>—</b><span>비공개 조회수</span></div><div><b>—</b><span>광고 성과</span></div></div><p className="adminDataNote">관리자 전체 통계·회원수·매출정보는 로그인 없는 화면에서 노출되지 않습니다.</p><a className="adminSecondary" href="/focus/live">실제 공개 기사 확인 →</a></section>}

  {["system","housing"].includes(slug)&&<section className="adminPanel"><div className="adminSectionTitle"><div><small>PUBLIC SERVICE STATUS</small><h2>공개 상태 확인</h2></div></div>{loading?<p>상태 조회 중입니다.</p>:<p className="adminDataNote">{health?"공개 점검 API에서 응답을 받았습니다. 개인정보와 내부 연결 정보는 비공개입니다.":"공개 API 응답을 확인하지 못했습니다. 실제 운영 상태를 단정할 수 없습니다."}</p>}<div className="dfGuestAdminSteps"><div><em>1</em><span>공식 자료 수집</span></div><div><em>2</em><span>본문 검증</span></div><div><em>3</em><span>기사 검토</span></div><div><em>4</em><span>관리자 승인</span></div></div><a className="adminSecondary" href="/focus-admin/updates">공개 수집 상태 보기 →</a></section>}

  {notice&&<p className="dfGuestAdminNotice" role="status">{notice}</p>}
  <section className="adminPanel"><p className="adminDataNote">이 페이지는 로그인 없이 제공되는 전 화면 테스트입니다. 실제 DB에 접근하거나 편집·발행·광고 승인하는 기능은 활성 관리자 인증 후 사용할 수 있습니다.</p><a className="adminSecondary" href="/focus-admin/login">운영자 로그인 (선택) →</a></section>
  <DFAdminBottomNav active={["publish","write","preview","ai-test","media","sources"].includes(slug)?"editor":slug==="ads"?"ads":slug==="stats"?"stats":slug==="system"?"system":"home"}/>
 </main>;
}
