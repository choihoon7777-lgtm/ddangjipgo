
"use client";
import {useEffect,useMemo,useState} from "react";
import {DFBrandHeader,DFBottomNav} from "../../../components/df-shell";
import {housingPriceLabel,housingStage,HOUSING_KINDS,HOUSING_SOURCE} from "../../../lib/df-housing.mjs";
import "./housing.css";
const REGIONS=["전국","서울","경기","인천","부산","대구","광주","대전","울산","세종","강원","충북","충남","전북","전남","경북","경남","제주"];
const KINDS=[["","전체"],["APT","일반분양"],["REMAIN","무순위·잔여세대"],["OPTIONAL","임의공급"]];
const dateText=v=>v?v.replaceAll("-","."):"미확인";
const today=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date()).map(x=>[x.type,x.value]));return p.year+"-"+p.month+"-"+p.day};
function DateField({title,value}){return <div className="dfHousingDate"><span>{title}</span><b>{dateText(value)}</b></div>}
function Models({rows=[]}){
 if(!rows.length)return <p className="dfHousingNoModels">주택형별 분양가 자료가 아직 수집되지 않았습니다. 아래 청약홈 공식 공고문에서 확인해 주세요.</p>;
 return <div className="dfHousingTableScroll"><table className="dfHousingTable"><thead><tr><th>주택형(전용)</th><th>공급세대</th><th>최고 분양가</th></tr></thead><tbody>{rows.map((m,i)=><tr key={i}><td>{m.HOUSE_TY||"미확인"}</td><td>{m.SUPLY_HSHLDCO??m.GNRL_SUPLY_HSHLDCO??"미확인"}</td><td>{housingPriceLabel(m.LTTOT_TOP_AMOUNT===undefined?null:Number(String(m.LTTOT_TOP_AMOUNT).replace(/,/g,"")))}</td></tr>)}</tbody></table></div>;
}
function Detail({item}){
 const schedule=[
  ["모집공고일",item.published_date],["특별공급",item.special_start_date],["1순위",item.first_date],
  ["2순위",item.second_date],["접수 시작",item.application_start_date],["접수 종료",item.application_end_date],
  ["당첨자 발표",item.winner_date],["계약 시작",item.contract_start_date],["계약 종료",item.contract_end_date]
 ];
 return <div className="dfHousingMain">
  <a className="dfHousingBack" href="/focus/housing">← 분양·청약 전체보기</a>
  <section className="dfHousingDetailHero">
   <small>청약홈 공식 분양정보 · {HOUSING_KINDS[item.supply_kind]?.[2]||"APT"}</small>
   <h1>{item.house_name}</h1>
   <p>{item.address||item.region_name||"위치 미확인"}</p>
   <div className="dfHousingHeroBadges"><b>{housingStage(item,today())}</b><span>모집공고일 {dateText(item.published_date)}</span></div>
  </section>
  <section className="dfHousingPanel"><h2>분양 핵심정보</h2>
   <div className="dfHousingKeyGrid"><div><small>공급세대</small><strong>{item.total_households===null?"미확인":item.total_households.toLocaleString("ko-KR")+"세대"}</strong></div>
   <div><small>주택형별 최고 분양가 중 가장 높은 금액</small><strong>{housingPriceLabel(item.top_price_manwon)}</strong></div></div>
   <p className="dfHousingCaution">위 금액은 수집된 주택형별 최고 분양가입니다. 공급면적별·층별 공급가격, 발코니 확장비, 옵션 및 중도금 조건은 입주자모집공고문을 확인해야 합니다.</p>
  </section>
  <section className="dfHousingPanel"><h2>청약 및 계약 일정</h2><div className="dfHousingDates">{schedule.map(([name,val])=><DateField key={name} title={name} value={val}/>)}</div></section>
  <section className="dfHousingPanel"><h2>주택형별 공급정보</h2><Models rows={item.models_json}/></section>
  <footer className="dfHousingSource"><div><b>공식 출처 · 한국부동산원 청약홈</b><p>청약일정·분양가는 정정공고로 변경될 수 있으며, 실제 신청 전 청약홈에서 최종 확인해야 합니다.</p><small>최근 수집 {item.refreshed_at?new Date(item.refreshed_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"}):"확인 전"}</small></div><a href={item.official_url||"https://www.applyhome.co.kr/"} target="_blank" rel="noreferrer">청약홈에서 원문 확인 ↗</a></footer>
 </div>;
}
export default function HousingPage(){
 const [rows,setRows]=useState([]),[item,setItem]=useState(null),[selectedId,setSelectedId]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const [search,setSearch]=useState(""),[region,setRegion]=useState("전국"),[kind,setKind]=useState(""),[status,setStatus]=useState("전체"),[retry,setRetry]=useState(0);
 useEffect(()=>{let active=true;const id=new URLSearchParams(window.location.search).get("id");setSelectedId(id||"");setLoading(true);setError("");
  fetch("/api/focus-housing"+(id?"?id="+encodeURIComponent(id):""),{cache:"no-store"})
   .then(async r=>{const p=await r.json();if(!r.ok||!p.ok)throw Error(p.error||"데이터를 불러오지 못했습니다.");return p})
   .then(p=>{if(active){if(id)setItem(p.item);else setRows(p.items||[]);}})
   .catch(()=>{if(active)setError("현재 청약 공식 데이터가 연결되지 않았거나 조회할 수 없습니다.");})
   .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[retry]);
 const isDetail=Boolean(selectedId);
 const filtered=useMemo(()=>rows.filter(r=>{
  if(search&&![r.house_name,r.address,r.region_name].filter(Boolean).join(" ").toLowerCase().includes(search.trim().toLowerCase()))return false;
  if(region!=="전국"&&!String(r.region_name||r.address||"").startsWith(region))return false;
  if(kind&&r.supply_kind!==kind)return false;
  return status==="전체"||housingStage(r,today())===status;
 }),[rows,search,region,kind,status]);
 return <main className="focusShell dfHigh"><DFBrandHeader/>
  {loading?<div className="dfHousingMain"><div className="focusEmpty"><b>공식 청약정보를 확인하는 중입니다.</b></div></div>:
  error?<div className="dfHousingMain"><section className="dfHousingOffline" role="status"><h1>공식 청약정보를 불러올 수 없습니다.</h1><p>{error} 검증되지 않은 일정이나 분양가는 표시하지 않습니다.</p><button onClick={()=>setRetry(x=>x+1)}>다시 확인</button><a href="https://www.applyhome.co.kr/" target="_blank" rel="noreferrer">청약홈 공식 사이트 ↗</a></section></div>:
  isDetail?(item?<Detail item={item}/>:<div className="dfHousingMain"><section className="dfHousingOffline"><h1>해당 공고를 찾을 수 없습니다.</h1><a href="/focus/housing">분양 목록으로 →</a></section></div>):
  <div className="dfHousingMain">
   <section className="dfHousingHero"><small>HOUSING & SUBSCRIPTION</small><h1>전국 분양·청약</h1><p>아파트 분양일정부터 주택형별 분양가까지. 추정이 아닌 청약홈 공식 공개자료로 확인합니다.</p><div><span>공식 모집공고 기준</span><span>정정공고 확인 권장</span></div></section>
   <section className="dfHousingFilter">
    <label className="dfHousingSearch"><span>단지명·지역 검색</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="예: 대전, 아파트 단지명"/></label>
    <div className="dfHousingFields"><label>지역<select value={region} onChange={e=>setRegion(e.target.value)}>{REGIONS.map(x=><option key={x}>{x}</option>)}</select></label><label>진행상태<select value={status} onChange={e=>setStatus(e.target.value)}>{["전체","청약 예정","청약 진행","청약 마감","일정 확인"].map(x=><option key={x}>{x}</option>)}</select></label></div>
    <div className="dfHousingChips">{KINDS.map(([key,label])=><button type="button" key={key} onClick={()=>setKind(key)} className={key===kind?"selected":""}>{label}</button>)}</div>
   </section>
   <div className="dfHousingResultHead"><h2>분양공고 <span>{filtered.length.toLocaleString("ko-KR")}건</span></h2><small>확인 가능한 최근 공식 공고 · 모집공고일 순</small></div>
   {filtered.length?<div className="dfHousingCards">{filtered.map(r=><a className="dfHousingCard" key={r.offer_key} href={"/focus/housing?id="+encodeURIComponent(r.offer_key)}>
    <div className="dfHousingCardTop"><span>{HOUSING_KINDS[r.supply_kind]?.[2]||"아파트"}</span><b>{housingStage(r,today())}</b></div>
    <h3>{r.house_name}</h3><p>{r.address||r.region_name||"공급위치 미확인"}</p>
    <div className="dfHousingCardMetrics"><div><small>주택형별 최고 분양가 중 최고</small><strong>{housingPriceLabel(r.top_price_manwon)}</strong></div><div><small>공급규모</small><strong>{r.total_households===null?"미확인":r.total_households.toLocaleString("ko-KR")+"세대"}</strong></div></div>
    <div className="dfHousingCardBottom"><span>모집공고 {dateText(r.published_date)}</span><b>일정·분양가 보기 →</b></div>
   </a>)}</div>:<section className="dfHousingOffline"><h2>{rows.length?"조건에 맞는 공고가 없습니다.":"공식 청약정보 수집 준비 중"}</h2><p>{rows.length?"검색 조건을 변경해 보세요.":"현재 공식 분양공고 데이터가 아직 동기화되지 않았습니다. 실제 공고와 분양가는 청약홈에서 확인할 수 있으며, 검증되지 않은 정보는 표시하지 않습니다."}</p><a href="https://www.applyhome.co.kr/" target="_blank" rel="noreferrer">청약홈에서 직접 확인 ↗</a></section>}
   <footer className="dfHousingSource"><div><b>정보 제공 · 한국부동산원 청약홈</b><p>본 서비스는 공식 공개자료를 재구성하며 모집공고 정정·접수 결과를 실시간 보장하지 않습니다.</p></div><a href={HOUSING_SOURCE} target="_blank" rel="noreferrer">공식 API 출처 보기 ↗</a></footer>
  </div>}
  <DFBottomNav active="news"/>
 </main>;
}
