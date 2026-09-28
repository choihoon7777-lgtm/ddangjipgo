"use client";
import{useEffect,useMemo,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFBrandHeader,DFBottomNav}from"../../../components/df-shell";

const channels=["전체","보도자료","고시·공고","입법예고","조례·규칙"];
const topics=["전체","도시계획","주택·건축","토지·정비","교통·인프라","산업·투자","기타"];
const channelDb=x=>x==="고시·공고"?"고시공고":x==="조례·규칙"?"조례규칙":x;
const dateKey=x=>{const d=new Date(x);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("ko-KR",{year:"numeric",month:"2-digit",day:"2-digit"}).format(d)};
const timeKey=x=>{const d=new Date(x);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("ko-KR",{hour:"2-digit",minute:"2-digit"}).format(d)};
export default function Policy(){
 const[channel,setChannel]=useState("전체"),[topic,setTopic]=useState("전체"),[items,setItems]=useState([]),[detail,setDetail]=useState(null),[loading,setLoading]=useState(true);
 useEffect(()=>{const p=new URLSearchParams(location.search);const id=p.get("id");const c=p.get("channel")||"전체",t=p.get("topic")||"전체";setChannel(channels.includes(c)?c:"전체");setTopic(topics.includes(t)?t:"전체");if(id){(async()=>{setLoading(true);const{data,error}=await dfSupabase.rpc("df_public_development_policy_detail",{p_document_id:id});setDetail(!error&&data?.[0]?data[0]:null);setLoading(false)})()}},[]);
 useEffect(()=>{if(detail)return;(async()=>{setLoading(true);const{data}=await dfSupabase.rpc("df_public_development_policy",{p_channel:channel==="전체"?null:channelDb(channel),p_topic:topic==="전체"?null:topic,p_limit:80,p_offset:0});setItems(data||[]);setLoading(false)})()},[channel,topic,detail]);
 const grouped=useMemo(()=>{const m=new Map();for(const x of items){const k=dateKey(x.published_at||x.fetched_at);if(!m.has(k))m.set(k,[]);m.get(k).push(x)}return[...m.entries()]},[items]);
 function href(c=channel,t=topic){const p=new URLSearchParams();if(c!=="전체")p.set("channel",c);if(t!=="전체")p.set("topic",t);return"/focus/policy"+(p.toString()?"?"+p.toString():"")}
 if(detail)return <main className="focusShell dfHigh"><DFBrandHeader/>
  <article className="dfPolicyDetail">
   <a className="dfPolicyBack" href="/focus/policy">← 개발정책</a>
   <div className="dfPolicyMeta"><span>{detail.channel||"공식자료"}</span><em>{detail.source_name||"공식기관"}</em>{detail.version_count>1&&<b>원문 변경 이력 있음</b>}</div>
   <h1>{detail.title}</h1>
   <p className="dfPolicyDate">{dateKey(detail.published_at||detail.fetched_at)} {timeKey(detail.published_at||detail.fetched_at)}</p>
   <div className="dfPolicyOriginal"><small>OFFICIAL ORIGINAL</small><pre>{detail.content_text||"원문 내용이 없습니다."}</pre></div>
   <footer className="dfPolicySource"><small>출처</small><b>{detail.source_name||"공식기관"}</b>{detail.source_url&&<a href={detail.source_url} target="_blank" rel="noreferrer">공식 원문 보기 ↗</a>}</footer>
  </article><DFBottomNav active="news"/></main>;
 return <main className="focusShell dfHigh"><DFBrandHeader/>
  <section className="dfPolicyHero"><small>DEVELOPMENT POLICY MONITOR</small><h1>개발정책</h1><p>전국 정부·지자체의 개발 관련 보도자료·고시공고·입법예고·조례를 원문 그대로 확인합니다.</p><div><b>2026.09.28부터</b><span>신규·변경분만 누적</span></div></section>
  <section className="dfPolicyFilters">
   <div><small>자료유형</small><div>{channels.map(x=><a key={x} className={channel===x?"on":""} href={href(x,topic)}>{x}</a>)}</div></div>
   <div><small>주제</small><div>{topics.map(x=><a key={x} className={topic===x?"on":""} href={href(channel,x)}>{x}</a>)}</div></div>
  </section>
  <section className="dfPolicyFeed">{loading?<div className="focusEmpty"><b>오늘의 개발정책을 불러오는 중입니다.</b></div>:grouped.length?grouped.map(([date,rows],gi)=><section className="dfPolicyDay" key={date}><header><div><small>{gi===0?"TODAY / LATEST":"ARCHIVE"}</small><h2>{date}</h2></div><span>{rows.length}건</span></header><div>{rows.map(x=><a className="dfPolicyRow" href={"/focus/policy?id="+x.id} key={x.id}><div className="dfPolicyRowMeta"><span>{x.channel==="고시공고"?"고시·공고":x.channel==="조례규칙"?"조례·규칙":x.channel||"공식자료"}</span><em>{x.source_name||"공식기관"}</em>{x.changed&&<b>변경</b>}</div><h3>{x.title}</h3><p>{x.topic_code||"기타"} · {timeKey(x.published_at||x.fetched_at)}</p><strong>›</strong></a>)}</div></section>):<div className="focusEmpty"><b>선택한 조건의 개발정책이 없습니다.</b><span>새 공식자료가 확인되면 자동으로 누적됩니다.</span></div>}</section>
  <DFBottomNav active="news"/></main>
}