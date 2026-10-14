"use client";
import{useEffect,useMemo,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFBrandHeader,DFBottomNav}from"../../../components/df-shell";
import OfficialArticleText from "../../../components/df-official-article-text";

const channels=["전체","보도자료","고시·공고","입법예고","조례·규칙"];
const topics=["전체","도시계획","주택·건축","토지·정비","교통·인프라","산업·투자","기타"];
const channelDb=x=>x==="고시·공고"?"고시공고":x==="조례·규칙"?"조례규칙":x;
const dateKey=x=>{const d=new Date(x);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(d)};
export default function Policy(){
 const[channel,setChannel]=useState("전체"),[topic,setTopic]=useState("전체"),[items,setItems]=useState([]),[detail,setDetail]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[retry,setRetry]=useState(0),[backRegion,setBackRegion]=useState(null);
 useEffect(()=>{
  let active=true;
  const params=new URLSearchParams(location.search),id=params.get("id");
  const fromRegion=params.get("from")==="region"&&["전국","서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"].includes(params.get("name"))?params.get("name"):null;
  setBackRegion(fromRegion);
  const c=channels.includes(params.get("channel"))?params.get("channel"):"전체";
  const t=topics.includes(params.get("topic"))?params.get("topic"):"전체";
  setChannel(c);setTopic(t);setLoading(true);setError("");
  (async()=>{
   try{
    if(id&&!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id))throw new Error("올바른 자료 주소가 아닙니다.");
    const result=id?await dfSupabase.rpc("df_public_development_policy_detail",{p_document_id:id}):await dfSupabase.rpc("df_public_development_policy",{p_channel:c==="전체"?null:channelDb(c),p_topic:t==="전체"?null:t,p_limit:80,p_offset:0});
    if(result.error)throw new Error("자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    if(!active)return;
    if(id){if(!result.data?.[0])throw new Error("자료를 찾을 수 없거나 공개되지 않은 자료입니다.");setDetail(result.data[0]);}
    else setItems(result.data||[]);
   }catch(e){if(active)setError(e.message);}
   finally{if(active)setLoading(false);}
  })();
  return()=>{active=false;};
 },[retry]);
 const grouped=useMemo(()=>{const m=new Map();for(const x of items){const k=dateKey(x.published_at||x.fetched_at);if(!m.has(k))m.set(k,[]);m.get(k).push(x)}return[...m.entries()]},[items]);
 const latestCollected=items.reduce((latest,x)=>Math.max(latest,Date.parse(x.fetched_at||"")||0),0);
 const collectionDelayed=latestCollected>0&&Date.now()-latestCollected>72*60*60*1000;
 function href(c=channel,t=topic){const p=new URLSearchParams();if(c!=="전체")p.set("channel",c);if(t!=="전체")p.set("topic",t);return"/focus/policy"+(p.toString()?"?"+p.toString():"")}
 if(error)return <main className="focusShell dfHigh"><DFBrandHeader/><section className="focusEmpty" role="alert"><b>{error}</b><button className="dfPolicyRetry" onClick={()=>setRetry(x=>x+1)}>다시 시도</button><a href="/focus/policy">개발정책 목록으로</a></section><DFBottomNav active="policy"/></main>;
 if(detail)return <main className="focusShell dfHigh"><DFBrandHeader/>
  <article className="dfPolicyDetail">
   <a className="dfPolicyBack" href={backRegion?"/focus/region"+(backRegion==="전국"?"":"?name="+encodeURIComponent(backRegion)):"/focus/policy"}>← {backRegion?backRegion+" 지역 자료":"개발정책"}</a>
   <section className="dfPolicySummaryCard">
    <div className="dfPolicyMeta"><span>{detail.channel==="고시공고"?"고시·공고":detail.channel==="조례규칙"?"조례·규칙":detail.channel||"공식자료"}</span><em>{detail.source_name||"공식기관"}</em>{detail.version_count>1&&<b>원문 변경</b>}</div>
    <h1>{detail.title}</h1>
    <p className="dfPolicyDate">{dateKey(detail.published_at||detail.fetched_at)}</p>
    <div className="dfPolicyKeyBox">
     <div className="dfPolicyKeyHead"><span>핵심 내용</span><b>{detail.key_extract_status==="ready"?(detail.detail_status==="complete"?"공식 문서 발췌":"공식자료 확인 · 핵심 정리"):"원문 확인 필요"}</b></div>
     <div className="dfPolicyKeySentences">{detail.key_extract_status==="ready"&&detail.key_content?String(detail.key_content).split(/\n+/).map(x=>x.trim()).filter(Boolean).map((x,i)=><p key={i}>{x}</p>):<p>개별 공식 본문이 아직 확보되지 않았습니다. 목록 정보만으로 변경 내용을 판단하지 않습니다.</p>}</div>
    </div>
   </section>
   {detail.key_facts&&Object.keys(detail.key_facts).length>0&&<section className="dfPolicyFacts dfPolicyBlock"><div className="dfPolicySectionHead"><small>주요 정보</small><span>공식 문서 기준</span></div><div>{Object.entries(detail.key_facts).filter(([k,v])=>k!=="첨부"&&v!==null&&String(v).trim()).map(([k,v])=><p key={k}><b>{k}</b><span>{String(v)}</span></p>)}</div></section>}
   {detail.detail_status!=="complete"&&detail.content_text&&<section className="dfPolicyBody dfPolicyBlock dfPolicyFullReader"><div className="dfPolicySectionHead"><small>확인된 공식자료 내용</small><span>첨부·원문 추가 확인 필요</span></div><p className="dfPolicyReaderCaution">현재 확보된 공식 문서 내용을 생략 없이 표시합니다. 별도 첨부파일이나 상세 문서 내용은 아직 모두 검증되지 않았을 수 있습니다.</p><OfficialArticleText content={detail.content_text} partial kind="official"/></section>}
   {detail.detail_status==="complete"&&detail.content_text&&<section className="dfPolicyBody dfPolicyBlock dfPolicyFullReader"><div className="dfPolicySectionHead"><small>공식 문서 내용</small><span>확보된 본문 전체</span></div><OfficialArticleText content={detail.content_text} kind="official"/></section>}
   {!!detail.attachments?.length&&<section className="dfPolicyAttachments dfPolicyBlock"><div className="dfPolicySectionHead"><small>첨부파일</small><span>{detail.attachments.length}개</span></div><div>{detail.attachments.map((a,i)=><a key={(a.url||"")+i} href={a.url} target="_blank" rel="noreferrer"><b>{a.name||"첨부파일"}</b><span>{(a.type||"FILE").toUpperCase()} · 열기 ↗</span></a>)}</div></section>}
   <footer className="dfPolicySource">
    <div><small>공식 출처</small><b>{detail.source_name||"공식기관"}</b><span>{detail.detail_status==="complete"?"공식 문서의 주요 내용을 발췌했습니다. 도면 등 상세 자료는 공식 사이트에서 확인하세요.":"공식 기관의 공개 자료를 확인해 핵심 내용을 정리했습니다. 첨부 문서 전문과 도면은 아직 추출·대조되지 않았습니다."}</span></div>
    {detail.source_url&&<a href={detail.source_url} target="_blank" rel="noopener noreferrer">공식 원문 보기 ↗</a>}
   </footer>
  </article><DFBottomNav active="policy"/></main>;
 return <main className="focusShell dfHigh"><DFBrandHeader/>
  <section className="dfPolicyHero"><small>공식자료 · 자동 게시</small><h1>정책·고시</h1><p>정부·지자체 공식자료는 별도 편집 승인 없이 수집 후 자동 공개됩니다. 원문과 확인된 내용을 함께 제공합니다.</p><div><b>공식자료 자동 게시</b><span>수집된 문서를 직접 보여주며, AI 해석 기사는 별도 검증 후 발행합니다.</span></div></section>
  <section className="dfPolicyFilters">
   <div><small>자료유형</small><div>{channels.map(x=><a key={x} className={channel===x?"on":""} href={href(x,topic)}>{x}</a>)}</div></div>
   <div><small>주제</small><div>{topics.map(x=><a key={x} className={topic===x?"on":""} href={href(channel,x)}>{x}</a>)}</div></div>
  </section>
  <section className="dfPolicyFeed">{!loading&&collectionDelayed&&<p className="dfPolicyFreshness" role="status">마지막 수집 확인: {dateKey(latestCollected)} · 이후 자료는 아직 수집 여부가 확인되지 않았습니다.</p>}{loading?<div className="focusEmpty"><b>오늘의 개발정책을 불러오는 중입니다.</b></div>:grouped.length?grouped.map(([date,rows],gi)=><section className="dfPolicyDay" key={date}><header><div><small>{gi===0?"최근 자료":"이전 자료"}</small><h2>{date}</h2></div><span>{rows.length}건</span></header><div>{rows.map(x=><a className="dfPolicyRow" href={"/focus/policy?id="+x.id} key={x.id}><div className="dfPolicyRowMeta"><span>{x.channel==="고시공고"?"고시·공고":x.channel==="조례규칙"?"조례·규칙":x.channel||"공식자료"}</span><em>{x.source_name||"공식기관"}</em>{x.changed&&<b>변경</b>}</div><h3>{x.title}</h3>{x.key_extract_status==="ready"&&x.key_content?<div className="dfPolicyKeyPreview">{x.key_content}</div>:<div className="dfPolicyKeyPreview muted">공식 상세 본문 미확보 · 원문 확인 필요</div>}<div className="dfPolicyRowFoot"><p>{x.topic_code||"기타"} · {dateKey(x.published_at||x.fetched_at)}</p><span>공식자료 보기</span></div><strong>›</strong></a>)}</div></section>):<div className="focusEmpty"><b>선택한 조건의 개발정책이 없습니다.</b><span>새 공식자료가 확인되면 자동으로 누적됩니다.</span></div>}</section>
  <DFBottomNav active="policy"/></main>
}