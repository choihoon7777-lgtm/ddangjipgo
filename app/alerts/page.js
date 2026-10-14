"use client";
import{useEffect,useMemo,useState}from"react";
import{dfSupabase}from"../../lib/df-browser";
import{DFSubHeader,DFBottomNav}from"../../components/df-shell";
const date=x=>{const d=new Date(x);return Number.isNaN(d.getTime())?"시각 미확인":d.toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})};
const cleanGovLink=x=>{try{const u=new URL(x);return u.protocol==="https:"&&u.hostname.endsWith(".go.kr")?u.href:null}catch{return null}};
const categories={official_parcel:"내 필지 공식자료",official_dong:"같은 동 참고자료",news:"지역 기사"};
export default function Alerts(){
 const[items,setItems]=useState([]),[msg,setMsg]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[filter,setFilter]=useState("unread");
 async function load(){
  setLoading(true);const{data:{user}}=await dfSupabase.auth.getUser();if(!user){location.replace("/login?next=/alerts");return}
  const{data,error}=await dfSupabase.from("df_land_alerts").select("id,watchlist_id,article_id,alert_type,title,payload,status,created_at,df_land_watchlists(label,address_text),df_articles(title,status)").order("created_at",{ascending:false}).limit(200);
  if(error)setMsg("알림을 불러오지 못했습니다. 다시 시도하세요.");else{setMsg("");setItems(data||[])}
  setLoading(false);
 }
 useEffect(()=>{load()},[]);
 const unread=items.filter(x=>["pending","sent"].includes(x.status)).length;
 const visible=useMemo(()=>items.filter(x=>filter==="all"||filter==="unread"&&["pending","sent"].includes(x.status)||filter==="official"&&["official_parcel","official_dong"].includes(x.alert_type)),[items,filter]);
 async function changeStatus(x,value){
  if(busy)return;setBusy(x.id);
  const{error}=await dfSupabase.from("df_land_alerts").update({status:value}).eq("id",x.id);
  if(error)setMsg("알림 상태를 변경하지 못했습니다.");else setItems(a=>a.map(v=>v.id===x.id?{...v,status:value}:v));
  setBusy("");
 }
 const articleLink=x=>x.article_id&&["published","corrected"].includes(x.df_articles?.status)?"/focus/article?id="+encodeURIComponent(x.article_id):null;
 return <main className="focusShell dfHigh">
  <DFSubHeader title="알림" kicker="MY PROPERTY WATCH" back="/focus" right={null}/>
  <section className="dfMyHero"><small>PROPERTY INTELLIGENCE</small><h1>내 부동산 변화 알림</h1><p>등록한 필지의 공식자료 언급과 같은 동의 개발 소식을 구분해 보여줍니다. 실거래가 최신 확인은 부동산 상세에서 이용할 수 있습니다.</p></section>
  <section className="focusBlock dfAlertHub">
   <div className="dfAlertHubTop"><div><span>읽지 않은 알림</span><b>{unread}건</b></div><a href="/my/properties">내 부동산 관리 →</a></div>
   <div className="dfAlertFilter" role="group" aria-label="알림 종류">{[["unread","안 읽음"],["all","전체"],["official","공식자료"]].map(([key,label])=><button key={key} className={filter===key?"active":""} onClick={()=>setFilter(key)}>{label}</button>)}</div>
   {msg&&<p className="dfPropertyTxWarning" role="alert">{msg}</p>}
   {loading?<div className="focusEmpty"><b>내 알림을 확인하는 중입니다.</b></div>:visible.length?<div className="dfAlertHubList">{visible.map(x=>{
    const official=cleanGovLink(x.payload?.source_url),article=articleLink(x);
    const note=x.payload?.evidence_note;
    return <article className={"dfAlertCard dfAlertRich "+x.status} key={x.id}>
      <div><small>{x.df_land_watchlists?.label||x.df_land_watchlists?.address_text||"관심부동산"} · {date(x.created_at)}</small><span className="dfAlertType">{categories[x.alert_type]||"변화 알림"} · {["pending","sent"].includes(x.status)?"새 알림":"확인함"}</span><b>{x.title}</b>
      {note&&<p className="dfAlertEvidence">{note}</p>}
      {x.payload?.source_published_at&&<p className="dfAlertPublishDate">공식자료 발표일: {date(x.payload.source_published_at)}</p>}
      </div>
      <div className="dfListActions">{official&&<a href={official} target="_blank" rel="noopener noreferrer" onClick={()=>changeStatus(x,"read")}>공식 원문 보기 ↗</a>}{article&&<a href={article} onClick={()=>changeStatus(x,"read")}>기사 보기 →</a>}<a href={"/asset/"+encodeURIComponent(x.watchlist_id)}>등록 부동산 →</a>
      {["pending","sent"].includes(x.status)&&<button disabled={busy===x.id} onClick={()=>changeStatus(x,"read")}>읽음</button>}{x.status!=="dismissed"&&<button disabled={busy===x.id} onClick={()=>changeStatus(x,"dismissed")}>숨김</button>}</div>
    </article>})}</div>:<div className="focusEmpty"><b>{filter==="unread"?"읽지 않은 알림이 없습니다.":"이 조건에서 볼 알림이 없습니다."}</b><span>개발 관련 공식자료에 등록 필지가 언급되는지 정기 점검합니다. 실제로 자료가 없거나 원문 검증이 끝나지 않은 경우 알림을 만들지 않습니다.</span><a href="/my/properties">내 부동산 알림 설정 →</a></div>}
   <section className="dfAlertHow"><h2>어떤 변화가 알림으로 오나요?</h2><p>‘동일 필지 근거’는 공식 문서에 PNU 또는 동·지번이 언급됐다는 뜻이며, 사업 구역에 포함됐다는 확정은 아닙니다. ‘같은 동 참고’는 사용자가 선택한 경우에만 보이며, 거리·영향 확인이 필요합니다.</p><p>공식 문서는 매일 오전 8시 15분에 점검합니다. 실거래 자동 푸시·이메일 전송은 아직 연결 전이며, 현재는 앱 내 알림함을 이용합니다.</p><a href="/my/properties">내 부동산 등록·설정하기 →</a></section>
  </section><DFBottomNav active="my"/></main>;
}