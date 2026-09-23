"use client";
import{DFSubHeader,DFBottomNav,DFSectionTitle}from"../../components/df-shell";
export default function My(){return <main className="focusShell dfHigh"><DFSubHeader title="MY" kicker="PERSONAL"/>
<section className="dfMyHero"><small>PERSONAL FOCUS</small><h1>내가 보는 개발정보만<br/>한곳에 모읍니다.</h1><p>관심 부동산·지역·기사·알림을 개발포커스와 땅짚고 데이터로 연결합니다.</p></section>
<section className="focusBlock"><DFSectionTitle eyebrow="MY PROPERTY" title="내 부동산"/><a className="dfMyCard" href="/search"><div><b>등록한 토지·건물</b><span>개발사업·고시·실거래 변화를 추적합니다.</span></div><strong>›</strong></a></section>
<section className="focusBlock"><DFSectionTitle eyebrow="WATCH" title="관심정보"/><div className="dfMyGrid"><a href="/focus/region"><b>관심지역</b><span>지역별 개발뉴스</span></a><a href="/focus/live"><b>저장기사</b><span>다시 볼 기사</span></a><a href="/alerts"><b>알림</b><span>변경·호재 알림</span></a><a href="/focus/live"><b>최근 본 기사</b><span>읽던 기사 이어보기</span></a></div></section>
<section className="focusBlock"><DFSectionTitle eyebrow="TRUST" title="데이터 원칙"/><div className="dfMyTrust"><b>공식자료와 AI 분석을 구분합니다.</b><span>출처·기준일·수정이력을 확인할 수 있는 구조로 운영합니다.</span></div></section>
<DFBottomNav active="my"/></main>}