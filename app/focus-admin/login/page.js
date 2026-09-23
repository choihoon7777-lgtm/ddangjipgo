"use client";
import{useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader}from"../../../components/df-shell";
export default function Login(){
 const[email,setEmail]=useState(""),[password,setPassword]=useState(""),[mode,setMode]=useState("login"),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);
 async function go(){setBusy(true);setMsg("");try{let res;if(mode==="signup")res=await dfSupabase.auth.signUp({email,password});else res=await dfSupabase.auth.signInWithPassword({email,password});if(res.error)throw res.error;if(mode==="signup"&&!res.data.session){setMsg("가입 확인 메일이 발송됐다면 메일 인증 후 로그인하세요.");return}const claim=await dfSupabase.rpc("df_claim_admin_invite");if(claim.error&&!String(claim.error.message).includes("no active admin invite"))throw claim.error;location.href="/focus-admin"}catch(e){setMsg(e.message||"로그인에 실패했습니다.")}finally{setBusy(false)}}
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="편집국 로그인" kicker="ADMIN ACCESS" back="/my"/>
 <section className="dfAdminLoginHero"><small>DEVELOPMENT FOCUS</small><h1>편집국 운영센터</h1><p>승인된 관리자만 기사·광고·정정·통계 운영에 접근합니다.</p></section>
 <section className="adminPanel formPanel"><label>이메일<input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email"/></label><label>비밀번호<input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete={mode==="login"?"current-password":"new-password"}/></label><button className="adminPrimary" disabled={busy||!email||password.length<6} onClick={go}>{busy?"확인 중…":mode==="login"?"로그인":"관리자 계정 만들기"}</button>{msg&&<div className="editorGate"><span>{msg}</span></div>}<button className="adminSecondary" onClick={()=>{setMode(mode==="login"?"signup":"login");setMsg("")}}>{mode==="login"?"처음이면 관리자 계정 만들기":"이미 계정이 있으면 로그인"}</button></section></main>
}