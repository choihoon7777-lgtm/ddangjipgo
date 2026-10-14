"use client";
import{useState}from"react";

// The upstream MOLIT API returns LAWD (district) trades, NOT geospatial distances.
// Only an exact dong + unmasked parcel lot can be labelled a same-parcel match.
// New registrations are local browser comparisons, NOT background trade alerts.
function parcelFromAddress(text){
 const m=String(text||"").trim().match(/([가-힣]{1,20}(?:동|읍|면|리))\s+(산\s*)?(\d{1,5})(?:-(\d{1,4}))?$/);
 if(!m)return null;
 const number=v=>String(Number(v||0));
 return{dong:m[1],lot:(m[2]?"산 ":"")+number(m[3])+(m[4]?"-"+number(m[4]):"")};
}
function normLot(x){
 let s=String(x||"").replace(/\s/g,"").replace(/^[가-힣]+(?=\d)/,"").trim();
 if(!/^(산)?\d{1,5}(?:-\d{1,4})?$/.test(s))return null;
 const san=s.startsWith("산");if(san)s=s.slice(1);
 const[n,sub]=s.split("-");return(san?"산 ":"")+String(Number(n))+(sub!=null?"-"+Number(sub):"");
}
const money=x=>Number.isFinite(Number(x))?Math.round(Number(x)/10000).toLocaleString("ko-KR")+"만원":"금액 확인 필요";
const signature=x=>[x.date,x.dong,normLot(x.jibun),x.area,x.amount].join("|");

export default function DFPropertyTransactionPulse({watchlistId,address,pnu}){
 const[status,setStatus]=useState("idle"),[matched,setMatched]=useState([]),[similar,setSimilar]=useState([]),[added,setAdded]=useState([]),[checkedAt,setCheckedAt]=useState(""),[error,setError]=useState("");
 const target=parcelFromAddress(address);
 const hasPnu=/^[0-9]{19}$/.test(String(pnu||""));
 async function check(){
  if(!hasPnu){setError("19자리 공식 필지번호(PNU)가 확인되지 않아 실거래 조회를 보류했습니다.");return}
  setStatus("loading");setError("");setAdded([]);
  try{
   const r=await fetch("/api/land-transactions?pnu="+encodeURIComponent(pnu)+"&months=3",{cache:"no-store"});
   const j=await r.json();
   if(!r.ok||!j.ok)throw Error("국토부 실거래 API를 확인하지 못했습니다. 잠시 후 다시 시도하세요.");
   if(j.partial||j.stale||!Array.isArray(j.queriedMonths)||j.queriedMonths.length!==3)throw Error("조회기간 전체가 확인되지 않아 새 거래 판단을 보류했습니다.");
   if(!target)throw Error("동·지번을 정확히 확인할 수 없어 거래 비교를 보류했습니다.");
   const active=(j.transactions||[]).filter(x=>!x.cancelled&&x.date&&Number(x.area)>0&&Number(x.amount)>0);
   const inDong=active.filter(x=>String(x.dong||"").trim()===target.dong);
   const exact=inDong.filter(x=>normLot(x.jibun)===target.lot);
   const notExact=inDong.filter(x=>normLot(x.jibun)!==target.lot).slice(0,4);
   const key="df_property_tx_verified_v1:"+watchlistId;
   const current=exact.map(signature);
   let previous=null;try{previous=JSON.parse(localStorage.getItem(key)||"null")}catch{}
   if(Array.isArray(previous?.signatures)){
    const old=new Set(previous.signatures);
    setAdded(exact.filter(x=>!old.has(signature(x))));
   }
   try{localStorage.setItem(key,JSON.stringify({checkedAt:new Date().toISOString(),signatures:current.slice(0,120)}))}catch{}
   setMatched(exact.slice(0,15));setSimilar(notExact);setCheckedAt(new Date().toISOString());setStatus(previous?.signatures?"compared":"baseline");
  }catch(e){setError(e?.message||"실거래 확인 실패");setStatus("error")}
 }
 return <section className="focusBlock dfPropertyTxPulse">
  <div className="focusTitle"><div><small className="focusEyebrow">MOLIT TRADE CHECK</small><h2>내 부동산 실거래 변화</h2></div></div>
  <p className="dfLandSource">국토교통부 실거래 API에서 최근 3개월 기록을 확인합니다. 동일 동·지번 거래만 해당 필지로 표시하고, 동 단위 거래는 비교 참고자료로 구분합니다.</p>
  <div className="dfPropertyTxAction"><button type="button" className="adminPrimary" disabled={status==="loading"} onClick={check}>{status==="loading"?"실거래 확인 중…":"최신 실거래 확인 ↻"}</button><span>{checkedAt?"마지막 확인 "+new Date(checkedAt).toLocaleString("ko-KR"):"아직 직접 조회하지 않음"}</span></div>
  {error&&<p className="dfPropertyTxWarning" role="alert">{error}</p>}
  {status==="baseline"&&<p className="dfPropertyTxInfo">첫 조회 기록을 현재 기기에 저장했습니다. 이후 다시 확인하면 새로 조회된 동일 필지 거래를 비교합니다.</p>}
  {status==="compared"&&<p className="dfPropertyTxInfo">{added.length?"이전 조회와 비교해 새로 확인된 동일 필지 거래 "+added.length+"건":"이전 조회 이후 새로 확인된 동일 필지 거래가 없습니다."} 신고·해제·정정 및 원천 공개 지연 여부를 확인해야 합니다.</p>}
  {(status==="baseline"||status==="compared")&&<><h3>동일 지번 일치 거래 · {matched.length}건</h3>
   {matched.length?<div className="dfPropertyTxResults">{matched.map((x,i)=><div key={signature(x)+i}><b>{x.date} · {x.dong} {x.jibun}</b><strong>{money(x.amount)}</strong><span>{x.area}㎡ · 취소거래 제외{added.some(a=>signature(a)===signature(x))?" · 새 확인 거래":""}</span></div>)}</div>:<p className="dfPropertyTxEmpty">이번에 조회한 기간에는 공개된 동일 지번 거래를 확인하지 못했습니다. 거래가 없다는 확정 사실은 아닙니다.</p>}
   {similar.length>0&&<details className="dfPropertyTxNeighbors"><summary>같은 동의 비교거래 {similar.length}건 보기 (주변 거리 미확인)</summary><div className="dfPropertyTxResults">{similar.map((x,i)=><div key={signature(x)+i}><b>{x.date} · {x.dong} {x.jibun||"지번 비공개"}</b><strong>{money(x.amount)}</strong><span>{x.area}㎡ · 동일 필지 거래 아님</span></div>)}</div></details>}
  </>}
  <a className="dfPropertyTxSource" href="https://rt.molit.go.kr/" target="_blank" rel="noopener noreferrer">국토교통부 실거래가 원문 확인 ↗</a>
  <p className="dfLandSource">이 기능은 화면에서 누를 때 조회하고 현재 기기의 이전 조회와 비교합니다. 자동 실거래 알림·푸시는 아직 연결되지 않았습니다. 가격 변동률은 물건의 면적·용도·입지에 따른 비교가 필요하므로 단순 거래금액 차이로 표시하지 않습니다.</p>
 </section>;
}