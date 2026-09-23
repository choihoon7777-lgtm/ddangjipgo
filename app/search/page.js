"use client";
import{useEffect,useState}from"react";
import{DFSubHeader,DFBottomNav}from"../../components/df-shell";
const ADDRESS_DATA_URL="https://cdn.jsdelivr.net/gh/Guk0/KoreanAddressJson@master/address2.json";
export default function Search(){
 const[data,setData]=useState({}),[status,setStatus]=useState("전국 행정구역 불러오는 중…"),[s1,setS1]=useState(""),[s2,setS2]=useState(""),[s3,setS3]=useState(""),[lot,setLot]=useState("");
 useEffect(()=>{let live=true;fetch(ADDRESS_DATA_URL,{cache:"force-cache"}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(j=>{if(!live)return;setData(j);setStatus("전국 "+Object.keys(j).length+"개 시·도 행정구역 선택 준비 완료")}).catch(()=>setStatus("행정구역 데이터를 불러오지 못했습니다."));return()=>{live=false}},[]);
 const sidos=Object.keys(data).sort((a,b)=>a.localeCompare(b,"ko"));
 const sigungus=Object.keys(data[s1]?.children||{}).sort((a,b)=>a.localeCompare(b,"ko"));
 const dongs=Object.keys(data[s1]?.children?.[s2]?.children||{}).sort((a,b)=>a.localeCompare(b,"ko"));
 const ready=!!(s1&&s2&&s3&&lot.trim()),address=[s1,s2,s3,lot.trim()].filter(Boolean).join(" ");
 function sido(v){setS1(v);setS2("");setS3("")} function sigungu(v){setS2(v);setS3("")}
 async function smart(){if(!address)return;try{await navigator.clipboard.writeText(address)}catch{}window.open("https://www.kgeop.go.kr","_blank","noopener")}
 return <main className="parcelFinder dfLandPage"><DFSubHeader title="땅짚고" kicker="LAND INTELLIGENCE" right={null}/>
  <section className="parcelIntro"><small>LAND INTELLIGENCE</small><h1>내 부동산의 변화를<br/>한곳에서 확인하세요.</h1><p>주소와 지번을 기준으로 토지정보·규제·실거래·주변 개발변화를 연결합니다.</p></section>
  <section className="parcelCard"><h2>1. 토지 선택 & 공식 토지정보</h2><p>주소와 지번을 선택하면 공식 토지정보를 조회합니다.</p><b>사업지 주소 <em>*</em></b>
   <div className="parcelGrid">
    <label>시·도<select value={s1} onChange={e=>sido(e.target.value)}><option value="">시·도 선택</option>{sidos.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>시·군·구<select disabled={!s1||!sigungus.length} value={s2} onChange={e=>sigungu(e.target.value)}><option value="">시·군·구 선택</option>{sigungus.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>읍·면·동<select disabled={!s2||!dongs.length} value={s3} onChange={e=>setS3(e.target.value)}><option value="">읍·면·동 선택</option>{dongs.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>지번<input value={lot} onChange={e=>setLot(e.target.value)} placeholder="예: 112-4 / 산 44"/></label>
   </div>
   <div className={"parcelReady "+(sidos.length?"ok":"")}>{status}</div>
   <div className={ready?"parcelNotice ready":"parcelNotice"}><b>{ready?"📍 "+address:"사업지 주소를 선택하세요."}</b><span>{ready?"선택 주소를 기준으로 지적도·토지정보를 연결합니다.":"시·도 → 시·군·구 → 읍·면·동 → 지번 순으로 등록합니다."}</span></div>
   <div className="parcelInfo"><div><b>📍 선택 주소 기준<br/>지적도 · 토지정보</b></div><button onClick={smart} disabled={!ready}>토지정보 바로보기 ↗<small>K-GeoP 스마트국토정보</small></button></div>
   <a className={ready?"parcelAnalyze":"parcelAnalyze disabled"} href={ready?"/asset/new?address="+encodeURIComponent(address):"#"}>이 땅 분석하기 →</a>
  </section>
  <section className="parcelSteps"><div><b>2. 지적도·필지</b><span>선택한 주소의 필지 경계와 토지정보</span></div><div><b>3. 토지 기본정보</b><span>지목 · 면적 · 공시지가</span></div><div><b>4. 주변 실거래</b><span>최근 거래와 주변 가격 흐름</span></div><div><b>5. 토지·규제 분석</b><span>용도지역 · 건폐율 · 용적률 · 도로</span></div><div><b>6. 무엇을 얼마나 지을 수 있을까?</b></div><div><b>7. AI 활용안 & 가설계</b></div></section>
  <DFBottomNav active="land"/>
 </main>
}