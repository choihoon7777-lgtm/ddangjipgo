"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../lib/df-browser";
import{DFBrandHeader,DFBottomNav,DFSectionTitle,DFLiveNotice,DFLiveAd}from"../../components/df-shell";
import{mergeHomeStories,safeEditorialCover}from"../../lib/df-home-editorial";
import{decodeEditorialEntities}from"../../lib/df-editorial-format";
import{getCachedInvestgoList}from"../../lib/df-investgo-fallback";
import{getCachedOfficialNewsList}from"../../lib/df-official-news-fallback";
const dateLabel=x=>{if(!x)return"";const d=new Date(x);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("ko-KR",{month:"2-digit",day:"2-digit"}).format(d)};
const originalIssueDate=x=>{if(!x)return"";const d=new Date(x);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(d)};
export default function FocusHome(){
 const[news,setNews]=useState([]),[insights,setInsights]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[archiveUsed,setArchiveUsed]=useState(false),[newsArchiveUsed,setNewsArchiveUsed]=useState(false),[reload,setReload]=useState(0);
 useEffect(()=>{let live=true;(async()=>{setLoading(true);setError("");setArchiveUsed(false);setNewsArchiveUsed(false);try{const [pinned,top,blog]=await Promise.all([
  dfSupabase.from("df_articles").select("id,title,subtitle,category,region_code,published_at,updated_at,source_channel,is_top_focus,hero_image_url,hero_image_kind").in("status",["published","corrected"]).eq("is_top_focus",true).or("source_channel.is.null,source_channel.neq.investgo").order("published_at",{ascending:false}).limit(3),
  dfSupabase.from("df_articles").select("id,title,subtitle,category,region_code,published_at,updated_at,source_channel,is_top_focus,hero_image_url,hero_image_kind").in("status",["published","corrected"]).or("source_channel.is.null,source_channel.neq.investgo").order("published_at",{ascending:false}).limit(10),
  dfSupabase.from("df_articles").select("id,title,subtitle,category,published_at,original_source_published_at,hero_image_url").in("status",["published","corrected"]).eq("source_channel","investgo").order("published_at",{ascending:false}).limit(5)
 ]);let stories=mergeHomeStories(pinned.data||[],top.data||[]),usingNewsArchive=false;
  if(top.error||pinned.error){
   try{const published=await getCachedOfficialNewsList(14);
    if(published.length){stories=published;usingNewsArchive=true;}
   }catch(e){/* Retain any live published articles already returned */}
  }
  let blogRows=blog.data||[],usingArchive=false;
  if(blog.error){
   try{blogRows=await getCachedInvestgoList(5);usingArchive=true;}catch(e){blogRows=[];}
  }
  if(live){
   setNews(stories);setInsights(blogRows);setArchiveUsed(usingArchive);
   setNewsArchiveUsed(usingNewsArchive);
   if(!stories.length&&!blogRows.length)setError("현재 발행된 기사를 표시할 수 없습니다.");
  }
 }catch(e){
  const [published,blog]=await Promise.all([
   getCachedOfficialNewsList(14).catch(()=>[]),
   getCachedInvestgoList(5).catch(()=>[])
  ]);
  if(live){
   setNews(published);setInsights(blog);setArchiveUsed(!!blog.length);
   setNewsArchiveUsed(!!published.length);
   if(!published.length&&!blog.length)setError("기사를 불러오지 못했습니다.");
  } }finally{if(live)setLoading(false)}})();return()=>{live=false}},[reload]);
 const lead=news[0],seconds=news.slice(1,3),latest=news.slice(3,8);
 const cover=lead?safeEditorialCover(lead.hero_image_url):null;
 return <main className="focusShell dfHigh dfPremiumHome"><DFBrandHeader/>
  <DFLiveNotice placement="home"/>
<div className="dfPremiumEdition"><span><i aria-hidden="true"></i> DOSIMAEK <em>도시개발·부동산 전문 미디어</em></span><a href="/focus/region">지역별 보기 <span aria-hidden="true">↗</span></a></div>

  {error&&<p className="dfReaderStatus" role="alert">{error} <button type="button" onClick={()=>setReload(x=>x+1)}>새로고침</button></p>}
  {(newsArchiveUsed||archiveUsed)&&<p className="dfReaderStatus" role="status"><span className="dfStatusDot" aria-hidden="true"></span> {newsArchiveUsed?"발행 기사 저장본 제공 중 · 새로운 공식자료 갱신 지연":"투자GO 기존 발행 글 제공 중"} <a href="/focus/live">기사 더 보기</a></p>}
  {loading?<section className="focusBlock dfHomeLead dfPremiumCover"><div className="dfHomeSkeleton"><span></span><span></span><span></span><span></span></div></section>:lead?<section className="focusBlock dfHomeLead dfPremiumCover">
   <DFSectionTitle eyebrow="THE LEAD · DEVELOPMENT NEWS" title="주요 개발뉴스" href="/focus/live" label="전체 기사"/>
   <>
    <a className="dfHomeLeadCard" href={"/focus/article?id="+lead.id}>
     {cover&&<div className="dfHomeLeadVisual">
      {safeEditorialCover(lead.hero_image_url)&&<img className="dfHomeEditorialCover" src={safeEditorialCover(lead.hero_image_url)} alt="" loading="eager" decoding="async" onError={e=>{e.currentTarget.style.display="none"}}/>}
      <div><small>{lead.is_top_focus?"편집 선정 · ":"최근 발행 · "}{lead.category||"최신뉴스"}{lead.region_code?" · "+lead.region_code:""}</small><strong className="dfCityLeadMotto">도시의 변화를<br/>읽다.</strong></div>
      <span>{dateLabel(lead.published_at)}</span>
     </div>}
     <div className="dfHomeLeadCopy"><small className="dfLeadNewsKicker">{lead.source_channel==="고시공고"?"고시·공고":lead.source_channel==="보도자료"?"보도자료":lead.category||"개발뉴스"} · 발행 {originalIssueDate(lead.original_source_published_at||lead.published_at)}</small><h1>{decodeEditorialEntities(lead.title)}</h1>{lead.subtitle&&<p>{lead.subtitle}</p>}<div>{lead.updated_at&&lead.updated_at!==lead.published_at&&<span>수정기사</span>}<b>기사보기 →</b></div></div>
    </a>
    {seconds.length>0&&<div className="dfHomeSecondaries">{seconds.map((a,i)=><a href={"/focus/article?id="+a.id} key={a.id}><span className="dfStoryIndex" aria-hidden="true">{String(i+2).padStart(2,"0")}</span><div><small>{a.category||"최신뉴스"}{a.region_code?" · "+a.region_code:""}</small><h3>{decodeEditorialEntities(a.title)}</h3><span>{dateLabel(a.published_at)}</span></div><b aria-hidden="true">↗</b></a>)}</div>}
   </>
  </section>:insights.length?null:<section className="dfHomeIntro"><small>DOSIMAEK</small><h1>발행 자료를 확인하고 있습니다.</h1><p>자료 연결 상태에 따라 최신 기사의 표시가 지연될 수 있습니다.</p><div><a href="/focus/live">발행 기사 보기</a><a href="/focus/policy">정책·고시 보기</a></div></section>}
  <a className="dfRefreshMapLink" href="/focus/projects" aria-label="전국 개발사업 별도 화면에서 확인"><span><small>DEVELOPMENT MAP</small><strong>전국 개발사업 한눈에 보기</strong><em>지역별 사업 현황을 별도 화면에서 확인하세요</em></span><b aria-hidden="true">↗</b></a>
  {latest.length>0&&<section className="focusBlock dfLatestBlock"><DFSectionTitle eyebrow="MORE STORIES" title="최근 발행 기사" href="/focus/live" label="전체 기사"/>
   {latest.map(a=><a className="dfLatestRow" href={"/focus/article?id="+a.id} key={a.id}><div><small>{a.category||"최신뉴스"}{a.region_code?" · "+a.region_code:""}</small><h3>{decodeEditorialEntities(a.title)}</h3><span>{dateLabel(a.published_at)}{a.updated_at&&a.updated_at!==a.published_at?" · 수정기사":""}</span></div><b>→</b></a>)}
  </section>}
  {insights.length>0&&<section className="focusBlock dfLatestBlock dfInvestgoHome"><DFSectionTitle eyebrow="INVESTGO · EXPERT VIEW" title="투자GO 시장 분석" href="/focus/live?category=인사이트" label="분석 글 전체"/><p className="dfInvestgoHomeNotice">{archiveUsed?"기존 발행 글을 날짜순으로 보여드립니다. 신규 글 반영은 지연될 수 있습니다.":"투자GO에서 발행한 부동산·개발 실무 분석입니다."}</p>{insights.map(a=><a className="dfLatestRow" href={"/focus/article?id="+a.id} key={a.id}><div><small>인사이트 · {originalIssueDate(a.original_source_published_at||a.published_at)} 발행</small><h3>{decodeEditorialEntities(a.title)}</h3><span>심층 분석 보기</span></div>{a.hero_image_url?.includes("/storage/v1/object/public/df-investgo-images/")&&<img className="dfInsightHomeThumb" src={a.hero_image_url} alt="" loading="lazy" decoding="async"/>}<b>→</b></a>)}</section>}
  <section className="focusBlock dfPremiumDirectory" aria-label="분야별 개발정보"><DFSectionTitle eyebrow="DISCOVER" title="분야별 탐색"/><div className="dfPremiumDirectoryGrid"><a href="/focus/policy"><span aria-hidden="true">§</span><b>개발정책·고시</b><small>정부·지자체 자료</small></a><a href="/focus/housing"><span aria-hidden="true">▥</span><b>분양·청약</b><small>분양가·청약일정</small></a><a href="/focus/projects"><span aria-hidden="true">▱</span><b>개발사업</b><small>주요 사업 현황</small></a><a href="/focus/region"><span aria-hidden="true">⌖</span><b>지역별 정보</b><small>관심지역 개발정보</small></a></div></section>
  <section className="focusHero dfLandCompact"><div className="focusLandBox"><div className="focusLandBoxHead"><div><small>MY PROPERTY INTELLIGENCE</small><h1>내 부동산 변화 추적</h1></div><span className="focusLandBadge">내 부동산 관리</span></div><p className="focusLandTagline">관심 부동산의 변화를 한눈에</p><p className="focusLandDesc">토지·건물을 등록하면 주변 개발사업·도시계획·실거래·개발호재 변화를 추적합니다.</p><div className="focusHeroActions"><a className="focusHeroPrimary" href="/my/properties">관심부동산 관리 →</a><a className="focusHeroSecondary" href="/search">주소로 분석하기 ↗</a><a className="focusHeroSecondary" href="/alerts">변화 알림 확인 →</a></div></div></section>

<DFLiveAd placement="home"/>
  <DFBottomNav active="home"/>
 </main>
}