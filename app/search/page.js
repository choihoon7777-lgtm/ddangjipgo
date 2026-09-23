"use client";
import{useState}from"react";
export default function Search(){
 const[q,setQ]=useState(""); const[mode,setMode]=useState("address");
 const examples=["대전 유성구 원촌동 112-4","서울 강남구 삼성동 1","세종시 나성동 123","인천 서구 원당동 1000"];
 return <main className="landSearch">
  <div className="landSearchTop"><a href="/focus">← 홈으로</a><a className="mapFind" href="/map">▱ 지도에서 찾기</a></div>
  <section className="landSearchHero"><small>땅짚고</small><h1>주소·지번 검색</h1><p>관심 있는 부동산은 소유 여부와 관계없이 누구나 등록하고 추적할 수 있습니다.</p></section>
  <div className="searchModes"><button className={mode==="address"?"on":""} onClick={()=>setMode("address")}>주소로 검색</button><button className={mode==="parcel"?"on":""} onClick={()=>setMode("parcel")}>지번으로 검색</button></div>
  <div className="landSearchInput"><span>⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder={mode==="address"?"예) 대전 유성구 원촌동 112-4":"예) 원촌동 112-4 / 산 44-2"}/>{q&&<button onClick={()=>setQ("")}>×</button>}</div>
  <div className="searchAssist"><button>⌾ 내 위치로 찾기</button><a href="/map">◎ 지도에서 직접 선택하기</a></div>
  <section className="searchExamples"><h2>예시로 검색해보세요</h2><div>{examples.map(x=><button key={x} onClick={()=>setQ(x)}>{x}</button>)}</div></section>
  <section className="quickSearch"><h2>빠른 검색</h2><div><a href="/my"><b>⌂</b><span>내 부동산</span></a><a href="/my"><b>★</b><span>관심 지역</span></a><a href="/map"><b>▱</b><span>지도에서 찾기</span></a><a href="/alerts"><b>◎</b><span>내 주변 보기</span></a></div></section>
  {q&&<section className="searchResult"><small>검색 준비</small><b>{q}</b><p>선택한 필지를 기준으로 공식 토지정보·실거래·규제·개발사업·고시 변화를 연결합니다.</p></section>}
  <a className="landSearchCta" href={q?"/asset/wonchon-112-4":"#"}>⌕ <b>검색하기</b></a>
  <section className="searchGuide"><b>● 안내사항</b><p>· 도로명주소, 지번주소 모두 검색할 수 있습니다.<br/>· 등록한 부동산은 소유 여부와 관계없이 계속 추적할 수 있습니다.</p></section>
 </main>
}