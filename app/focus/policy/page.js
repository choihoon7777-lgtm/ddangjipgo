"use client";
import{useEffect,useMemo,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFBrandHeader,DFBottomNav}from"../../../components/df-shell";
import "./policy-workbench.css";
import policySnapshot from "../../../lib/df-policy-snapshot.json";

const channels=["전체","보도자료","고시·공고","입법예고","조례·규칙"];
const topics=["전체","도시계획","주택·건축","토지·정비","교통·인프라","산업·투자","기타"];
const channelDb=x=>x==="고시·공고"?"고시공고":x==="조례·규칙"?"조례규칙":x;
const channelLabel=x=>x==="고시공고"?"고시·공고":x==="조례규칙"?"조례·규칙":x||"공식자료";
const dateKey=x=>{const d=new Date(x);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(d)};
const factPriority=["사업명","위치","소재지","사업면적","산업단지 면적","면적","산업시설용지","지원시설용지","규모","변경사항","변경내용","변경 내용","사업기간","기간","준공예정일","시행일","적용일","사업시행자","공고번호","담당부서","등록일"];
const factEntries=x=>x&&typeof x==="object"?Object.entries(x).filter(([,v])=>v!==null&&v!==undefined&&String(v).trim()).sort(([a],[b])=>{const ai=factPriority.indexOf(a),bi=factPriority.indexOf(b);return(ai<0?99:ai)-(bi<0?99:bi)}):[];
const cardFacts=x=>factEntries(x).filter(([k])=>!/(첨부|파일|담당부서|등록일|공고번호)/.test(k)).slice(0,3);
const keyLines=s=>String(s||"").split(/\n+/).map(x=>x.trim()).filter(Boolean).filter(x=>!/\.(?:hwp|hwpx|pdf|docx?|xlsx?|pptx?|zip)(?:\s|$)/i.test(x)).filter(x=>!/^\d+[.)]\s*[^:：]{2,100}(?:\(변경 없음\)|\(변경\)|\(해당 없음\))?$/.test(x));
const pickFact=(facts,keys)=>{for(const key of keys){const hit=factEntries(facts).find(([k])=>k===key);if(hit)return String(hit[1]);}return null;};
const changeKeys=["변경사항","변경 내용","변경내용","주요 변경사항","변경 전후","변경 전·후","주요 변경내용"];
const explicitChange=facts=>pickFact(facts,changeKeys);
const cachedPolicies=(channel,topic)=>policySnapshot.items.filter(x=>(channel==="전체"||channelDb(channel)===x.channel)&&(topic==="전체"||topic===x.topic_code));
const checksFor=detail=>{
 const facts=detail.key_facts||{};
 const checks=[];
 if(/(변경|개정|해제|조정)/.test(detail.title||"")&&!explicitChange(facts))checks.push("변경 전·후 항목과 실제 변경 범위는 고시문·첨부 도면 대조 필요");
 if(!pickFact(facts,["시행일","적용일","효력발생일","시행일자"]))checks.push("적용·시행 시점은 공식 고시 원문에서 별도 확인");
 if(!pickFact(facts,["위치","사업위치","소재지"]))checks.push("대상 필지·위치는 첨부 지형도면 또는 공식자료에서 확인");
 if(!pickFact(facts,["면적","사업면적","산업단지 면적","규모"]))checks.push("면적·규모 수치는 본문 또는 첨부표에서 확인");
 return checks.slice(0,3);
};
export default function Policy(){
 const[channel,setChannel]=useState("전체"),[topic,setTopic]=useState("전체"),[items,setItems]=useState([]),[detail,setDetail]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[retry,setRetry]=useState(0),[backRegion,setBackRegion]=useState(null),[snapshotMode,setSnapshotMode]=useState(false),[visibleCount,setVisibleCount]=useState(20);
 useEffect(()=>{
  let active=true;
  const params=new URLSearchParams(location.search),id=params.get("id");
  const fromRegion=params.get("from")==="region"&&["전국","서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"].includes(params.get("name"))?params.get("name"):null;
  setBackRegion(fromRegion);
  const c=channels.includes(params.get("channel"))?params.get("channel"):"전체";
  const t=topics.includes(params.get("topic"))?params.get("topic"):"전체";
  setChannel(c);setTopic(t);setLoading(true);setError("");setSnapshotMode(false);setVisibleCount(20);
  (async()=>{
   try{
    if(id&&!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))throw new Error("올바른 자료 주소가 아닙니다.");
    const result=id?await dfSupabase.rpc("df_public_development_policy_detail",{p_document_id:id}):await dfSupabase.rpc("df_public_development_policy",{p_channel:c==="전체"?null:channelDb(c),p_topic:t==="전체"?null:t,p_limit:150,p_offset:0});
    if(!active)return;
    if(result.error){
     const cached=id?policySnapshot.details?.[id]:cachedPolicies(c,t);
     if(!cached)throw new Error("현재 공식자료 서비스에 접속할 수 없으며 해당 자료는 저장본에 없습니다.");
     setSnapshotMode(true);
     if(id)setDetail(cached);
     else setItems(cached);
    }else if(id){
     if(!result.data?.[0])throw new Error("자료를 찾을 수 없거나 공개되지 않은 자료입니다.");
     setDetail(result.data[0]);
    }else setItems(result.data||[]);
   }catch(e){if(active)setError(e.message);}
   finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;};
 },[retry]);
 const grouped=useMemo(()=>{const m=new Map();for(const x of items.slice(0,visibleCount)){const k=dateKey(x.published_at||x.fetched_at);if(!m.has(k))m.set(k,[]);m.get(k).push(x)}return[...m.entries()]},[items,visibleCount]);
 const latestCollected=items.reduce((latest,x)=>Math.max(latest,Date.parse(x.fetched_at||"")||0),0);
 const collectionDelayed=latestCollected>0&&Date.now()-latestCollected>72*60*60*1000;
 function href(c=channel,t=topic){const p=new URLSearchParams();if(c!=="전체")p.set("channel",c);if(t!=="전체")p.set("topic",t);return"/focus/policy"+(p.toString()?"?"+p.toString():"")}
 if(error)return <main className="focusShell dfHigh dfEditorialPolicyPage"><DFBrandHeader/><section className="focusEmpty" role="alert"><b>{error}</b><button className="dfPolicyRetry" onClick={()=>setRetry(x=>x+1)}>다시 시도</button><a href="/focus/policy">개발정책 목록으로</a></section><DFBottomNav active="policy"/></main>;
 if(detail){
  const facts=factEntries(detail.key_facts);
  return <main className="focusShell dfHigh dfEditorialPolicyPage"><DFBrandHeader/>
   <article className="dfPolicyDetail dfPolicyReader">
    {snapshotMode&&<div className="dfPolicySnapshotNotice dfEditorialPolicyNotice" role="status"><b>마지막 확인 자료</b><p>수집 기준 {dateKey(policySnapshot.last_source_fetched_at)} · 이후 변경사항은 포함되지 않을 수 있습니다.</p></div>}
    <a className="dfPolicyBack" href={backRegion?"/focus/region"+(backRegion==="전국"?"":"?name="+encodeURIComponent(backRegion)):"/focus/policy"}>← {backRegion?backRegion+" 지역 자료":"개발정책"}</a>
    <section className="dfPolicySummaryCard">
     <div className="dfPolicyMeta"><span>{channelLabel(detail.channel)}</span>{detail.version_count>1&&<b>원문 갱신 이력</b>}</div>
     <small className="dfPolicyFormLabel">DOSIMAEK / OFFICIAL DOCUMENT</small>
     <h1>{detail.title}</h1>
     <div className="dfPolicyByline"><b>{detail.source_name||"공식기관"}</b><span>{dateKey(detail.published_at||detail.fetched_at)}</span></div>
    </section>

    {!!facts.length&&<section className="dfPolicyReaderSection dfPolicyFactsCard">
     <small>사업정보</small>
     <h2>공식 문서에서 추출한 사업정보</h2>
     <dl>{facts.map(([k,v])=><div key={k}><dt>{k}</dt><dd>{String(v)}</dd></div>)}</dl>
    </section>}

    <section className="dfPolicyReaderSection dfPolicyLead">
     <small>DOCUMENT HIGHLIGHTS</small>
     <h2>문서 핵심 내용</h2>
     <div className="dfPolicyKeySentences">
      {keyLines(detail.key_content).map((x,i)=><p key={i}>{x}</p>)}
     </div>
    </section>

    {!!detail.attachments?.length&&<section className="dfPolicyReaderSection dfPolicyAttachmentCard">
     <small>첨부자료</small>
     <h2>공식 첨부파일</h2>
     <div>{detail.attachments.map((a,i)=><a key={(a.url||"")+i} href={a.url} target="_blank" rel="noreferrer"><b>{a.name||"첨부파일"}</b><span>{(a.type||"FILE").toUpperCase()} · 열기 ↗</span></a>)}</div>
    </section>}

   </article><DFBottomNav active="policy"/></main>
 }
 return <main className="focusShell dfHigh dfEditorialPolicyPage"><DFBrandHeader/>
  <section className="dfPolicyHero dfEditorialPolicyHero"><small>OFFICIAL DOCUMENTS / POLICY</small><h1>정책·고시</h1><p>정부·지자체의 고시와 보도자료에서 확인한 사업정보와 핵심 문장을 모았습니다.</p><div><b>문서별 확인</b><span>사업정보 · 핵심 내용 · 첨부자료</span></div></section>
  <section className="dfPolicyFilters dfEditorialPolicyFilters" aria-label="정책·고시 필터">
   <div><small>자료유형</small><div>{channels.map(x=><a key={x} className={channel===x?"on":""} aria-current={channel===x?"page":undefined} href={href(x,topic)}>{x}</a>)}</div></div>
   <div><small>주제</small><div>{topics.map(x=><a key={x} className={topic===x?"on":""} aria-current={topic===x?"page":undefined} href={href(channel,x)}>{x}</a>)}</div></div>
  </section>
  <section className="dfPolicyFeed dfEditorialPolicyFeed"><div className="dfEditorialPolicyOverview"><b>{loading?"자료 확인 중":`${items.length}건의 문서`}</b><span>확인된 발행일 기준</span></div>{snapshotMode&&<div className="dfPolicySnapshotNotice dfEditorialPolicyNotice" role="status"><b>마지막 확인 자료</b><p>수집 기준 {dateKey(policySnapshot.last_source_fetched_at)} · 이후 변경사항은 포함되지 않을 수 있습니다.</p></div>}{!snapshotMode&&!loading&&collectionDelayed&&<p className="dfPolicyFreshness" role="status">마지막 수집 확인: {dateKey(latestCollected)} · 이후 자료는 아직 수집 여부가 확인되지 않았습니다.</p>}{loading?<div className="focusEmpty"><b>정책·고시 자료를 불러오고 있습니다.</b></div>:grouped.length?grouped.map(([date,rows],gi)=><section className="dfPolicyDay" key={date}><header><div><small>{gi===0?"최근 자료":"이전 자료"}</small><h2>{date}</h2></div><span>{rows.length}건</span></header><div>{rows.map(x=>{const facts=cardFacts(x.key_facts);return <a className="dfPolicyRow dfPolicyReaderRow" href={"/focus/policy?id="+x.id} key={x.id}>
   <div className="dfPolicyRowMeta"><span>{channelLabel(x.channel)}</span><em>{x.source_name||"공식기관"}</em>{x.changed&&<b>원문 갱신</b>}</div>
   <h3>{x.title}</h3>
   <div className="dfDecisionCardLabel">{explicitChange(x.key_facts)?"변경 내용 확인":"공식자료 핵심"} <span>· {cardFacts(x.key_facts).length?"기본정보 추출":"세부 수치 대조 필요"}</span></div>
   <div className="dfPolicyKeyPreview">{keyLines(x.key_content).slice(0,2).join("\n")}</div>
   {!!facts.length&&<div className="dfPolicyCardFacts">{facts.map(([k,v])=><span key={k}><b>{k}</b>{String(v)}</span>)}</div>}
   <div className="dfPolicyRowFoot"><p>{x.topic_code||"기타"} · {dateKey(x.published_at||x.fetched_at)}</p><span>핵심 내용 보기 ›</span></div>
  </a>})}</div></section>):<div className="focusEmpty"><b>선택한 조건의 개발정책이 없습니다.</b><span>새 공식자료가 확인되면 자동으로 누적됩니다.</span></div>}{!loading&&items.length>visibleCount&&<div className="dfPolicyMore"><button type="button" onClick={()=>setVisibleCount(n=>n+20)}>이전 자료 더 보기 ({Math.min(items.length-visibleCount,20)}건)</button></div>}</section>
  <DFBottomNav active="policy"/></main>
}