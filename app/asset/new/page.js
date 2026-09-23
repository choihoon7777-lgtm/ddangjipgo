"use client";
import{useEffect,useState}from"react";
import{DFSubHeader,DFBottomNav}from"../../../components/df-shell";
function LandAnalysis(){
 const[address,setAddress]=useState("");
 useEffect(()=>{setAddress(new URLSearchParams(window.location.search).get("address")||"")},[]);
 return <main className="focusShell dfHigh"><DFSubHeader title="땅짚고" kicker="LAND INTELLIGENCE" back="/search" right={null}/>
  <section className="dfLandResultHero"><small>SELECTED PROPERTY</small><h1>{address||"분석할 부동산을 선택하세요."}</h1><p>선택한 주소를 기준으로 공식 토지정보와 주변 개발변화를 연결합니다.</p></section>
  <section className="dfLandModules"><div><b>01 토지 기본정보</b><span>지목 · 면적 · 공시지가</span></div><div><b>02 토지·규제</b><span>용도지역 · 건폐율 · 용적률 · 도로</span></div><div><b>03 주변 실거래</b><span>최근 거래와 주변 가격 흐름</span></div><div><b>04 개발 변화</b><span>개발사업 · 도시계획 · 고시 · 인허가</span></div></section>
  <section className="dfLandResultNotice"><b>검증된 데이터만 표시합니다.</b><span>선택한 실제 주소를 유지하고, 공식 데이터가 연결되기 전에는 임의의 수치나 다른 필지 데이터를 표시하지 않습니다.</span></section>
  <a className="dfLandBackAction" href="/search">다른 부동산 선택하기 →</a><DFBottomNav active="land"/>
 </main>
}
export default LandAnalysis;