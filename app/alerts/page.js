"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../lib/df-browser";
import{DFSubHeader,DFBottomNav}from"../../components/df-shell";

export default function Alerts(){
 const[items,setItems]=useState([]),[msg,setMsg]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState("");
 async function load(){
  setLoading(true);const{data:{user}}=await dfSupabase.auth.getUser();if(!user){location.replace("/login?next=/alerts");return}
  const{data,error}=await dfSupabase.from("df_land_alerts").select("id,watchlist_id,article_id,alert_type,title,payload,status,created_at,df_land_watchlists(label,address_text),df_articles(title)").order("created_at",{ascending:false}).limit(100);
  if(error)setMsg("알림을 불러오지 못했습니다.");else{setMsg("");setItems(data||[])}setLoading(false);
 }
 useEffect(()=>{load()},[]);
 async function changeStatus(id,value,reload=true){setBusy(id);const{error}=await dfSupabase.from("df_land_alerts").update({status:value}).eq("id",id);if(error){setMsg("알림 상태 변경에 실패했습니다.");setBusy("");return false}if(reload)await load();setBusy("");return true}
 async function openArticle(x){if(!x.article_id||busy)return;const ok=await changeStatus(x.id,"read",false);if(ok)location.href="/focus/article?id="+x.article_id}
 return <main className="focusShell dfHigh"><DFSubHeader title="알림" kicker="WATCH ALERTS" back="/my" right={null}/>
 <section className="dfMyHero"><small>PERSONAL ALERTS</small><h1>관심부동산 변화 알림</h1><p>등록한 부동산의 지역과 연결되는 개발기사·고시·사업변화를 모읍니다.</p></section>
 <section className="focusBlock">{msg&&<p className="adminDataNote">{msg}</p>}
 {loading?<div className="focusEmpty"><b>알림을 불러오는 중입니다.</b></div>:items.length?items.map(x=><article className={"dfAlertCard "+x.status} key={x.id}><div><small>{x.df_land_watchlists?.label||x.df_land_watchlists?.address_text||"관심부동산"} · {new Date(x.created_at).toLocaleString("ko-KR")}</small><b>{x.title}</b><span>{x.status==="read"?"읽음":x.status==="dismissed"?"숨김":"새 알림"}</span></div><div className="dfListActions">{x.article_id&&<button disabled={busy===x.id} onClick={()=>openArticle(x)}>기사보기</button>}{x.status!=="read"&&<button disabled={busy===x.id} onClick={()=>changeStatus(x.id,"read")}>읽음</button>}{x.status!=="dismissed"&&<button disabled={busy===x.id} onClick={()=>changeStatus(x.id,"dismissed")}>숨김</button>}</div></article>):<div className="focusEmpty"><b>새 알림이 없습니다.</b><span>관심부동산을 등록하면 같은 지역의 검증된 개발기사가 발행될 때 자동으로 연결됩니다.</span><a href="/search">관심부동산 등록하기 →</a></div>}
 </section><DFBottomNav active="my"/></main>
}
