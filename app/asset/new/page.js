"use client";
import{Suspense,useMemo}from"react";
function LandAnalysisInner(){
 const address=useMemo(()=>new URLSearchParams(location.search).get("address")||"",[]);
 return <main className="focusShell dfHigh">
  <header className="dfArticleTop"><a href="/search">←</a><b>땅짚고</b><span>LAND INTELLIGENCE</span></header>
  <section className="dfLandResultHero">
   <small>SELECTED PROPERTY</small>
   <h1>{address||"분석할 부동산을 선택하세요."}</h1>
   <p>선택한 주소를 기준으로 공식 토지정보와 주변 개발변화를 연결합니다.</p>
  </section>
  <section className="dfLandModules">
   <div><b>01 토지 기본정보</b><span>지목 · 면적 · 공시지가</span></div>
   <div><b>02 토지·규제</b><span>용도지역 · 건폐율 · 용적률 · 도로</span></div>
   <div><b>03 주변 실거래</b><span>최근 거래와 주변 가격 흐름</span></div>
   <div><b>04 개발 변화</b><span>개발사업 · 도시계획 · 고시 · 인허가</span></div>
  </section>
  <section className="dfLandResultNotice"><b>잘못된 데모 연결을 제거했습니다.</b><span>이 화면은 선택한 실제 주소를 유지하고, 검증된 공식 데이터가 연결되기 전에는 임의의 수치나 다른 필지 데이터를 표시하지 않습니다.</span></section>
  <a className="dfLandBackAction" href="/search">다른 부동산 선택하기 →</a>
 </main>
}
export default function LandAnalysis(){return <Suspense fallback={<main className="focusShell dfHigh"><div className="dfArticleState">부동산 정보를 준비 중입니다.</div></main>}><LandAnalysisInner/></Suspense>}