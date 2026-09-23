"use client";
import{useState}from"react";
const sido=["서울특별시","부산광역시","대구광역시","인천광역시","광주광역시","대전광역시","울산광역시","세종특별자치시","경기도","강원특별자치도","충청북도","충청남도","전북특별자치도","전라남도","경상북도","경상남도","제주특별자치도"];
const sigungu={대전광역시:["동구","중구","서구","유성구","대덕구"],서울특별시:["강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구","노원구","도봉구","동대문구","동작구","마포구","서대문구","서초구","성동구","성북구","송파구","양천구","영등포구","용산구","은평구","종로구","중구","중랑구"]};
const eupmyeon={유성구:["원촌동","도룡동","전민동","탑립동","관평동","봉명동","궁동","장대동","구암동","노은동"]};
export default function Search(){
 const[s1,setS1]=useState(""),[s2,setS2]=useState(""),[s3,setS3]=useState(""),[lot,setLot]=useState("");
 const ready=s1&&s2&&s3&&lot; const address=[s1,s2,s3,lot].filter(Boolean).join(" ");
 return <main className="parcelFinder">
  <a className="parcelBack" href="/focus">← 개발포커스</a>
  <section className="parcelIntro"><small>땅짚고</small><h1>주소 하나로<br/>그 땅의 모든 것을 알아보세요.</h1><p>토지 기본정보와 실거래, 토지규제, 건축 가능 규모부터 주변 개발변화까지 확인합니다.</p></section>
  <section className="parcelCard"><h2>1. 토지 선택 & 공식 토지정보</h2><p>시·도부터 순서대로 선택해 정확한 필지를 찾습니다.</p><b>사업지 주소 <em>*</em></b>
   <div className="parcelGrid">
    <label>시·도<select value={s1} onChange={e=>{setS1(e.target.value);setS2("");setS3("")}}><option value="">시·도 선택</option>{sido.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>시·군·구<select disabled={!s1} value={s2} onChange={e=>{setS2(e.target.value);setS3("")}}><option value="">시·군·구 선택</option>{(sigungu[s1]||[]).map(x=><option key={x}>{x}</option>)}</select></label>
    <label>읍·면·동<select disabled={!s2} value={s3} onChange={e=>setS3(e.target.value)}><option value="">읍·면·동 선택</option>{(eupmyeon[s2]||[]).map(x=><option key={x}>{x}</option>)}</select></label>
    <label>지번<input value={lot} onChange={e=>setLot(e.target.value)} placeholder="예: 112-4 / 산 44"/></label>
   </div>
   <div className="parcelReady">전국 17개 시·도 행정구역 선택</div>
   <div className={ready?"parcelNotice ready":"parcelNotice"}><b>{ready?"📍 "+address:"사업지 주소를 선택하세요."}</b><span>{ready?"선택 주소를 기준으로 지적도·토지정보를 연결합니다.":"시·도 → 시·군·구 → 읍·면·동 → 지번 순으로 선택합니다."}</span></div>
   <div className="parcelInfo"><div><b>📍 선택 주소 기준<br/>지적도 · 토지정보</b></div><a href="https://smart.kgeop.go.kr/" target="_blank" rel="noreferrer">토지정보 바로보기 ↗<small>K-GeoP 스마트국토정보</small></a></div>
   <a className={ready?"parcelAnalyze":"parcelAnalyze disabled"} href={ready?"/asset/wonchon-112-4":"#"}>이 땅 분석하기 →</a>
  </section>
  <section className="parcelSteps"><div><b>2. 지적도·필지</b><span>선택한 주소의 필지 경계와 토지정보</span></div><div><b>3. 토지 기본정보</b><span>지목 · 면적 · 공시지가</span></div><div><b>4. 주변 실거래</b><span>최근 거래와 주변 가격 흐름</span></div><div><b>5. 토지·규제 분석</b><span>용도지역 · 건폐율 · 용적률 · 도로</span></div><div><b>6. 무엇을 얼마나 지을 수 있을까?</b></div><div><b>7. AI 활용안 & 가설계</b></div></section>
 </main>
}