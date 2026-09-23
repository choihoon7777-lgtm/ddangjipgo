"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../lib/df-browser";
import{DFSubHeader,DFBottomNav,DFSectionTitle}from"../../components/df-shell";
export default function My(){
 const[user,setUser]=useState(null),[isAdmin,setIsAdmin]=useState(false),[counts,setCounts]=useState({properties:0,saved:0,alerts:0,recent:0});
 async function load(){
  const{data:{user:u}}=await dfSupabase.auth.getUser();setUser(u||null);if(!u)return;
  const[role,p,s,a,r]=await Promise.all([
   dfSupabase.from("df_admin_roles").select("role,is_active").eq("profile_id",u.id).eq("is_active",true).maybeSingle(),
   dfSupabase.from("df_land_watchlists").select("id",{count:"exact",head:true}).eq("profile_id",u.id).eq("is_active",true),
   dfSupabase.from("df_saved_articles").select("article_id",{count:"exact",head:true}).eq("profile_id",u.id),
   dfSupabase.from("df_land_alerts").select("id",{count:"exact",head:true}).in("status",["pending","sent"]),
   dfSupabase.from("df_recent_articles").select("article_id",{count:"exact",head:true}).eq("profile_id",u.id)
  ]);
  setIsAdmin(role.data?.role==="super_admin");
  setCounts({properties:p.count||0,saved:s.count||0,alerts:a.count||0,recent:r.count||0});
 }
 useEffect(()=>{load()},[]);
 async function logout(){await dfSupabase.auth.signOut();location.replace("/focus")}
 return <main className="focusShell dfHigh"><DFSubHeader title="MY" kicker="PERSONAL"/>
 <section className="dfMyHero"><small>PERSONAL FOCUS</small><h1>내가 보는 개발정보만<br/>한곳에 모읍니다.</h1><p>관심 부동산·지역·기사·알림을 개발포커스와 땅짚고 데이터로 연결합니다.</p></section>
 <section className="focusBlock"><DFSectionTitle eyebrow="ACCOUNT" title={user?"내 계정":"로그인"}/>{user?<div className="dfAccountCard"><div><b>{user.email}</b><span>관심부동산과 기사 기록이 이 계정에 저장됩니다.</span></div><button onClick={logout}>로그아웃</button></div>:<a className="dfAdminEntry" href="/login"><div><small>MY FOCUS</small><b>로그인하고 개인화 기능 사용</b><span>관심부동산 · 알림 · 저장기사 · 최근 본 기사</span></div><strong>›</strong></a>}</section>
 {isAdmin&&<section className="focusBlock"><DFSectionTitle eyebrow="EDITORIAL" title="편집국"/><a className="dfAdminEntry" href="/focus-admin"><div><small>NEWSROOM OS</small><b>편집국 운영센터</b><span>기사 검토·발행·광고·정정·통계·시스템 상태</span></div><strong>›</strong></a></section>}
 <section className="focusBlock"><DFSectionTitle eyebrow="MY PROPERTY" title="부동산 인텔리전스"/><a className="dfMyCard" href="/search"><div><b>부동산 분석 시작</b><span>주소·지번을 기준으로 토지정보와 주변 개발변화를 확인하고 저장합니다.</span></div><strong>›</strong></a></section>
 <section className="focusBlock"><DFSectionTitle eyebrow="WATCH" title="관심정보"/><div className="dfMyGrid">
  <a href={user?"/my/properties":"/login?next=/my/properties"}><b>관심부동산 <em>{counts.properties}</em></b><span>등록한 토지·건물</span></a>
  <a href={user?"/my/saved":"/login?next=/my/saved"}><b>저장기사 <em>{counts.saved}</em></b><span>나중에 다시 볼 기사</span></a>
  <a href={user?"/alerts":"/login?next=/alerts"}><b>알림 <em>{counts.alerts}</em></b><span>관심부동산 변화</span></a>
  <a href={user?"/my/recent":"/login?next=/my/recent"}><b>최근 본 기사 <em>{counts.recent}</em></b><span>최근 열람 기록</span></a>
 </div></section>
 <section className="focusBlock"><DFSectionTitle eyebrow="REGION" title="지역 FOCUS"/><a className="dfMyCard" href="/focus/region"><div><b>관심지역 둘러보기</b><span>전국 17개 시·도 개발뉴스를 지역 기준으로 확인합니다.</span></div><strong>›</strong></a></section>
 <section className="focusBlock"><DFSectionTitle eyebrow="TRUST" title="데이터 원칙"/><div className="dfMyTrust"><b>공식자료와 AI 분석을 구분합니다.</b><span>출처·기준일·수정이력을 확인할 수 있는 구조로 운영합니다.</span></div></section>
 <DFBottomNav active="my"/></main>
}