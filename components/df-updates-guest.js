"use client";
import {useEffect,useMemo,useState} from "react";
import {dfSupabase} from "../lib/df-browser";
import {DFAdminHeader,DFAdminBottomNav,DFToast} from "./df-shell";

const agencies=[
["강원특별자치도 자동수집","강원"],["경기도 자동수집","경기"],["경상남도 자동수집","경남"],["경상북도 자동수집","경북"],["과학기술정보통신부","전국"],
["광주광역시 자동수집","광주"],["국민참여입법센터 지방입법예고","전국"],["국토교통부","전국"],["대구광역시 고시·공고","대구"],["대구광역시 자동수집","대구"],
["대전광역시 고시·공고","대전"],["대전광역시 자동수집","대전"],["부산광역시 고시·공고","부산"],["부산광역시 자동수집","부산"],["서울특별시 고시·공고","서울"],
["서울특별시 자동수집","서울"],["세종특별자치시 자동수집","세종"],["울산광역시 고시·공고","울산"],["울산광역시 자동수집","울산"],["인천광역시 고시·공고","인천"],
["인천광역시 자동수집","인천"],["전국 지자체 입법예고(자치법규정보시스템)","전국"],["전라남도 자동수집","전남"],["전북특별자치도 자동수집","전북"],["제주특별자치도 자동수집","제주"],
["충청남도 자동수집","충남"],["충청북도 고시·공고","충북"],["충청북도 자동수집","충북"],["행정안전부","전국"]
];
const d=x=>x?new Date(x).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"}):"발표일 미확인";
const sample=[
{id:"sample-one",source_name:"[시뮬레이션] 예시 지자체",title:"[가상 예시] 도시관리계획 변경 고시",key_content:"개별 고시 본문과 관계도서 대조가 필요한 자료입니다.",key_extract_status:"pending",detail_status:"queued",published_at:null,source_url:null},
{id:"sample-two",source_name:"[시뮬레이션] 예시 공공기관",title:"[가상 예시] 개발계획 변경 입법예고",key_content:"사업면적과 대상구역 수치를 원문과 대조해야 합니다.",key_extract_status:"pending",detail_status:"failed",published_at:null,source_url:null}
];
export default function GuestUpdates(){
 const [records,setRecords]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[mode,setMode]=useState("all");
 const [sim,setSim]=useState({}),[audit,setAudit]=useState([]),[message,setMessage]=useState("");
 async function refresh(){
  setLoading(true);setError("");
  const {data,error}=await dfSupabase.rpc("df_public_development_policy",{p_channel:null,p_topic:null,p_limit:100,p_offset:0});
  if(error)setError("공개자료 조회 실패: "+error.message);
  else setRecords(data||[]);
  setLoading(false);
 }
 useEffect(()=>{refresh()},[]);
 const bySource=useMemo(()=>{
  const map=new Map();
  for(const item of records)map.set(item.source_name,(map.get(item.source_name)||0)+1);
  return map;
 },[records]);
 const all=useMemo(()=>[...records,...sample].filter(x=>mode==="all"||(mode==="pending"&&(!x.key_content||x.key_extract_status!=="ready"))||(mode==="sample"&&x.id.startsWith("sample"))||(mode==="hidden"&&sim[x.id]==="hide")),[mode,records,sim]);
 function collect(){
  const entries=agencies.slice(0,3).map(([name])=>({name,result:"수집 가능 여부 검사",status:"체험 완료"}));
  setAudit(entries);setMessage("시뮬레이션 완료 · 3개 기관 수집 과정을 표시했습니다. 실제 수집·DB 저장은 실행하지 않았습니다.");
 }
 function extract(){
  const steps=[{name:"상세 페이지 열기",status:"체험 완료"},{name:"본문·첨부 확인",status:"가상 자료"},{name:"주요 수치 검증",status:"승인 전 보류"}];
  setAudit(steps);setMessage("원문 검증 흐름을 표시했습니다. 실제 원문 추출 또는 자료 등록은 실행하지 않았습니다.");
 }
 function mark(item,action){
  setSim(prev=>({...prev,[item.id]:action}));
  setAudit(a=>[{name:item.title,status:action==="hide"?"비공개 체험":action==="retry"?"재시도 체험":"승인 체험"},...a].slice(0,12));
  setMessage("화면에서만 "+(action==="hide"?"비공개":action==="retry"?"재시도 예약":"검토 승인")+"를 체험했습니다. 실제 서비스 데이터는 변경되지 않았습니다.");
 }
 const changedCount=Object.keys(sim).length;
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="신규자료 업데이트" kicker="GUEST PREVIEW · NO LOGIN"/>
 <section className="adminPanel">
  <div className="adminSectionTitle"><div><small>READ ONLY · SIMULATION</small><h2>비로그인 통합관제 체험</h2></div><a className="adminSecondary" href="/focus-admin/login">운영자 로그인</a></div>
  <p className="adminDataNote">실제 공개 개발정책을 읽어옵니다. 수집·재시도·승인·비공개 버튼은 시뮬레이션이며 외부 기관에 요청하거나 DB를 변경하지 않습니다.</p>
  <div className="adminStats">
   <div><b>{loading?"—":records.length}</b><span>실제 공개자료</span></div>
   <div><b>{agencies.length}</b><span>연동 대상 기관</span></div>
   <div><b>{sample.length}</b><span>가상 검증대기</span></div>
   <div><b>{changedCount}</b><span>체험 변경</span></div>
  </div>
  {error&&<p className="adminDataNote" role="alert">{error}</p>}
  <div className="dfReviewActions">
   <button className="adminPrimary" disabled={loading} onClick={collect}>기관 수집 체험</button>
   <button className="adminSecondary" disabled={loading} onClick={extract}>원문 추출 체험</button>
   <button className="adminSecondary" onClick={refresh}>실제 공개자료 새로고침</button>
  </div>
  {!!audit.length&&<div className="dfSourceStatus">{audit.map((x,i)=><div key={i}><b>{x.name}</b><span>{x.status} · 시뮬레이션, 서버 미반영</span></div>)}</div>}
 </section>
 <section className="adminPanel"><div className="adminSectionTitle"><div><small>SOURCE DIRECTORY</small><h2>연동 대상 기관</h2></div><span>{agencies.length}개</span></div>
  <div className="dfSourceStatus">{agencies.map(([name,region])=><div key={name}><b>{name}</b><span>{region} · 현재 공개자료 {bySource.get(name)||0}건 · 실제 수집 상태는 운영자 로그인 후 확인</span></div>)}</div>
 </section>
 <section className="adminPanel">
  <div className="adminSectionTitle"><div><small>DOCUMENT REVIEW</small><h2>검수·공개 흐름</h2></div><span>{all.length}건</span></div>
  <div className="statTabs">{[["all","전체"],["pending","원문 대기"],["sample","가상 예시"],["hidden","체험 비공개"]].map(([k,v])=><button key={k} className={mode===k?"on":""} onClick={()=>setMode(k)}>{v}</button>)}</div>
  <div className="dfSourceList">{all.map(x=><article key={x.id}><div>
   <small>{x.source_name||"공식기관"} · {x.id.startsWith("sample")?"가상 예시":"실제 공개자료"} · {sim[x.id]?"체험: "+sim[x.id]:"실제 DB 변경 없음"}</small>
   <b>{x.title}</b><span>{d(x.published_at)}</span><p>{(x.key_content||"확인된 핵심 요약이 없습니다.").slice(0,260)}</p>
  </div><div className="dfReviewActions">
   {x.source_url&&<a className="adminSecondary" href={x.source_url} target="_blank" rel="noreferrer">공식 원문 ↗</a>}
   <button className="adminSecondary" onClick={()=>mark(x,"retry")}>재시도 체험</button>
   <button className="adminSecondary" onClick={()=>mark(x,"hide")}>비공개 체험</button>
   <button className="adminPrimary" onClick={()=>mark(x,"approve")}>승인 체험</button>
  </div></article>)}
  {!loading&&!all.length&&<div className="adminEmpty">해당 조건에 맞는 자료가 없습니다.</div>}</div>
 </section>
 <DFToast message={message} onClose={()=>setMessage("")}/><DFAdminBottomNav active="system"/></main>;
}
