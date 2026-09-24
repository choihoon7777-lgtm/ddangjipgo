"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../components/df-shell";

const groups=[
 {kicker:"EDITORIAL",title:"기사·편집국",items:[
  ["공식자료 수집","정부·공공기관 공식자료를 수집하고 변경자료를 확인합니다.","/focus-admin/sources"],
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
 const[stats,setStats]=useState({queue:null,published:null,claims:null,ads:null,watchlists:null});
 useEffect(()=>{let live=true;(async()=>{const{data:{user}}=await dfSupabase.auth.getUser();if(!user){location.href="/focus-admin/login";return}const [q,p,c,a,w]=await Promise.all([
  dfSupabase.from("df_editorial_queue").select("id",{count:"exact",head:true}).is("reviewed_at",null),
  dfSupabase.from("df_articles").select("id",{count:"exact",head:true}).in("status",["published","corrected"]),
  dfSupabase.from("df_claims").select("id",{count:"exact",head:true}).in("status",["open","reviewing"]),
  dfSupabase.from("df_ad_campaigns").select("id",{count:"exact",head:true}).eq("status","active"),
  dfSupabase.from("df_land_watchlists").select("id",{count:"exact",head:true}).eq("is_active",true)
 ]);if(live)setStats({queue:q.count??null,published:p.count??null,claims:c.count??null,ads:a.count??null,watchlists:w.count??null})})();return()=>{live=false}},[]);
 return <main className="adminShell dfAdminUnified"><DFAdminHeader/>
  <section className="dfAdminHero"><small>DEVELOPMENT FOCUS OPERATIONS</small><h1>기사부터 운영까지<br/>한곳에서 관리합니다.</h1><p>기사·공지·광고·정정·통계·시스템을 하나의 운영센터에서 처리합니다.</p></section>

  <section className="adminToday"><div className="adminSectionTitle"><div><small>TODAY</small><h2>오늘의 운영상황</h2></div><span>실데이터</span></div><div className="adminStats"><div><b>{stats.queue??"—"}</b><span>검토대기</span></div><div><b>{stats.published??"—"}</b><span>발행기사</span></div><div><b>{stats.ads??"—"}</b><span>광고진행</span></div><div><b>{stats.claims??"—"}</b><span>정정요청</span></div></div></section>

  <section className="adminPanel"><div className="adminSectionTitle"><div><small>PRIORITY</small><h2>먼저 처리할 일</h2></div><a href="/focus-admin/publish">대기열 →</a></div><a className="dfAdminPriority" href="/focus-admin/publish"><div><b>기사 검토·발행</b><span>검증 대기 기사를 확인하고 발행 여부를 결정합니다.</span></div><strong>›</strong></a></section>

  <section className="adminPanel"><div className="adminSectionTitle"><div><small>PIPELINE</small><h2>기사 운영 흐름</h2></div><a href="/focus-admin/sources">자료수집 →</a></div><div className="pipeline"><span>수집</span><i>→</i><span>기사작성</span><i>→</i><span>검증</span><i>→</i><span>검토</span><i>→</i><span>발행</span></div><p className="adminDataNote">공식자료를 기반으로 기사 후보를 만들고, 사람의 최종 검토를 통과한 기사만 공개합니다.</p></section>

  <div className="dfAdminGroups">{groups.map(g=><section className="dfAdminGroup" key={g.title}><div className="dfAdminGroupHead"><small>{g.kicker}</small><h2>{g.title}</h2></div><div className="adminMenu">{g.items.map(([a,b,h])=><a href={h} key={a}><div><b>{a}</b><span>{b}</span></div><strong>›</strong></a>)}</div></section>)}</div>

  <section className="dfAdminRoleNote"><b>통합 운영 방식</b><span>현재는 하나의 운영센터에서 전 기능을 사용합니다. 내부 역할 정보는 유지해 두어 향후 직원 계정별 접근범위를 나눌 수 있습니다.</span></section>
  <DFAdminBottomNav active="home"/>
 </main>
}