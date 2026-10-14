"use client";
import{useEffect,useMemo,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../../components/df-shell";

const statuses={candidate:"신규 후보",reviewing:"사실 확인 중",verified:"공식 근거 확인",rejected:"제외"};
const topics=["전체","토지·도시개발","재개발·정비","주택·분양","건설·금융","교통·인프라","산업·개발"];
const formatted=date=>{if(!date)return"—";const d=new Date(date);return Number.isNaN(d.getTime())?"—":new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(d)};
export default function MediaMonitor(){
 const[leads,setLeads]=useState([]),[feeds,setFeeds]=useState([]),[status,setStatus]=useState(""),[topic,setTopic]=useState("전체"),[query,setQuery]=useState(""),[limit,setLimit]=useState(30),[busy,setBusy]=useState(""),[message,setMessage]=useState(""),[loading,setLoading]=useState(true),[official,setOfficial]=useState({});
 async function refresh(){
  setLoading(true);setMessage("");
  const[a,b]=await Promise.all([
   dfSupabase.from("df_media_leads").select("id,publisher,headline,original_url,source_published_at,topic,score,review_status,verified_official_url,editor_note,first_seen_at").order("source_published_at",{ascending:false}).limit(300),
   dfSupabase.from("df_media_feeds").select("id,publisher,section,last_status,last_new,last_checked_at,last_error").order("id")
  ]);
  if(a.error||b.error)setMessage("모니터링 자료를 불러오지 못했습니다. 관리자 로그인 및 권한을 확인하세요.");
  else {setLeads(a.data||[]);setFeeds(b.data||[])}
  setLoading(false);
 }
 useEffect(()=>{refresh()},[]);
 const filtered=useMemo(()=>leads.filter(x=>(!status||x.review_status===status)&&(topic==="전체"||x.topic===topic)&&(!query||[x.headline,x.publisher,x.topic].join(" ").toLowerCase().includes(query.toLowerCase()))),[leads,status,topic,query]);
 const counts=useMemo(()=>({candidate:leads.filter(x=>x.review_status==="candidate").length,reviewing:leads.filter(x=>x.review_status==="reviewing").length,verified:leads.filter(x=>x.review_status==="verified").length}),[leads]);
 async function mark(x,next){
  if(busy)return;
  const url=(official[x.id]??x.verified_official_url??"").trim();
  if(next==="verified"&&!/^https:\/\//i.test(url)){setMessage("공식 1차 근거 URL을 확인한 후에만 근거 확인 상태로 변경할 수 있습니다.");return}
  setBusy(x.id);setMessage("");
  const patch={review_status:next,reviewed_at:new Date().toISOString()};
  if(next==="verified")patch.verified_official_url=url;
  const{error}=await dfSupabase.from("df_media_leads").update(patch).eq("id",x.id);
  if(error)setMessage("변경 실패: "+error.message);
  else setLeads(old=>old.map(y=>y.id===x.id?{...y,...patch}:y));
  setBusy("");
 }
 return <main className="adminShell dfAdminUnified dfMediaMonitor">
  <DFAdminHeader title="언론 모니터링" kicker="MEDIA RESEARCH FACTORY"/>
  <section className="adminPanel dfMediaIntro"><small>HOURLY MONITORING</small><h1>개발·부동산 뉴스 탐색</h1>
   <p>공개 RSS에서 관련 보도를 자동 발견합니다. 기사 전문·사진을 복제하지 않으며, 공식 1차 자료로 확인한 뒤 도시맥 자체 기사를 작성합니다.</p>
   <div className="dfMediaNumbers"><div><b>{feeds.length}</b><span>뉴스 채널</span></div><div><b>{leads.length}</b><span>수집 후보</span></div><div><b>{counts.verified}</b><span>공식 근거 확인</span></div></div>
   <p className="dfMediaPolicy">매시 07분 RSS 수집 · 매시 10분 선별 · 자동 기사 발행 없음</p>
  </section>
  <section className="adminPanel">
   <div className="adminSectionTitle"><div><small>FEED STATUS</small><h2>언론사별 수집 상태</h2></div><button className="adminSecondary" disabled={loading} onClick={refresh}>새로고침</button></div>
   <div className="dfMediaFeedGrid">{feeds.map(f=><div key={f.id}><b>{f.publisher} · {f.section}</b><span>{f.last_status==="success"?"정상":f.last_status==="failed"?"연결 확인 필요":"처리 대기"} · 신규 {f.last_new??0}건</span>{f.last_error&&<small>{f.last_error}</small>}</div>)}</div>
  </section>
  <section className="adminPanel">
   <div className="adminSectionTitle"><div><small>EDITORIAL LEADS</small><h2>기사 후보 검토</h2></div><span>{filtered.length}건</span></div>
   <p className="adminDataNote">보도 제목은 사실 확정이 아닙니다. 사업 위치·면적·세대수·사업비·인허가·공고일은 별도 공식자료로 확인하세요.</p>
   <div className="dfMediaFilters"><input aria-label="보도 검색" value={query} onChange={e=>{setQuery(e.target.value);setLimit(30)}} placeholder="지역·사업·건설사 검색"/><select aria-label="주제" value={topic} onChange={e=>{setTopic(e.target.value);setLimit(30)}}>{topics.map(x=><option key={x}>{x}</option>)}</select></div>
   <div className="dfMediaTabs">{[["","전체"],["candidate","신규 후보"],["reviewing","확인 중"],["verified","근거 확인"],["rejected","제외"]].map(([v,label])=><button key={v} className={status===v?"active":""} onClick={()=>{setStatus(v);setLimit(30)}}>{label}</button>)}</div>
   {message&&<p className="dfMediaMessage" role="status">{message}</p>}
   {loading?<p className="adminDataNote">기사 후보를 불러오는 중입니다.</p>:filtered.length===0?<p className="adminDataNote">해당 조건의 후보가 없습니다.</p>:<div className="dfMediaLeads">{filtered.slice(0,limit).map(x=><article key={x.id} className="dfMediaLead">
    <div className="dfMediaLeadMeta"><span>{x.publisher}</span><span>{x.topic}</span><em>{formatted(x.source_published_at)}</em></div>
    <h3>{x.headline}</h3><div className="dfMediaLeadStatus"><b>{statuses[x.review_status]||"검토"}</b><span>우선 검토 점수 {x.score}</span></div>
    <a className="dfMediaOriginal" href={x.original_url} target="_blank" rel="noopener noreferrer">언론사 원문 보기 <span>↗</span></a>
    <label className="dfMediaOfficialLabel">공식 근거 URL<input type="url" placeholder="https://... 정부·지자체·시행기관 자료" value={official[x.id]??x.verified_official_url??""} onChange={e=>setOfficial(s=>({...s,[x.id]:e.target.value}))}/></label>
    <div className="dfMediaActions"><button disabled={!!busy} onClick={()=>mark(x,"reviewing")}>사실 확인 중</button><button disabled={!!busy} onClick={()=>mark(x,"verified")}>공식 근거 확인</button><button disabled={!!busy} onClick={()=>mark(x,"rejected")}>제외</button></div>
    {x.review_status==="verified"&&x.verified_official_url&&<a className="dfMediaWrite" href={"/focus-admin/write?mediaLead="+encodeURIComponent(x.id)}>확인한 자료로 자체 기사 작성 →</a>}
   </article>)}</div>}
   {!loading&&filtered.length>limit&&<button className="adminSecondary dfMediaMore" onClick={()=>setLimit(x=>x+30)}>후보 더 보기 ({filtered.length-limit}건 남음)</button>}
  </section>
  <DFAdminBottomNav active="editor"/>
 </main>;
}