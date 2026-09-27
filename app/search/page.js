"use client";
import{useEffect,useState}from"react";
import{DFSubHeader,DFBottomNav,DFLiveNotice,DFLiveAd}from"../../components/df-shell";
const ADDRESS_DATA_URL="https://cdn.jsdelivr.net/gh/Guk0/KoreanAddressJson@master/address2.json";
export default function Search(){
 const[data,setData]=useState({}),[status,setStatus]=useState("전국 행정구역 불러오는 중…"),[s1,setS1]=useState(""),[s2,setS2]=useState(""),[s3,setS3]=useState(""),[lot,setLot]=useState(""),[manual,setManual]=useState("");
 useEffect(()=>{let live=true;fetch(ADDRESS_DATA_URL,{cache:"force-cache"}).then(r=>{if(!r.ok)throw Error(r.status);return r.json()}).then(j=>{if(!live)return;setData(j);setStatus("전국 "+Object.keys(j).length+"개 시·도 행정구역 선택 준비 완료")}).catch(()=>setStatus("행정구역 데이터를 불러오지 못했습니다."));return()=>{live=false}},[]);
 const sidos=Object.keys(data).sort((a,b)=>a.localeCompare(b,"ko"));
 const sigungus=Object.keys(data[s1]?.children||{}).sort((a,b)=>a.localeCompare(b,"ko"));
 const dongs=Object.keys(data[s1]?.children?.[s2]?.children||{}).sort((a,b)=>a.localeCompare(b,"ko"));
 const structured=[s1,s2,s3,lot.trim()].filter(Boolean).join(" ");
 const address=manual.trim()||structured;
 const ready=manual.trim().length>=5||!!(s1&&s2&&s3&&lot.trim());
 function sido(v){setS1(v);setS2("");setS3("")} function sigungu(v){setS2(v);setS3("")}
 async function smart(){if(!address)return;try{await navigator.clipboard.writeText(address)}catch{}window.open("https://www.kgeop.go.kr","_blank","noopener")}
 return <main className="parcelFinder dfLandPage"><DFSubHeader title="땅짚고" kicker="LAND INTELLIGENCE" right={null}/><DFLiveNotice placement="land"/>
  <section className="parcelIntro"><small>LAND INTELLIGENCE</small><h1>주소 하나로<br/>이 땅의 핵심을 확인하세요.</h1><p>공식 토지정보부터 실거래·규제·건축규모까지 한 번에 분석합니다.</p><div className="parcelTrust"><span>공식자료 기반</span><span>실거래 연동</span><span>규제 자동점검</span></div></section>
  <section className="parcelCard"><h2>1. 토지 선택 & 공식 토지정보</h2><p>주소와 지번을 선택하면 공식 토지정보를 조회합니다.</p><b>사업지 주소 <em>*</em></b>
   <div className="parcelGrid">
    <label>시·도<select value={s1} onChange={e=>sido(e.target.value)}><option value="">시·도 선택</option>{sidos.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>시·군·구<select disabled={!s1||!sigungus.length} value={s2} onChange={e=>sigungu(e.target.value)}><option value="">시·군·구 선택</option>{sigungus.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>읍·면·동<select disabled={!s2||!dongs.length} value={s3} onChange={e=>setS3(e.target.value)}><option value="">읍·면·동 선택</option>{dongs.map(x=><option key={x}>{x}</option>)}</select></label>
    <label>지번<input value={lot} onChange={e=>setLot(e.target.value)} placeholder="예: 112-4 / 산 44"/></label>
   </div>
   <div className={"parcelReady "+(sidos.length?"ok":"")}>{status}</div>
   <details className="parcelManual"><summary>주소를 직접 입력할게요</summary><span>행정구역 목록이 안 뜨거나 도로명주소를 쓰려면 직접 입력하세요.</span><input value={manual} onChange={e=>setManual(e.target.value)} placeholder="예: 대전 유성구 원촌동 112-4"/></details>
   <div className={ready?"parcelNotice ready":"parcelNotice"}><b>{ready?"📍 "+address:"사업지 주소를 선택하세요."}</b><span>{ready?"선택 주소를 기준으로 지적도·토지정보를 연결합니다.":"시·도 → 시·군·구 → 읍·면·동 → 지번 순으로 등록합니다."}</span></div>
   <div className="parcelInfo"><div><b>📍 선택 주소 기준<br/>지적도 · 토지정보</b></div><button onClick={smart} disabled={!ready}>토지정보 바로보기 ↗<small>K-GeoP 스마트국토정보</small></button></div>
   <a className={ready?"parcelAnalyze":"parcelAnalyze disabled"} href={ready?"/asset/new?address="+encodeURIComponent(address):undefined} aria-disabled={!ready} onClick={e=>{if(!ready)e.preventDefault()}}>이 땅 분석하기 →</a>
  </section>
  <section className="parcelSteps"><div className="parcelStepsHead"><small>분석 결과에서 확인할 내용</small><b>복잡한 토지정보를 한 화면에 정리합니다.</b></div><div className="parcelStepGrid"><span>필지·지적도</span><span>지목·면적</span><span>공시지가</span><span>주변 실거래</span><span>용도지역·규제</span><span>건축규모</span></div></section>
  <DFLiveAd placement="land"/><DFBottomNav active="land"/>
 </main>
}