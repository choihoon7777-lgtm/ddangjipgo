"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFBrandHeader,DFBottomNav,DFLiveNotice,DFLiveAd}from"../../../components/df-shell";
import{REGION_NAMES,OFFICIAL_CHANNELS,officialRegion,officialChannel,officialDate,filteredOfficial}from"../../../lib/df-region-official";

const linkFor=(name,channel="전체")=>{
 const q=new URLSearchParams();if(name!=="전국")q.set("name",name);if(channel!=="전체")q.set("channel",channel);
 return "/focus/region"+(q.toString()?"?"+q.toString():"");
};
export default function Region(){
 const[name,setName]=useState("전국"),[channel,setChannel]=useState("전체"),[sourceHealth,setSourceHealth]=useState(null);
 const[official,setOfficial]=useState([]),[articles,setArticles]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const[showCount,setShowCount]=useState(10),[refreshed,setRefreshed]=useState(""),[lastFetch,setLastFetch]=useState(null),[partial,setPartial]=useState(false),[reload,setReload]=useState(0);
 useEffect(()=>{
  const q=new URLSearchParams(window.location.search);
  const selected=REGION_NAMES.includes(q.get("name"))?q.get("name"):"전국";
  const kind=OFFICIAL_CHANNELS.includes(q.get("channel"))?q.get("channel"):"전체";
  setName(selected);setChannel(kind);setShowCount(10);
  let live=true;
  async function load(isRefresh=false){
   if(!isRefresh){setLoading(true);setError("")}
   try{
    const healthPromise=fetch("/api/health/official?region="+encodeURIComponent(selected),{cache:"no-store"}).then(async r=>r.ok?r.json():null).catch(()=>null);
    // The public RPC already applies its publication/visibility policy. Page through
    // verified/public sources rather than reading the protected document table.
    const docs=[];let reachedEnd=false,scanned=0;
    for(let offset=0;offset<500;offset+=100){
     const{data,error:rpcError}=await dfSupabase.rpc("df_public_development_policy",{
      p_channel:null,p_topic:null,p_limit:100,p_offset:offset
     });
     if(rpcError)throw new Error("공식 정책·고시·보도자료를 불러오지 못했습니다.");
     if(!live)return;
     docs.push(...(data||[]));scanned+=data?.length||0;
     if(!data||data.length<100){reachedEnd=true;break}
     if(filteredOfficial(docs,selected,kind).length>=30)break;
    }
    const selectedDocs=filteredOfficial(docs,selected,kind);
    const query=dfSupabase.from("df_articles")
      .select("id,title,category,region_code,published_at,updated_at,source_channel")
      .in("status",["published","corrected"]).order("published_at",{ascending:false}).limit(20);
    const articleResult=await(selected==="전국"?query:query.eq("region_code",selected));
    const collection=await healthPromise;
    if(!live)return;
    setSourceHealth(collection?.ok?collection:null);
    setOfficial(selectedDocs);setArticles(articleResult.data||[]);
    setPartial(!reachedEnd&&scanned>=500);
    setLastFetch(docs.reduce((n,x)=>Math.max(n,Date.parse(x.fetched_at||"")||0),0));
    setRefreshed(new Date().toISOString());setError(articleResult.error?"지역 개발기사를 일부 불러오지 못했습니다.":"");
   }catch(e){if(live)setError(e?.message||"지역 자료 업데이트를 확인하지 못했습니다.")}
   finally{if(live)setLoading(false)}
  }
  load();
  const refresh=()=>{if(document.visibilityState==="visible")load(true)};
  const timer=setInterval(refresh,5*60*1000);
  document.addEventListener("visibilitychange",refresh);
  return()=>{live=false;clearInterval(timer);document.removeEventListener("visibilitychange",refresh)};
 },[reload]);
 const stale=lastFetch&&Date.now()-lastFetch>72*60*60*1000;
 const shown=official.slice(0,showCount);
 return <main className="focusShell dfHigh">
  <DFBrandHeader/>
  <DFLiveNotice placement="region" region={name==="전국"?null:name}/>
  <section className="dfRegionIntro"><small>REGIONAL INTELLIGENCE</small><h1>{name==="전국"?"전국 개발 흐름":name+"의 개발 흐름"}</h1><p>지역별 개발정책·고시·공고·보도자료를 공식자료 기준으로 모아봅니다.</p></section>
  <section className="dfRegionPicker"><div className="focusTitle"><div><small className="focusEyebrow">REGION</small><h2>지역 선택</h2></div></div>
   <div className="regionGrid">{REGION_NAMES.map(x=><a className={x===name?"on":""} href={linkFor(x,channel)} key={x} aria-current={x===name?"page":undefined}>{x}</a>)}</div>
  </section>
  <section className="dfRegionOfficial">
   <div className="focusTitle"><div><small className="focusEyebrow">OFFICIAL UPDATE</small><h2>{name==="전국"?"전국":name} 정책·고시·보도자료</h2></div><button type="button" className="dfRegionRefresh" onClick={()=>setReload(v=>v+1)} disabled={loading}>{loading?"조회 중":"새로고침 ↻"}</button></div>
   <p className="dfRegionExplanation">정부·지자체가 발표한 공식자료를 발표일 순서로 제공합니다. 상세 내용은 도시맥에서 확인할 수 있습니다.</p>
   <div className="dfRegionChannels" aria-label="공식자료 유형 선택">{OFFICIAL_CHANNELS.map(x=><a key={x} className={x===channel?"on":""} href={linkFor(name,x)} aria-current={channel===x?"page":undefined}>{x}</a>)}</div>
   {stale&&<p className="dfRegionStale" role="status">최근 발표 자료가 아직 반영되지 않았을 수 있습니다.</p>}
   {error&&<div className="dfRegionStale" role="alert">{error}</div>}
   <div className="dfRegionResultsBar"><span>{loading?"자료 확인 중…":"자료 "+official.length+"건"}</span><span>{refreshed?"업데이트 "+officialDate(refreshed):"발표 자료 기준"}</span></div>
   {loading?<div className="focusEmpty"><b>지역별 정책·고시·보도자료를 불러오는 중입니다.</b></div>:shown.length?<div className="dfRegionOfficialList">{shown.map(x=><a href={"/focus/policy?id="+x.id+"&from=region&name="+encodeURIComponent(name)} className="dfRegionOfficialRow" key={x.id}>
    <div className="dfRegionOfficialMeta"><span>{officialChannel(x)}</span><em>{(x.source_name||"공식기관").replace(/\s*자동\s*수집\s*$/,"")}</em>{officialRegion(x)&&<i>{officialRegion(x)}</i>}{x.changed&&<b>원문 수정</b>}</div>
    <h3>{x.title}</h3>
    <p className="dfRegionSummary">{x.key_extract_status==="ready"&&x.key_content?x.key_content:"공식 상세 내용은 아직 검증 중입니다. 제목과 공개자료 기준으로 안내합니다."}</p>
    <div className="dfRegionOfficialFoot"><span>{officialDate(x.published_at||x.fetched_at)} · {x.topic_code||"개발정책"}</span><strong>내용 확인 →</strong></div>
   </a>)}</div>:<div className="focusEmpty"><b>현재 이 조건에서 공개된 공식자료가 없습니다.</b><span>수집·검증이 끝난 자료부터 나타납니다. 자료가 없다고 신규 정책이나 고시가 없다는 뜻은 아닙니다.</span></div>}
   {!loading&&official.length>showCount&&<button type="button" className="dfRegionMore" onClick={()=>setShowCount(v=>v+10)}>공식자료 더 보기 ({Math.min(showCount,official.length)} / {official.length}) ↓</button>}
   {!loading&&partial&&<p className="dfRegionStale">자료가 많아 최근 일부를 우선 확인했습니다. 오래된 공식자료는 개발정책 전체보기에서 확인하세요.</p>}
   <a className="dfRegionPolicyAll" href="/focus/policy">전국 공식 정책·고시 자료 전체보기 →</a>
  </section>
  <section className="focusBlock dfRegionNewsSection"><div className="focusTitle"><div><small className="focusEyebrow">REGIONAL ARTICLES</small><h2>{name==="전국"?"전국":name} 주요 개발기사</h2></div><a href="/focus/live">전체보기 →</a></div>
   {!loading&&articles.length?articles.map((a,i)=><a className={"focusNews "+(i===0?"leadNews":"")} href={"/focus/article?id="+a.id} key={a.id}><div><small>{a.category||"최신뉴스"}{a.source_channel==="investgo"?" · 전문가 분석":""}</small><h3>{a.title}</h3><p>{a.updated_at&&a.updated_at!==a.published_at?"수정기사 · ":""}발행 {officialDate(a.published_at)}</p></div><span className="newsArrow">→</span></a>):<div className="focusEmpty"><b>{loading?"개발기사를 불러오는 중입니다.":"현재 공개된 지역 개발기사가 없습니다."}</b><span>기사 발행과 공식자료 수집은 별도로 표시됩니다.</span></div>}
  </section>
  <DFLiveAd placement="region" region={name==="전국"?null:name}/>
  <section className="dfRegionAction"><small>LAND INTELLIGENCE</small><b>{name==="전국"?"관심 부동산을 등록하세요":name+"의 내 부동산을 추적하세요"}</b><span>공식 토지정보와 등록한 필지의 규제 변화 후보를 확인합니다.</span><a href="/search">땅짚고에서 등록하기 →</a></section>
  <DFBottomNav active="news"/>
 </main>
}
