"use client";import{useState}from"react";
const SAMPLE=`[공식자료] 국토교통부 보도자료
제목: 청년·고령자·양육가구 등 수요자 맞춤형 특화주택 공모
담당부서: 청년주거정책과
등록일: 2026-09-20 11:00
공식 요지: 9월 21일부터 특화주택 공모를 시작한다. 주거에 돌봄·복지·일자리 서비스를 연계해 수요자 맞춤형 주거지원을 강화한다.
관련 국정과제: 63. 두텁고 촘촘한 주거복지 실현
출처: 국토교통부 공식 보도자료
공식URL: https://www.molit.go.kr/USR/NEWS/m_71/dtl.jsp?id=95092441
주의: 위 내용 외 숫자·유형·일정·평가를 임의로 추가하지 말 것.`;
export default function AITest(){const[s,setS]=useState(""),[r,setR]=useState(null),[loading,setLoading]=useState(false);async function run(){setLoading(true);setR(null);try{const x=await fetch("/api/focus-ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({source:s})});setR(await x.json())}catch(e){setR({error:e.message})}finally{setLoading(false)}}return <main className="adminShell"><header className="subHead"><a href="/focus-admin">←</a><div><b>AI 편집국 테스트</b><small>OFFICIAL SOURCE → FACT → REPORTER → DESK → VERIFY</small></div></header><section className="adminPanel formPanel"><button className="adminSecondary" onClick={()=>setS(SAMPLE)}>국토부 공식자료 불러오기</button><label>공식자료 원문<textarea value={s} onChange={e=>setS(e.target.value)} placeholder="정부·지자체·공공기관·공시 등 1차 공식자료 원문을 넣으세요."/></label><button className="adminPrimary" disabled={loading||s.trim().length<80} onClick={run}>{loading?"FACT → 기자 → 데스크 → 검증 진행 중…":"AI 기사 생성 테스트"}</button></section>{r&&<section className="adminPanel">{r.error?<div className="editorGate"><b>확인 필요</b><span>{r.error}</span></div>:<><h2>최종 기사</h2><pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",lineHeight:1.75}}>{r.article}</pre><h3>검증 결과</h3><pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit",lineHeight:1.6}}>{r.verification}</pre><details><summary>FACT 추출 결과</summary><pre style={{whiteSpace:"pre-wrap",fontFamily:"inherit"}}>{r.fact}</pre></details></>}</section>}</main>}