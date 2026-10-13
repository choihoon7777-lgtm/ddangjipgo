"use client";
import{useCallback,useEffect,useState}from"react";
import{officialSnapshot,compareSnapshots,validParcelPoint}from"../lib/df-radar-engine";
const t=d=>{if(!d)return"확인 전";const x=new Date(d);return Number.isFinite(x.getTime())?x.toLocaleString("ko-KR"):"확인 전"};
export default function DFParcelRadar({address,pnu,point,profileId=""}){
 const[status,setStatus]=useState("idle"),[message,setMessage]=useState(""),[comparison,setComparison]=useState(null),[current,setCurrent]=useState(null),[baseline,setBaseline]=useState(null),[locationOk,setLocationOk]=useState(false),[busy,setBusy]=useState(false);
 const scan=useCallback(async()=>{
  if(!address&&!/^[0-9]{19}$/.test(String(pnu||"")))return;
  setBusy(true);setStatus("loading");setMessage("");setComparison(null);
  try{
   let parcel=String(pnu||""),position=validParcelPoint(point);
   if(!/^[0-9]{19}$/.test(parcel)||!position){
    const r=await fetch("/api/land?address="+encodeURIComponent(address||""),{cache:"no-store"});
    const d=await r.json();
    if(!r.ok||!d.ok)throw Error("필지 좌표를 공식 원천에서 조회하지 못했습니다.");
    parcel=String(d.pnu||"");position=validParcelPoint(d.point);
   }
   if(!/^[0-9]{19}$/.test(parcel)||!position)throw Error("유효한 필지번호·위치가 확인되지 않았습니다.");
   setLocationOk(true);
   const params=new URLSearchParams({pnu:parcel,lat:String(position.lat),lon:String(position.lon)});
   const resp=await fetch("/api/land-regulation?"+params,{cache:"no-store"});
   const data=await resp.json();
   if(!resp.ok||!data.ok)throw Error("공식 토지이용규제 조회에 실패했습니다.");
   const snap=officialSnapshot(data,parcel);
   if(!snap)throw Error("원천 규제자료가 충분하지 않아 변경 여부를 판단하지 않았습니다.");
   const key="df_radar_baseline_v1:"+String(profileId||"guest")+":"+parcel;
   let prev=null;try{prev=JSON.parse(localStorage.getItem(key)||"null")}catch{}
   if(prev&&prev.version!==1)prev=null;
   setCurrent(snap);
   if(!prev){
    try{localStorage.setItem(key,JSON.stringify(snap));setBaseline(snap);setStatus("baseline");setMessage("첫 공식 조회값을 이 기기의 비교 기준으로 저장했습니다. 다음 조회부터 달라진 항목을 확인합니다.")}
    catch{setBaseline(null);setStatus("no-storage");setMessage("이 브라우저에 비교 기준을 저장할 수 없습니다.")}
   }else{
    const diff=compareSnapshots(prev,snap);
    setBaseline(prev);setComparison(diff);setStatus(diff.status==="changed"?"changed":"unchanged");
    setMessage(diff.status==="changed"?"이전 조회와 다른 규제 명칭이 발견됐습니다. 실제 고시·법적 변경 여부는 원문을 확인해야 합니다.":"기존 조회와 비교한 용도지역·지구·구역 명칭에 차이가 없습니다.");
   }
  }catch(e){setStatus("error");setMessage(e?.message||"공식 자료 연결을 확인하세요.");setLocationOk(false)}
  finally{setBusy(false)}
 },[address,pnu,point?.lat,point?.lon,profileId]);
 useEffect(()=>{if(address||pnu)scan()},[scan,address,pnu]);
 const accept=()=>{
  if(!current)return;
  try{
   const key="df_radar_baseline_v1:"+String(profileId||"guest")+":"+current.pnu;
   localStorage.setItem(key,JSON.stringify(current));setBaseline(current);setComparison({status:"unchanged",changes:[]});setStatus("baseline");setMessage("현재 조회자료를 새 비교 기준으로 저장했습니다.");
  }catch{setMessage("브라우저 저장공간에 기록하지 못했습니다.")}
 };
 return <section className="dfLandAnalysisCard" aria-live="polite">
   <div className="dfLandCardHead"><div><small>OFFICIAL CHANGE RADAR · BETA</small><h2>내 필지 개발규제 변화 점검</h2></div><span className={status==="changed"?"warn":status==="unchanged"?"ok":""}>{status==="changed"?"변화 후보":status==="unchanged"?"차이 없음":status==="loading"?"조회 중":"기준 확인"}</span></div>
   <p className="dfLandSource">국토교통부 VWorld 토지이용계획의 용도지역·지구·구역 명칭을 이전 조회와 비교합니다. 원문 고시 확인 전에는 변경을 확정하지 않습니다.</p>
   <div className="dfLandMetrics"><div><span>조회 위치</span><b>{locationOk?"공식 필지번호·좌표 확인":"조회 전 또는 확인 필요"}</b></div><div><span>이전 비교 기준</span><b>{t(baseline?.checkedAt)}</b></div><div><span>현재 확인</span><b>{t(current?.checkedAt)}</b></div></div>
   {message&&<div className={status==="changed"?"dfLandWarn":"dfLandEmpty"}>{message}</div>}
   {comparison?.changes?.length>0&&<div className="dfLandWarn"><b>변경 후보 {comparison.changes.length}건</b><ul>{comparison.changes.map((c,i)=><li key={c.field+c.kind+c.value+i}>{c.label} {c.kind==="added"?"추가":"제외"}: {c.value}</li>)}</ul><small>데이터 제공 시점·지도 갱신도 원인일 수 있으므로 관할기관의 고시 원문 확인이 필요합니다.</small></div>}
   <div className="dfLandActionBox"><button type="button" className="adminPrimary" disabled={busy||!address&&!pnu} onClick={scan}>{busy?"공식자료 조회 중…":"공식자료 다시 비교"}</button>{status==="changed"&&<button type="button" className="adminSecondary" onClick={accept}>검토 후 현재 값을 새 기준으로 저장</button>}</div>
   <p className="dfLandSource">현재는 페이지 방문 시 비교하는 기능입니다. 서버의 24시간 자동감시·문자·이메일·푸시 알림은 연결되지 않았고 비교 이력은 이 기기에만 저장됩니다.</p>
 </section>;
}
