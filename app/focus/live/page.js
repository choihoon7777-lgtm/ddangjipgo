"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFBrandHeader,DFBottomNav,DFSectionTitle}from"../../../components/df-shell";
import{decodeEditorialEntities}from"../../../lib/df-editorial-format";
const cats=["전체","개발사업","정책·고시","분양","금융","건설사 동향","인사이트"];
const channelFilters=["전체","보도자료","고시·공고","입법예고","조례·규칙"];
const topicFilters=["전체","도시계획","주택·건축","토지·정비","교통·인프라","산업·투자"];
const channelMap={"고시·공고":"고시공고","조례·규칙":"조례규칙"};
const topicMap={"주택·건축":"주택건축","토지·정비":"토지정비","교통·인프라":"교통인프라","산업·투자":"산업투자"};
const publicationDate=x=>{if(!x)return"";const d=new Date(x);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(d)};
export default function Live(){
 const[category,setCategory]=useState("전체"),[channel,setChannel]=useState("전체"),[topic,setTopic]=useState("전체"),[items,setItems]=useState([]),[loading,setLoading]=useState(true);
 useEffect(()=>{const p=new URLSearchParams(location.search),q=p.get("category")||"전체",c=p.get("channel")||"전체",t=p.get("topic")||"전체";setCategory(cats.includes(q)?q:"전체");setChannel(channelFilters.includes(c)?c:"전체");setTopic(topicFilters.includes(t)?t:"전체")},[]);
 useEffect(()=>{(async()=>{setLoading(true);let q=dfSupabase.from("df_articles").select("id,title,subtitle,category,region_code,published_at,original_source_published_at,updated_at,source_channel,topic_code,hero_image_url").in("status",["published","corrected"]).order("published_at",{ascending:false}).limit(50);if(category!=="전체")q=q.eq("category",category);if(category==="정책·고시"&&channel!=="전체")q=q.eq("source_channel",channelMap[channel]||channel);if(category==="정책·고시"&&topic!=="전체")q=q.eq("topic_code",topicMap[topic]||topic);const{data}=await q;setItems(data||[]);setLoading(false)})()},[category,channel,topic]);
 function hrefForFilter(nextChannel=channel,nextTopic=topic){const p=new URLSearchParams();p.set("category","정책·고시");if(nextChannel!=="전체")p.set("channel",nextChannel);if(nextTopic!=="전체")p.set("topic",nextTopic);return"/focus/live?"+p.toString()}
 const isPolicy=category==="정책·고시";
 return <main className="focusShell dfHigh"><DFBrandHeader/>
 <section className="dfLiveHero"><small>DOSIMAEK</small><h1>{isPolicy?"정책·고시":category==="인사이트"?"시장 분석":"최신 뉴스"}</h1><p>{isPolicy?"전국 지자체와 정부의 보도자료·고시공고·입법예고·조례를 한곳에서 확인합니다.":category==="인사이트"?"도시개발·부동산 시장을 다룬 전문 분석 기사입니다.":"공식 정책 자료와 전문 분석 기사를 구분해 제공합니다."}</p></section>
 <div className="dfNewsFilters">{cats.map(x=><a key={x} className={x===category?"on":""} href={x==="전체"?"/focus/live":x==="정책·고시"?"/focus/policy":"/focus/live?category="+encodeURIComponent(x)}>{x==="정책·고시"?"개발정책":x}</a>)}</div>
 {isPolicy&&<section className="dfPolicyFilters">
  <div><small>자료유형</small><div>{channelFilters.map(x=><a key={x} className={channel===x?"on":""} href={hrefForFilter(x,topic)}>{x}</a>)}</div></div>
  <div><small>주제</small><div>{topicFilters.map(x=><a key={x} className={topic===x?"on":""} href={hrefForFilter(channel,x)}>{x}</a>)}</div></div>
 </section>}
 <section className="focusBlock"><DFSectionTitle eyebrow="LATEST" title={category==="전체"?"전체 뉴스":isPolicy?"개발정책":category} />
 {loading?<div className="focusEmpty"><b>뉴스를 불러오는 중입니다.</b></div>:items.length?items.map((a,i)=><a className={"focusNews "+(i===0?"leadNews":"")} href={"/focus/article?id="+a.id} key={a.id}><div><small>{a.source_channel==="investgo"?"인사이트":isPolicy?(a.source_channel==="고시공고"?"고시·공고":a.source_channel==="조례규칙"?"조례·규칙":a.source_channel||"개발정책"):(a.category||"최신뉴스")}</small><h3>{decodeEditorialEntities(a.title)}</h3>{a.subtitle&&i===0&&<p className="dfNewsSubtitle">{a.subtitle}</p>}<p>{a.source_channel==="investgo"?"발행 "+publicationDate(a.original_source_published_at||a.published_at):(a.updated_at&&a.updated_at!==a.published_at?"수정기사 · ":"")+"발행 "+publicationDate(a.published_at)}</p></div>{a.source_channel==="investgo"&&a.hero_image_url?.includes("/storage/v1/object/public/df-investgo-images/")&&<img className="dfInsightNewsThumb" src={a.hero_image_url} alt="" loading="lazy" decoding="async"/>}<span className="newsArrow">→</span></a>):<div className="focusEmpty"><b>현재 공개된 자료가 없습니다.</b><span>{isPolicy?"선택한 필터에 해당하는 공식자료가 없습니다.":"검증·승인된 기사만 표시됩니다."}</span></div>}
 </section><DFBottomNav active="news"/></main>
}