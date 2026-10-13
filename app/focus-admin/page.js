"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../components/df-shell";

const groups=[
 {kicker:"EDITORIAL",title:"기사·편집국",items:[
  ["신규자료 업데이트","전국 수집·원문 추출·기관별 오류·검토 승인·공개를 관리합니다.","/focus-admin/updates"],
  ["공식자료 직접 수집","공식 URL 등록 및 기사화를 관리합니다.","/focus-admin/sources"],
  ["AI 기사작성","공식자료를 FACT → 기자 → 데스크 → 검증 순서로 기사화합니다.","/focus-admin/ai-test"],
  ["직접 기사 작성","직접 기사 초안을 작성하고 검증 대기열로 보냅니다.","/focus-admin/write"],
  ["검토·발행","사실·숫자·날짜·출처·중복·법적위험을 확인하고 발행합니다.","/focus-admin/publish"]
 ]},
 {kicker:"CONTENT",title:"콘텐츠 운영",items:[
  ["공지 관리","공지 작성·예약·고정·종료를 관리합니다.","/focus-admin/notices"],
  ["정정·신고","독자 정정 요청과 기사 수정 이력을 처리합니다.","/focus-admin/claims"]
 ]},
 {kicker:"BUSINESS",title:"사업 운영",items:[
  ["광고 관리","광고 신청·승인·결제·게시·종료 상태를 관리합니다.","/focus-admin/ads"]
 ]},
 {kicker:"DATA & SYSTEM",title:"데이터·시스템",items:[
  ["운영 통계","기사 조회·광고·정정·운영 데이터를 확인합니다.","/focus-admin/stats"],
  ["시스템 상태","수집기·API·DB·AI 연결 상태를 확인합니다.","/focus-admin/system"]
 ]}
];

export default function Admin(){
 const[stats,setStats]=useState({queue:null,published:null,claims:null,ads:null,watchlists:null}),[guest,setGuest]=useState(null),[publicCount,setPublicCount]=useState(null);
 useEffect(()=>{let live=true;(async()=>{const{data:{user}}=await dfSupabase.auth.getUser();if(!user){if(live)setGuest(true);const r=await dfSupabase.rpc("df_public_development_policy",{p_channel:null,p_topic:null,p_limit:100,p_offset:0});if(live)setPublicCount(r.error?null:(r.data||[]).length);return}
 const role=await dfSupabase.from("df_admin_roles").select("role").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
 if(!role.data){if(live)setGuest(true);return}
 if(live)setGuest(false);
 const [q,p,c,a,w]=await Promise.all([
  dfSupabase.from("df_editorial_queue").select("id",{count:"exact",head:true}).is("reviewed_at",null),
  dfSupabase.from("df_articles").select("id",{count:"exact",head:true}).in("status",["published","corrected"]),
  dfSupabase.from("df_claims").select("id",{count:"exact",head:true}).in("status",["open","reviewing"]),
  dfSupabase.from("df_ad_campaigns").select("id",{count:"exact",head:true}).eq("status","active"),
  dfSupabase.from("df_land_watchlists").select("id",{count:"exact",head:true}).eq("is_active",true)
 ]);if(live)setStats({queue:q.count??null,published:p.count??null,claims:c.count??null,ads:a.count??null,watchlists:w.count??null})})();return()=>{live=false}},[]);
 return <main className="adminShell dfAdminUnified"><DFAdminHeader back="/focus"/>
  <section className="dfAdminHero dfAdminHeroCompact"><small>DEVELOPMENT FOCUS OPERATIONS</small><h1>운영센터</h1><p>{guest?"로그인 없이 실제 공개자료와 관리자 기능을 체험할 수 있습니다. 운영 데이터 변경은 차단됩니다.":"오늘 필요한 업무부터 빠르게 처리합니다."}</p></section>
  {guest&&<section className="adminPanel"><div className="adminSectionTitle"><div><small>GUEST PREVIEW · READ ONLY</small><h2>비로그인 체험 모드</h2></div><a className="adminSecondary" href="/focus-admin/login">운영자 로그인</a></div>
   <p className="adminDataNote">실제 공개자료 {publicCount===null?"조회 중":publicCount+"건"}을 바탕으로 메뉴와 신규자료 검수 과정을 확인할 수 있습니다. 시뮬레이션 결과는 DB에 저장하지 않습니다.</p>
   <div className="dfReviewActions"><a className="adminPrimary" href="/focus-admin/updates">신규자료 업데이트 체험 →</a><a className="adminSecondary" href="/focus/policy">공개 개발정책 보기 ↗</a></div>
  </section>}

  {!guest&&<section className="adminToday"><div className="adminSectionTitle"><div><small>TODAY</small><h2>오늘의 운영상황</h2></div><span>실데이터</span></div><div className="adminStats dfAdminStatLinks"><a href="/focus-admin/publish"><b>{stats.queue??"—"}</b><span>검토대기</span></a><a href="/focus/live"><b>{stats.published??"—"}</b><span>발행기사</span></a><a href="/focus-admin/ads"><b>{stats.ads??"—"}</b><span>광고진행</span></a><a href="/focus-admin/claims"><b>{stats.claims??"—"}</b><span>정정요청</span></a></div></section>}

  <section className="adminPanel"><div className="adminSectionTitle"><div><small>QUICK ACTIONS</small><h2>빠른 실행</h2></div></div><div className="dfAdminQuickGrid">
   <a href="/focus-admin/updates"><b>신규자료 업데이트</b><span>전국 수집 · 원문 검증 · 공개관리</span></a>
   <a href={guest?"/focus-admin/updates":"/focus-admin/ai-test"}><b>AI 기사작성</b><span>{guest?"검수 체험에서 기능 확인":"공식자료 → 기사"}</span></a>
   <a href={guest?"/focus-admin/updates":"/focus-admin/write"}><b>직접 기사 작성</b><span>{guest?"관리자 로그인 후 실제 작성":"초안 작성"}</span></a>
   <a href={guest?"/focus-admin/updates":"/focus-admin/publish"}><b>검토·발행</b><span>{guest?"자료 검수 화면 체험":(stats.queue??"—")+"건 대기"}</span></a>
  </div></section>
  {!guest&&<details className="dfAdminAllMenu"><summary><span><small>ALL OPERATIONS</small><b>전체 운영 메뉴</b></span><strong>펼치기</strong></summary><div className="dfAdminGroups">{groups.map(g=><section className="dfAdminGroup" key={g.title}><div className="dfAdminGroupHead"><small>{g.kicker}</small><h2>{g.title}</h2></div><div className="adminMenu">{g.items.map(([a,b,h])=><a href={h} key={a}><div><b>{a}</b><span>{b}</span></div><strong>›</strong></a>)}</div></section>)}</div></details>}
  <DFAdminBottomNav active="home"/>
 </main>
}