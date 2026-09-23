"use client";
import{DFAdminHeader}from"../../components/df-shell";

const modules=[
 ["기사 검토·발행","AI 기사 후보와 검증상태를 확인하는 화면","/focus-admin-demo/publish"],
 ["AI 편집국","공식자료 → FACT → 기사 → 검증 흐름 미리보기","/focus-admin-demo/ai"],
 ["기사 작성","직접 기사 초안을 작성하는 화면 미리보기","/focus-admin-demo/write"],
 ["공지 관리","공지 작성·예약·고정 화면 미리보기","/focus-admin-demo/notices"],
 ["광고 관리","광고 신청·소재·기간·상태 화면 미리보기","/focus-admin-demo/ads"],
 ["정정·신고","정정요청과 기사이력 화면 미리보기","/focus-admin-demo/claims"],
 ["운영 통계","조회·인기기사·지역 흐름 화면 미리보기","/focus-admin-demo/stats"],
 ["시스템 상태","AI·DB·수집기 상태 화면 미리보기","/focus-admin-demo/system"]
];

export default function AdminDemo(){
 return <main className="adminShell dfAdminUnified">
  <DFAdminHeader title="편집국 운영센터" kicker="TEMP PREVIEW" back="/focus"/>
  <section className="dfAdminDemoBanner"><b>임시 로그인 없는 미리보기</b><span>화면 구조 확인용입니다. 실제 기사·DB·발행·광고·정정 작업은 실행되지 않습니다.</span></section>
  <section className="dfAdminHero"><small>NEWSROOM OS</small><h1>오늘 처리할 일을<br/>한 화면에서 끝냅니다.</h1><p>기사 검토·발행·광고·정정·통계·시스템 상태를 하나의 편집국 운영센터에서 관리합니다.</p></section>
  <section className="adminToday"><div className="adminSectionTitle"><div><small>TODAY</small><h2>오늘의 운영상황</h2></div><span>PREVIEW</span></div><div className="adminStats"><div><b>—</b><span>검토대기</span></div><div><b>—</b><span>발행기사</span></div><div><b>—</b><span>광고진행</span></div><div><b>—</b><span>정정요청</span></div></div></section>
  <section className="adminMenu">{modules.map(([a,b,h])=><a href={h} key={a}><div><b>{a}</b><span>{b}</span></div><strong>›</strong></a>)}</section>
 </main>
}