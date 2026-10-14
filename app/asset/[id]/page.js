"use client";
import{useEffect,useState}from"react";
import{useParams}from"next/navigation";
import{dfSupabase}from"../../../lib/df-browser";
import{orderRegionalNews}from"../../../lib/df-radar-relevance";
import DFParcelRadar from"../../../components/df-parcel-radar";
import DFPropertyTransactionPulse from"../../../components/df-property-transaction-pulse";
import{guestProperty,guestAlerts,guestUpdateProperty,guestAlertStatus,isGuestId}from"../../../lib/df-guest-trial";
import{DFSubHeader,DFBottomNav}from"../../../components/df-shell";

export default function Asset(){
 const params=useParams(),id=String(params?.id||"");
 const[item,setItem]=useState(null),[news,setNews]=useState([]),[alerts,setAlerts]=useState([]),[msg,setMsg]=useState(""),[guest,setGuest]=useState(false);
 async function load(){
  const{data:{user}}=await dfSupabase.auth.getUser();const useGuest=isGuestId(id);setGuest(useGuest);let w;
  if(useGuest){w=guestProperty(id);if(!w){setMsg("이 기기에 저장된 체험 부동산을 찾을 수 없습니다.");return}}
  else if(!user){setMsg("이 부동산은 회원 계정에 저장돼 있습니다. 내 기기에서 새 부동산은 로그인 없이 등록할 수 있습니다.");return}
  else{const{data,error}=await dfSupabase.from("df_land_watchlists").select("*").eq("id",id).eq("profile_id",user.id).maybeSingle();if(error){setMsg(error.message);return}if(!data){setMsg("등록된 관심부동산을 찾을 수 없습니다.");return}w=data}
  setItem(w);
  const[a,n]=await Promise.all([
   useGuest?Promise.resolve({data:guestAlerts().filter(x=>x.watchlist_id===id).slice(0,20)}):dfSupabase.from("df_land_alerts").select("id,article_id,title,status,created_at,payload,alert_type").eq("watchlist_id",id).order("created_at",{ascending:false}).limit(20),
   w.region_code?dfSupabase.from("df_articles").select("id,title,category,published_at").in("status",["published","corrected"]).eq("region_code",w.region_code).order("published_at",{ascending:false}).limit(8):Promise.resolve({data:[]})
  ]);
  setAlerts(a.data||[]);setNews(n.data||[]);
 }
 useEffect(()=>{if(id)load()},[id]);
 async function toggle(){if(!item)return;if(guest){try{guestUpdateProperty(item.id,{is_active:!item.is_active});await load()}catch(e){setMsg(e.message)}return}const{error}=await dfSupabase.from("df_land_watchlists").update({is_active:!item.is_active}).eq("id",item.id);if(error)setMsg(error.message);else load()}
 async function markRead(alertId){if(guest){guestAlertStatus(alertId,"read");await load();return}await dfSupabase.from("df_land_alerts").update({status:"read"}).eq("id",alertId);load()}
 async function changeWatch(field,enabled){if(!item)return;if(guest){try{const updated=guestUpdateProperty(item.id,{[field]:enabled});setItem(updated)}catch(e){setMsg(e.message)}return}const{error}=await dfSupabase.from("df_land_watchlists").update({[field]:enabled}).eq("id",item.id);if(error)setMsg("추적 설정 변경에 실패했습니다.");else setItem({...item,[field]:enabled})}
 if(!item)return <main className="focusShell dfHigh"><DFSubHeader title="땅짚고" kicker="MY PROPERTY" back="/my/properties" right={null}/><div className="dfArticleState">{msg||"관심부동산을 불러오는 중입니다."}</div><DFBottomNav active="land"/></main>;
 return <main className="focusShell dfHigh"><DFSubHeader title="땅짚고" kicker="MY PROPERTY" back="/my/properties" right={null}/>
 <section className="dfLandResultHero"><small>{item.region_code||"REGION"} · {item.is_active?"TRACKING":"PAUSED"}</small><h1>{item.label||item.address_text}</h1><p>{item.address_text}</p><button className="adminSecondary" onClick={toggle}>{item.is_active?"관심 알림 대상 일시중지":"관심 알림 대상 다시 지정"}</button></section>
 <section className="focusBlock dfPropertyAlertSettings"><div className="focusTitle"><div><small className="focusEyebrow">WATCH OPTIONS</small><h2>이 부동산 알림 설정</h2></div><a href="/alerts">알림함 →</a></div><label><span><b>필지와 일치하는 공식 고시 알림</b><small>공식 문서의 동일 PNU 또는 동·지번 언급만 알림 후보로 등록</small></span><input type="checkbox" checked={!!item.watch_official} onChange={e=>changeWatch("watch_official",e.target.checked)}/></label><label><span><b>같은 동 참고 소식도 보기</b><small>거리·사업구역 포함 여부가 확인되지 않은 동 단위 정보는 별도로 구분</small></span><input type="checkbox" disabled={!item.watch_official} checked={!!item.watch_dong_updates} onChange={e=>changeWatch("watch_dong_updates",e.target.checked)}/></label><p className="dfLandSource">등록 필지와 실제 개발사업 관계는 고시 원문·지형도면으로 다시 확인해야 합니다. 공식자료 알림은 매일 오전 점검하며, 거래 가격 자동 푸시는 준비 중입니다.</p></section>
 {guest&&<p className="dfGuestNotice">로그인 없는 체험 등록 · 부동산과 규제 비교 기준은 이 기기에만 저장됩니다. 정기 서버 알림은 회원등록 부동산에만 적용되며, 체험 정보는 아래 공식자료 확인을 이용하세요.</p>}
 <DFPropertyTransactionPulse watchlistId={item.id} address={item.address_text} pnu={item.parcel_key}/>
 <DFParcelRadar address={item.address_text} pnu={/^[0-9]{19}$/.test(item.parcel_key||"")?item.parcel_key:null} point={item.latitude!=null&&item.longitude!=null?{lat:item.latitude,lon:item.longitude}:null} profileId={guest?"guest-local":item.profile_id}/>
 <section className="focusBlock"><div className="focusTitle"><div><small className="focusEyebrow">ALERTS</small><h2>변화 알림</h2></div><a href="/alerts">전체보기 →</a></div>{alerts.length?alerts.slice(0,5).map(x=><article className={"dfAlertCard "+x.status} key={x.id}><div><small>{new Date(x.created_at).toLocaleString("ko-KR")} · {x.status}</small><b>{x.title}</b></div>{x.article_id&&<a href={"/focus/article?id="+x.article_id} onClick={()=>markRead(x.id)}>기사보기 →</a>}</article>):<div className="focusEmpty"><b>아직 연결된 알림이 없습니다.</b><span>{guest?"체험 부동산은 서버 자동 알림 대신 직접 공식자료를 확인합니다.":"연결된 알림이 아직 없습니다. 자동 수집·대상 판정·발송 설정이 완료되어야 실제 변화 알림을 받을 수 있습니다."}</span></div>}</section>
 <section className="focusBlock"><div className="focusTitle"><div><small className="focusEyebrow">REGIONAL SIGNAL</small><h2>{item.region_code||"지역"} 개발뉴스</h2><p className="dfLandSource">지역 기준 참고뉴스입니다. 기사 제목에 동명이 언급되어도 해당 필지의 개발 변경이나 주변 영향은 자동으로 확정하지 않습니다.</p></div></div>{news.length?orderRegionalNews(news,item.address_text).map(x=><a className="focusNews" href={"/focus/article?id="+x.id} key={x.id}><div><small>{x.category} · {x._placeMention.label}</small><h3>{x.title}</h3><p>{new Date(x.published_at).toLocaleDateString("ko-KR")}</p></div><span className="newsArrow">→</span></a>):<div className="focusEmpty"><b>공개된 지역기사가 없습니다.</b></div>}</section>
 <section className="focusBlock"><div className="focusTitle"><div><small className="focusEyebrow">OFFICIAL DATA</small><h2>공식 토지정보</h2></div></div><div className="dfLandOfficialLinks"><a href="https://www.kgeop.go.kr" target="_blank" rel="noreferrer"><b>K-GeoP 스마트국토정보</b><span>지적도·토지정보 확인 ↗</span></a><a href="https://rt.molit.go.kr" target="_blank" rel="noreferrer"><b>국토교통부 실거래가</b><span>토지 실거래 확인 ↗</span></a></div></section>
 {msg&&<p className="adminDataNote">{msg}</p>}<DFBottomNav active="land"/></main>
}