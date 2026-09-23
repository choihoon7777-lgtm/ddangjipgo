"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../lib/df-browser";
import{DFSubHeader,DFBottomNav,DFSectionTitle}from"../../components/df-shell";
export default function My(){
 const[isAdmin,setIsAdmin]=useState(false);
 useEffect(()=>{let live=true;(async()=>{const{data:{user}}=await dfSupabase.auth.getUser();if(!user)return;const{data}=await dfSupabase.from("df_admin_roles").select("role,is_active").eq("profile_id",user.id).eq("is_active",true).maybeSingle();if(live&&data?.role==="super_admin")setIsAdmin(true)})();return()=>{live=false}},[]);
 return <main className="focusShell dfHigh"><DFSubHeader title="MY" kicker="PERSONAL"/>
 <section className="dfMyHero"><small>PERSONAL FOCUS</small><h1>내가 보는 개발정보만<br/>한곳에 모읍니다.</h1><p>관심 부동산·지역·기사·알림을 개발포커스와 땅짚고 데이터로 연결합니다.</p></section>
 {isAdmin&&<section className="focusBlock"><DFSectionTitle eyebrow="EDITORIAL" title="편집국"/><a className="dfAdminEntry" href="/focus-admin"><div><small>NEWSROOM OS</small><b>편집국 운영센터</b><span>기사 검토·발행·광고·정정·통계·시스템 상태</span></div><strong>›</strong></a></section>}
 <section className="focusBlock"><DFSectionTitle eyebrow="MY PROPERTY" title="부동산 인텔리전스"/><a className="dfMyCard" href="/search"><div><b>부동산 분석 시작</b><span>주소·지번을 기준으로 토지정보와 주변 개발변화를 확인합니다.</span></div><strong>›</strong></a></section>
 <section className="focusBlock"><DFSectionTitle eyebrow="WATCH" title="관심정보"/><div className="dfMyGrid"><a href="/focus/region"><b>관심지역</b><span>지역별 개발뉴스</span></a><div className="disabled"><b>저장기사 <em>준비 중</em></b><span>회원 계정 연결 후 제공</span></div><div className="disabled"><b>알림 <em>준비 중</em></b><span>관심부동산 등록 후 제공</span></div><div className="disabled"><b>최근 본 기사 <em>준비 중</em></b><span>회원 계정 연결 후 제공</span></div></div></section>
 <section className="focusBlock"><DFSectionTitle eyebrow="TRUST" title="데이터 원칙"/><div className="dfMyTrust"><b>공식자료와 AI 분석을 구분합니다.</b><span>출처·기준일·수정이력을 확인할 수 있는 구조로 운영합니다.</span></div></section>
 <DFBottomNav active="my"/></main>
}