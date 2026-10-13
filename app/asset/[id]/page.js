"use client";
import{useEffect,useState}from"react";
import{useParams}from"next/navigation";
import{dfSupabase}from"../../../lib/df-browser";
import{orderRegionalNews}from"../../../lib/df-radar-relevance";
import DFParcelRadar from"../../../components/df-parcel-radar";
import{DFSubHeader,DFBottomNav}from"../../../components/df-shell";

export default function Asset(){
 const params=useParams(),id=String(params?.id||"");
 const[item,setItem]=useState(null),[news,setNews]=useState([]),[alerts,setAlerts]=useState([]),[msg,setMsg]=useState("");
 async function load(){
  const{data:{user}}=await dfSupabase.auth.getUser();if(!user){location.replace("/login?next="+encodeURIComponent(location.pathname));return}
  const{data:w,error}=await dfSupabase.from("df_land_watchlists").select("*").eq("id",id).eq("profile_id",user.id).maybeSingle();if(error){setMsg(error.message);return}if(!w){setMsg("등록된 관심부동산을 찾을 수 없습니다.");return}setItem(w);
  const[a,n]=await Promise.all([
   dfSupabase.from("df_land_alerts").select("id,article_id,title,status,created_at").eq("watchlist_id",id).order("created_at",{ascending:false}).limit(20),
   w.region_code?dfSupabase.from("df_articles").select("id,title,category,published_at").in("status",["published","corrected"]).eq("region_code",w.region_code).order("published_at",{ascending:false}).limit(8):Promise.resolve({data:[]})
  ]);
  setAlerts(a.data||[]);setNews(n.data||[]);
 }
 useEffect(()=>{if(id)load()},[id]);
 async function toggle(){if(!item)return;const{error}=await dfSupabase.from("df_land_watchlists").update({is_active:!item.is_active}).eq("id",item.id);if(error)setMsg(error.message);else load()}
 async function markRead(alertId){await dfSupabase.from("df_land_alerts").update({status:"read"}).eq("id",alertId);load()}
 if(!item)return <main className="focusShell dfHigh"><DFSubHeader title="땅짚고" kicker="MY PROPERTY" back="/my/properties" right={null}/><div className="dfArticleState">{msg||"관심부동산을 불러오는 중입니다."}</div><DFBottomNav active="land"/></main>;
 return <main className="focusShell dfHigh"><DFSubHeader title="땅짚고" kicker="MY PROPERTY" back="/my/properties" right={null}/>
 <section className="dfLandResultHero"><small>{item.region_code||"REGION"} · {item.is_active?"TRACKING":"PAUSED"}</small><h1>{item.label||item.address_text}</h1><p>{item.address_text}</p><button className="adminSecondary" onClick={toggle}>{item.is_active?"관심 알림 대상 일시중지":"관심 알림 대상 다시 지정"}</button></section>
 <DFParcelRadar address={item.address_text} pnu={/^[0-9]{19}$/.test(item.parcel_key||"")?item.parcel_key:null} point={item.latitude!=null&&item.longitude!=null?{lat:item.latitude,lon:item.longitude}:null} profileId={item.profile_id}/>
 <section className="focusBlock"><div className="focusTitle"><div><small className="focusEyebrow">ALERTS</small><h2>변화 알림</h2></div><a href="/alerts">전체보기 →</a></div>{alerts.length?alerts.slice(0,5).map(x=><article className={"dfAlertCard "+x.status} key={x.id}><div><small>{new Date(x.created_at).toLocaleString("ko-KR")} · {x.status}</small><b>{x.title}</b></div>{x.article_id&&<a href={"/focus/article?id="+x.article_id} onClick={()=>markRead(x.id)}>기사보기 →</a>}</article>):<div className="focusEmpty"><b>아직 연결된 알림이 없습니다.</b><span>연결된 알림이 아직 없습니다. 자동 수집·대상 판정·발송 설정이 완료되어야 실제 변화 알림을 받을 수 있습니다.</span></div>}</section>
 <section className="focusBlock"><div className="focusTitle"><div><small className="focusEyebrow">REGIONAL SIGNAL</small><h2>{item.region_code||"지역"} 개발뉴스</h2><p className="dfLandSource">지역 기준 참고뉴스입니다. 기사 제목에 동명이 언급되어도 해당 필지의 개발 변경이나 주변 영향은 자동으로 확정하지 않습니다.</p></div></div>{news.length?orderRegionalNews(news,item.address_text).map(x=><a className="focusNews" href={"/focus/article?id="+x.id} key={x.id}><div><small>{x.category} · {x._placeMention.label}</small><h3>{x.title}</h3><p>{new Date(x.published_at).toLocaleDateString("ko-KR")}</p></div><span className="newsArrow">→</span></a>):<div className="focusEmpty"><b>공개된 지역기사가 없습니다.</b></div>}</section>
 <section className="focusBlock"><div className="focusTitle"><div><small className="focusEyebrow">OFFICIAL DATA</small><h2>공식 토지정보</h2></div></div><div className="dfLandOfficialLinks"><a href="https://www.kgeop.go.kr" target="_blank" rel="noreferrer"><b>K-GeoP 스마트국토정보</b><span>지적도·토지정보 확인 ↗</span></a><a href="https://rt.molit.go.kr" target="_blank" rel="noreferrer"><b>국토교통부 실거래가</b><span>토지 실거래 확인 ↗</span></a></div></section>
 {msg&&<p className="adminDataNote">{msg}</p>}<DFBottomNav active="land"/></main>
}