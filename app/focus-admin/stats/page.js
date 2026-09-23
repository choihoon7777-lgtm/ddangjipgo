"use client";
import{useEffect,useMemo,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../../components/df-shell";

export default function Stats(){
 const[days,setDays]=useState(7),[traffic,setTraffic]=useState([]),[articleStats,setArticleStats]=useState([]),[adStats,setAdStats]=useState([]),[counts,setCounts]=useState({}),[loading,setLoading]=useState(true),[msg,setMsg]=useState("");
 useEffect(()=>{(async()=>{
  setLoading(true);setMsg("");
  const from=new Date(Date.now()-(days-1)*86400000).toISOString().slice(0,10);
  const [t,a,ad,p,w,s,c]=await Promise.all([
   dfSupabase.from("df_traffic_daily").select("*").gte("stat_date",from).order("stat_date"),
   dfSupabase.from("df_article_daily_stats").select("stat_date,article_id,pageviews,avg_engagement_seconds,df_articles(title)").gte("stat_date",from),
   dfSupabase.from("df_ad_daily_stats").select("stat_date,campaign_id,impressions,clicks,df_ad_campaigns(advertiser_name)").gte("stat_date",from),
   dfSupabase.from("df_articles").select("id",{count:"exact",head:true}).in("status",["published","corrected"]),
   dfSupabase.from("df_land_watchlists").select("id",{count:"exact",head:true}).eq("is_active",true),
   dfSupabase.from("df_saved_articles").select("article_id",{count:"exact",head:true}),
   dfSupabase.from("df_claims").select("id",{count:"exact",head:true}).in("status",["open","reviewing"])
  ]);
  const err=t.error||a.error||ad.error||p.error||w.error||s.error||c.error;if(err)setMsg(err.message);
  setTraffic(t.data||[]);setArticleStats(a.data||[]);setAdStats(ad.data||[]);setCounts({published:p.count||0,watchlists:w.count||0,saved:s.count||0,claims:c.count||0});setLoading(false);
 })()},[days]);
 const totalViews=useMemo(()=>traffic.reduce((n,x)=>n+Number(x.pageviews||0),0),[traffic]);
 const top=useMemo(()=>{const m={};for(const x of articleStats){const k=x.article_id;m[k]=m[k]||{id:k,title:x.df_articles?.title||"기사",views:0};m[k].views+=Number(x.pageviews||0)}return Object.values(m).sort((a,b)=>b.views-a.views).slice(0,5)},[articleStats]);
 const ads=useMemo(()=>adStats.reduce((o,x)=>({impressions:o.impressions+Number(x.impressions||0),clicks:o.clicks+Number(x.clicks||0)}),{impressions:0,clicks:0}),[adStats]);
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="운영 통계" kicker="ANALYTICS"/>
 <section className="adminPanel"><div className="statTabs">{[1,7,30].map(x=><button className={days===x?"on":""} onClick={()=>setDays(x)} key={x}>{x===1?"오늘":x+"일"}</button>)}</div>
 {msg&&<div className="editorGate"><span>{msg}</span></div>}
 <div className="adminStats"><div><b>{loading?"—":totalViews.toLocaleString()}</b><span>기사 조회</span></div><div><b>{counts.published??"—"}</b><span>발행기사</span></div><div><b>{counts.watchlists??"—"}</b><span>관심부동산</span></div><div><b>{counts.saved??"—"}</b><span>기사저장</span></div></div>
 </section>
 <section className="adminPanel"><div className="adminSectionTitle"><div><small>CONTENT</small><h2>인기 기사</h2></div><span>{days}일</span></div>{top.length?<div className="dfStatsRank">{top.map((x,i)=><a href={"/focus/article?id="+x.id} key={x.id}><b>{i+1}</b><span>{x.title}</span><strong>{x.views.toLocaleString()}뷰</strong></a>)}</div>:<div className="adminEmpty"><b>아직 조회 데이터가 없습니다.</b><span>기사 공개 후 실제 열람이 발생하면 자동 집계됩니다.</span></div>}</section>
 <section className="adminPanel"><div className="adminSectionTitle"><div><small>BUSINESS</small><h2>광고·운영</h2></div></div><div className="adminStats"><div><b>{ads.impressions.toLocaleString()}</b><span>광고 노출</span></div><div><b>{ads.clicks.toLocaleString()}</b><span>광고 클릭</span></div><div><b>{counts.claims??0}</b><span>정정 처리중</span></div><div><b>{traffic.length}</b><span>집계구간</span></div></div></section>
 <p className="adminDataNote">조회수와 광고 노출·클릭은 개발포커스 내부 이벤트 기준 실제 집계값입니다. 외부 분석도구 수치는 별도 연동하지 않습니다.</p>
 <DFAdminBottomNav active="stats"/></main>
}