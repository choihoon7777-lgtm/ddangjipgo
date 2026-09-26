"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../lib/df-browser";
import{DFBrandHeader,DFBottomNav,DFSectionTitle,DFLiveNotice,DFLiveAd}from"../../components/df-shell";
const featuredRegions=["서울","경기","대전","세종","부산"];
const dateLabel=x=>{if(!x)return"";const d=new Date(x);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("ko-KR",{month:"2-digit",day:"2-digit"}).format(d)};
export default function FocusHome(){
 const[news,setNews]=useState([]),[loading,setLoading]=useState(true);
 useEffect(()=>{let live=true;(async()=>{setLoading(true);const{data}=await dfSupabase.from("df_articles").select("id,title,subtitle,category,region_code,published_at,updated_at").in("status",["published","corrected"]).order("published_at",{ascending:false}).limit(9);if(live){setNews(data||[]);setLoading(false)}})();return()=>{live=false}},[]);
 const lead=news[0],seconds=news.slice(1,3),latest=news.slice(3,8);
 return <main className="focusShell dfHigh"><DFBrandHeader/>
  <DFLiveNotice placement="home"/>
  {loading?<section className="focusBlock dfHomeLead"><div className="dfHomeSkeleton"><span></span><span></span><span></span><span></span></div></section>:lead?<section className="focusBlock dfHomeLead">
   <DFSectionTitle eyebrow="TODAY" title="오늘의 주요 뉴스" href="/focus/live"/>
   <>
    <a className="dfHomeLeadCard" href={"/focus/article?id="+lead.id}>
     <div className="dfHomeLeadVisual">
      <div><small>{lead.category||"최신뉴스"}{lead.region_code?" · "+lead.region_code:""}</small><strong>DEVELOPMENT<br/>FOCUS</strong></div>
      <span>{dateLabel(lead.published_at)}</span>
     </div>
     <div className="dfHomeLeadCopy"><h1>{lead.title}</h1>{lead.subtitle&&<p>{lead.subtitle}</p>}<div><span>{lead.updated_at&&lead.updated_at!==lead.published_at?"수정기사 · ":""}공식자료 기반</span><b>기사보기 →</b></div></div>
    </a>
    {seconds.length>0&&<div className="dfHomeSecondaries">{seconds.map(a=><a href={"/focus/article?id="+a.id} key={a.id}><div><small>{a.category||"최신뉴스"}{a.region_code?" · "+a.region_code:""}</small><h3>{a.title}</h3><span>{dateLabel(a.published_at)} · 공식자료 기반</span></div><b>→</b></a>)}</div>}
   </>
  </section>:<section className="dfHomeIntro"><small>DEVELOPMENT FOCUS</small><h1>도시의 변화를<br/>공식자료부터 읽습니다.</h1><p>개발사업·정책·고시·분양·금융 정보를 검증해 한곳에 모읍니다.</p><div><a href="/focus/live">개발뉴스 보기</a><a href="/search">주소로 부동산 분석</a></div></section>}
  <section className="dfHomeTrust"><div><b>OFFICIAL SOURCE</b><span>공식자료 기반 검증</span></div><i></i><div><b>REVISION LOG</b><span>수정이력 공개</span></div><i></i><div><b>REGIONAL</b><span>지역별 개발정보</span></div></section>
  <DFLiveAd placement="home"/>
  <section className="focusHero dfLandCompact"><div className="focusLandBox"><div className="focusLandBoxHead"><div><small>LAND INTELLIGENCE</small><h1>땅짚고</h1></div><span className="focusLandBadge">내 부동산 관리</span></div><p className="focusLandTagline">내 땅의 변화를 놓치지 않도록</p><p className="focusLandDesc">토지·건물을 등록하면 주변 개발사업·도시계획·실거래·개발호재 변화를 추적합니다.</p><div className="focusHeroActions"><a className="focusHeroPrimary" href="/search">부동산 분석 시작</a><a className="focusHeroSecondary" href="/search">땅짚고 보기 →</a></div></div></section>
  {latest.length>0&&<section className="focusBlock dfLatestBlock"><DFSectionTitle eyebrow="LATEST" title="최신 개발뉴스" href="/focus/live"/>
   {latest.map(a=><a className="dfLatestRow" href={"/focus/article?id="+a.id} key={a.id}><div><small>{a.category||"최신뉴스"}{a.region_code?" · "+a.region_code:""}</small><h3>{a.title}</h3><span>{dateLabel(a.published_at)} · {a.updated_at&&a.updated_at!==a.published_at?"수정기사 · ":""}공식자료 기반</span></div><b>→</b></a>)}
  </section>}
  <section className="focusBlock dfRegionHome"><DFSectionTitle eyebrow="REGIONAL" title="지역별 FOCUS" href="/focus/region" label="전국보기 →"/><p className="dfRegionHomeDesc">관심 지역을 선택하면 개발사업·고시·분양·금융 뉴스를 한곳에서 볼 수 있습니다.</p><div className="focusRegions dfFeaturedRegions">{featuredRegions.map(x=><a href={"/focus/region?name="+encodeURIComponent(x)} className="focusRegionCard" key={x}><b>{x}</b><span>FOCUS</span><small>개발정보 →</small></a>)}<a href="/focus/region" className="focusRegionCard dfAllRegions"><b>전국</b><span>17개 시·도</span><small>전체보기 →</small></a></div></section>
  <DFBottomNav active="home"/>
 </main>
}