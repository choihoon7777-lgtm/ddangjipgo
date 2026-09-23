"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../components/df-shell";
const tasks=[["AI 편집국","공식자료로 기사 작성·데스크·검증 전체 과정을 테스트합니다.","/focus-admin/ai-test"],["기사 검토","검증 완료된 기사 후보를 확인하고 발행합니다.","/focus-admin/publish"],["기사 작성","직접 기사 초안을 작성하고 검증 단계로 보냅니다.","/focus-admin/write"],["공지 관리","공지 작성·예약·고정·종료를 관리합니다.","/focus-admin/notices"],["광고 관리","신청·심사·소재·기간·게시 상태를 관리합니다.","/focus-admin/ads"],["정정·신고","정정 요청과 기사 버전 이력을 처리합니다.","/focus-admin/claims"],["운영 통계","트래픽과 땅짚고 전환 데이터를 확인합니다.","/focus-admin/stats"],["시스템 상태","수집기·API·DB·AI 연결 상태를 확인합니다.","/focus-admin/system"]];
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
 <section className="dfAdminHero"><small>NEWSROOM OS</small><h1>오늘 처리할 일을<br/>한 화면에서 끝냅니다.</h1><p>기사 검토·발행·광고·정정·통계·시스템 상태를 개발포커스 안에서 운영합니다.</p></section>
 <section className="adminToday"><div className="adminSectionTitle"><div><small>TODAY</small><h2>오늘의 운영상황</h2></div><span>실데이터</span></div><div className="adminStats"><div><b>{stats.queue??"—"}</b><span>검토대기</span></div><div><b>{stats.published??"—"}</b><span>발행기사</span></div><div><b>{stats.ads??"—"}</b><span>광고진행</span></div><div><b>{stats.claims??"—"}</b><span>정정요청</span></div></div></section>
 <section className="adminPanel"><div className="adminSectionTitle"><div><small>EDITORIAL</small><h2>발행 대기열</h2></div><a href="/focus-admin/publish">전체보기 →</a></div><a className="dfAdminPriority" href="/focus-admin/publish"><div><b>기사 검토로 이동</b><span>FACT · 숫자 · 날짜 · 출처 · 중복 · 법적위험을 확인합니다.</span></div><strong>›</strong></a></section>
 <section className="adminPanel"><div className="adminSectionTitle"><div><small>AUTOMATION</small><h2>자동수집 파이프라인</h2></div><a href="/focus-admin/system">상태보기 →</a></div><div className="pipeline"><span>수집</span><i>→</i><span>중복제거</span><i>→</i><span>변경감지</span><i>→</i><span>기사후보</span><i>→</i><span>검증</span></div><p className="adminDataNote">공식 URL 수동수집은 연결됨 · 자동 순회 수집은 별도 워커 연결 전입니다. 자동발행은 하지 않습니다.</p></section>
 <section className="adminMenu">{tasks.map(([a,b,h])=><a href={h} key={a}><div><b>{a}</b><span>{b}</span></div><strong>›</strong></a>)}</section>
 <DFAdminBottomNav active="home"/></main>
}