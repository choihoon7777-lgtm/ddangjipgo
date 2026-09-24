"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../lib/df-browser";
import{DFSubHeader,DFBottomNav}from"../../components/df-shell";

export default function Login(){
 const[email,setEmail]=useState(""),[password,setPassword]=useState(""),[mode,setMode]=useState("login"),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");\n const safeNext=()=>{const raw=new URLSearchParams(location.search).get("next")||"/my";return raw.startsWith("/")&&!raw.startsWith("//")?raw:"/my"};
 useEffect(()=>{(async()=>{const{data:{user}}=await dfSupabase.auth.getUser();if(user){location.replace(safeNext())}})()},[]);
 async function submit(){
  setBusy(true);setMsg("");
  try{
   if(!email.trim()||password.length<8)throw new Error("이메일과 8자 이상 비밀번호를 입력하세요.");
   if(mode==="login"){
    const{error}=await dfSupabase.auth.signInWithPassword({email:email.trim().toLowerCase(),password});if(error)throw error;
    location.replace(safeNext());
   }else{
    const{data,error}=await dfSupabase.auth.signUp({email:email.trim().toLowerCase(),password});if(error)throw error;
    if(data.session){location.replace("/my");return}
    setMsg("가입 요청이 완료됐습니다. 이메일 확인이 필요한 경우 받은 메일의 링크를 누른 뒤 로그인하세요.");setMode("login");
   }
  }catch(e){setMsg(e.message||"로그인 처리 중 오류가 발생했습니다.")}finally{setBusy(false)}
 }
 return <main className="focusShell dfHigh"><DFSubHeader title="로그인" kicker="MY FOCUS" back="/my" right={null}/>
 <section className="dfMyHero"><small>PERSONAL FOCUS</small><h1>관심 부동산과 기사를<br/>내 계정에 저장합니다.</h1><p>땅짚고 관심부동산·알림·저장기사·최근 본 기사를 한 계정에서 관리합니다.</p></section>
 <section className="adminPanel formPanel">
  <div className="dfLoginMode"><button className={mode==="login"?"on":""} onClick={()=>setMode("login")}>로그인</button><button className={mode==="signup"?"on":""} onClick={()=>setMode("signup")}>회원가입</button></div>
  <label>이메일<input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email"/></label>
  <label>비밀번호<input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={mode==="login"?"current-password":"new-password"} placeholder="8자 이상"/></label>
  <button className="adminPrimary" disabled={busy||!email.trim()||password.length<8} onClick={submit}>{busy?"처리 중…":mode==="login"?"로그인":"회원가입"}</button>
  {msg&&<div className="editorGate"><span>{msg}</span></div>}
 </section><DFBottomNav active="my"/></main>
}