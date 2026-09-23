"use client";
import{useParams}from"next/navigation";
import{DFAdminHeader}from"../../../components/df-shell";

const map={
 publish:["기사 검토·발행","FACT · 숫자 · 날짜 · 출처 · 중복 · 법적위험을 확인하고 발행하는 영역"],
 ai:["AI 편집국","공식자료에서 FACT를 추출하고 기사 작성·데스크·검증까지 이어지는 영역"],
 write:["기사 작성","직접 기사 초안과 공식 출처를 입력해 검증 대기열로 보내는 영역"],
 notices:["공지 관리","공지 작성·예약·고정·종료를 관리하는 영역"],
 ads:["광고 관리","광고 신청·소재·기간·결제·게시상태를 관리하는 영역"],
 claims:["정정·신고","정정 요청·기사 버전·처리상태를 관리하는 영역"],
 stats:["운영 통계","조회수·인기기사·지역·땅짚고 전환을 확인하는 영역"],
 system:["시스템 상태","AI·DB·수집기·공공데이터 연결 상태를 확인하는 영역"]
};

export default function DemoSection(){
 const p=useParams();const key=String(p.section||"");const info=map[key]||["미리보기","편집국 기능 화면 미리보기"];
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title={info[0]} kicker="TEMP PREVIEW" back="/focus-admin-demo"/>
 <section className="dfAdminDemoBanner"><b>읽기 전용 임시 화면</b><span>로그인 없이 구조만 확인하는 미리보기입니다. 저장·수정·발행은 동작하지 않습니다.</span></section>
 <section className="adminPanel"><h2>{info[0]}</h2><p>{info[1]}</p><div className="dfDemoSkeleton"><span></span><span></span><span></span><span></span></div><a className="adminSecondary" href="/focus-admin-demo">편집국 운영센터로 돌아가기</a></section>
 </main>
}