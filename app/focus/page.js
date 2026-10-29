"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../lib/df-browser";
import{DFBrandHeader,DFBottomNav,DFSectionTitle,DFLiveNotice,DFLiveAd}from"../../components/df-shell";
import{mergeHomeStories,safeEditorialCover}from"../../lib/df-home-editorial";
import{decodeEditorialEntities}from"../../lib/df-editorial-format";
const dateLabel=x=>{if(!x)return"";const d=new Date(x);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("ko-KR",{month:"2-digit",day:"2-digit"}).format(d)};
const originalIssueDate=x=>{if(!x)return"";const d=new Date(x);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(d)};
export default function FocusHome(){
 const[news,setNews]=useState([]),[insights,setInsights]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[reload,setReload]=useState(0);
 useEffect(()=>{let live=true;(async()=>{setLoading(true);setError("");try{const [pinned,top,blog]=await Promise.all([
  dfSupabase.from("df_articles").select("id,title,subtitle,category,region_code,published_at,updated_at,source_channel,is_top_focus,hero_image_url,hero_image_kind").in("status",["published","corrected"]).eq("is_top_focus",true).or("source_channel.is.null,source_channel.neq.investgo").order("published_at",{ascending:false}).limit(3),
  dfSupabase.from("df_articles").select("id,title,subtitle,category,region_code,published_at,updated_at,source_channel,is_top_focus,hero_image_url,hero_image_kind").in("status",["published","corrected"]).or("source_channel.is.null,source_channel.neq.investgo").order("published_at",{ascending:false}).limit(10),
  dfSupabase.from("df_articles").select("id,title,subtitle,category,published_at,original_source_published_at,hero_image_url").in("status",["published","corrected"]).eq("source_channel","investgo").order("published_at",{ascending:false}).limit(5)
 ]);if(top.error&&pinned.error)throw top.error;if(blog.error&&!top.data?.length&&!pinned.data?.length)throw blog.error;if(live){setNews(mergeHomeStories(pinned.data||[],top.data||[]));setInsights(blog.data||[]);}}catch(e){if(live)setError("최신 뉴스를 불러오지 못했습니다. 다시 시도해 주세요.")}finally{if(live)setLoading(false)}})();return()=>{live=false}},[reload]);
 const lead=news[0],seconds=news.slice(1,3),latest=news.slice(3,8);
 return <main className="focusShell dfHigh dfPremiumHome"><DFBrandHeader/>
  <DFLiveNotice placement="home"/>
<div className="dfPremiumEdition"><span><i aria-hidden="true"></i> DOSIMAEK <em>도시의 변화를 가장 먼저</em></span><a href="/focus/region">전국 지역별 보기 →</a></div>

  {error&&<section className="dfHomeError" role="alert"><b>{error}</b><button type="button" onClick={()=>setReload(x=>x+1)}>다시 시도</button></section>}
  {loading?<section className="focusBlock dfHomeLead dfPremiumCover"><div className="dfHomeSkeleton"><span></span><span></span><span></span><span></span></div></section>:lead?<section className="focusBlock dfHomeLead dfPremiumCover">
   <DFSectionTitle eyebrow="TOP STORIES" title="오늘의 핵심 뉴스" href="/focus/live"/>
   <>
    <a className="dfHomeLeadCard" href={"/focus/article?id="+lead.id}>
     <div className="dfHomeLeadVisual">
      {safeEditorialCover(lead.hero_image_url)&&<img className="dfHomeEditorialCover" src={safeEditorialCover(lead.hero_image_url)} alt="" loading="eager" decoding="async" onError={e=>{e.currentTarget.style.display="none"}}/>}
      <div><small>{lead.is_top_focus?"편집 선정 · ":"최근 발행 · "}{lead.category||"최신뉴스"}{lead.region_code?" · "+lead.region_code:""}</small><strong className="dfCityLeadMotto">도시의 변화를<br/>읽다.</strong></div>
      <span>{dateLabel(lead.published_at)}</span>
     </div>
     <div className="dfHomeLeadCopy"><h1>{decodeEditorialEntities(lead.title)}</h1>{lead.subtitle&&<p>{lead.subtitle}</p>}<div>{lead.updated_at&&lead.updated_at!==lead.published_at&&<span>수정기사</span>}<b>기사보기 →</b></div></div>
    </a>
    {seconds.length>0&&<div className="dfHomeSecondaries">{seconds.map(a=><a href={"/focus/article?id="+a.id} key={a.id}><div><small>{a.category||"최신뉴스"}{a.region_code?" · "+a.region_code:""}</small><h3>{decodeEditorialEntities(a.title)}</h3><span>{dateLabel(a.published_at)}</span></div><b>→</b></a>)}</div>}
   </>
  </section>:<section className="dfHomeIntro"><small>DOSIMAEK</small><h1>도시의 변화를<br/>공식자료부터 읽습니다.</h1><p>개발사업·정책·고시·분양·금융 정보를 검증해 한곳에 모읍니다.</p><div><a href="/focus/live">개발뉴스 보기</a><a href="/search">주소로 부동산 분석</a></div></section>}
  <section aria-label="전국 개발사업 지도 열기" style={{margin:"12px 16px",padding:"14px 16px",border:"1px solid #ead7b0",borderRadius:14,background:"#fffaf1"}}><a href="/focus/projects" style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,textDecoration:"none",color:"#11213b"}}><span><strong style={{display:"block",fontSize:16}}>전국 개발사업 한눈에 보기</strong><small style={{display:"block",marginTop:5,color:"#677181"}}>지도는 별도 화면에서 확인하세요</small></span><span aria-hidden="true" style={{fontSize:24,color:"#b88937"}}>›</span></a></section>
  {latest.length>0&&<section className="focusBlock dfLatestBlock"><DFSectionTitle eyebrow="LATEST NEWS" title="실시간 핵심 이슈" href="/focus/live"/>
   {latest.map(a=><a className="dfLatestRow" href={"/focus/article?id="+a.id} key={a.id}><div><small>{a.category||"최신뉴스"}{a.region_code?" · "+a.region_code:""}</small><h3>{decodeEditorialEntities(a.title)}</h3><span>{dateLabel(a.published_at)}{a.updated_at&&a.updated_at!==a.published_at?" · 수정기사":""}</span></div><b>→</b></a>)}
  </section>}
  <section className="focusHero dfLandCompact"><div className="focusLandBox"><div className="focusLandBoxHead"><div><small>MY PROPERTY INTELLIGENCE</small><h1>내 부동산 변화 추적</h1></div><span className="focusLandBadge">내 부동산 관리</span></div><p className="focusLandTagline">관심 부동산의 변화를 한눈에</p><p className="focusLandDesc">토지·건물을 등록하면 주변 개발사업·도시계획·실거래·개발호재 변화를 추적합니다.</p><div className="focusHeroActions"><a className="focusHeroPrimary" href="/my/properties">관심부동산 관리 →</a><a className="focusHeroSecondary" href="/search">주소로 분석하기 ↗</a><a className="focusHeroSecondary" href="/alerts">변화 알림 확인 →</a></div></div></section>
  <section className="focusBlock dfPremiumDirectory" aria-label="분야별 개발정보"><DFSectionTitle eyebrow="EXPLORE" title="빠른 탐색"/><div className="dfPremiumDirectoryGrid"><a href="/focus/policy"><span aria-hidden="true">§</span><b>개발정책·고시</b><small>정부·지자체 공식자료</small></a><a href="/focus/housing"><span aria-hidden="true">▥</span><b>분양·청약</b><small>분양가·청약일정</small></a><a href="/focus/projects"><span aria-hidden="true">▱</span><b>개발사업</b><small>주요 사업 현황</small></a><a href="/focus/region"><span aria-hidden="true">⌖</span><b>지역별 정보</b><small>관심지역 개발정보</small></a></div></section>
<DFLiveAd placement="home"/>
  {insights.length>0&&<section className="focusBlock dfLatestBlock dfInvestgoHome"><DFSectionTitle eyebrow="EXPERT INSIGHTS" title="투자GO 인사이트" href="/focus/live?category=인사이트" label="전체 보기 →"/><p className="dfInvestgoHomeNotice">개발사업과 부동산 시장을 이해하는 전문 분석 기사입니다.</p>{insights.map(a=><a className="dfLatestRow" href={"/focus/article?id="+a.id} key={a.id}><div><small>인사이트 · {originalIssueDate(a.original_source_published_at||a.published_at)} 발행</small><h3>{decodeEditorialEntities(a.title)}</h3><span>심층 분석 보기</span></div>{a.hero_image_url?.includes("/storage/v1/object/public/df-investgo-images/")&&<img className="dfInsightHomeThumb" src={a.hero_image_url} alt="" loading="lazy" decoding="async"/>}<b>→</b></a>)}</section>}
  <section className="dfHomeTrust"><div><b>OFFICIAL SOURCE</b><span>공식자료 기반 검증</span></div><i></i><div><b>REVISION LOG</b><span>수정이력 공개</span></div><i></i><div><b>REGIONAL</b><span>지역별 개발정보</span></div></section>
  <DFBottomNav active="home"/>
 </main>
}