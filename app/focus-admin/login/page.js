"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader}from"../../../components/df-shell";

export default function Login(){
 const[email,setEmail]=useState(""),[password,setPassword]=useState(""),[confirm,setConfirm]=useState(""),[mode,setMode]=useState("setup"),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);

 useEffect(()=>{let live=true;(async()=>{
  const{data:{user}}=await dfSupabase.auth.getUser();
  if(!live||!user)return;
  const{data:role}=await dfSupabase.from("df_admin_roles").select("role,is_active").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
  if(role)location.replace("/focus-admin");
 })();return()=>{live=false}},[]);

 async function verifyAllowed(normalized){
  const{data:allowed,error}=await dfSupabase.rpc("df_can_request_admin_otp",{p_email:normalized});
  if(error)throw error;
  if(!allowed)throw new Error("편집국 초대 또는 활성 권한이 확인되지 않는 이메일입니다.");
 }

 async function claimAndEnter(){
  const claim=await dfSupabase.rpc("df_claim_admin_invite");
  if(claim.error&&!String(claim.error.message).includes("no active admin invite"))throw claim.error;
  const{data:{user}}=await dfSupabase.auth.getUser();
  if(!user)throw new Error("로그인 세션을 확인하지 못했습니다.");
  const{data:role,error}=await dfSupabase.from("df_admin_roles").select("role,is_active").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
  if(error)throw error;
  if(!role){await dfSupabase.auth.signOut();throw new Error("편집국 권한이 확인되지 않습니다.");}
  location.replace("/focus-admin");
 }

 async function submit(){
  setBusy(true);setMsg("");
  try{
   const normalized=email.trim().toLowerCase();
   if(!normalized)throw new Error("이메일을 입력하세요.");
   if(password.length<8)throw new Error("비밀번호는 8자 이상으로 설정하세요.");
   await verifyAllowed(normalized);

   if(mode==="setup"){
    if(password!==confirm)throw new Error("비밀번호가 서로 다릅니다.");
    const{data,error}=await dfSupabase.auth.signUp({email:normalized,password});
    if(error)throw error;
    if(data?.session){
      await claimAndEnter();
      return;
    }
    setMsg("비밀번호 설정 요청이 완료됐습니다. 확인 메일이 오면 메일의 링크를 한 번 누른 뒤, 이 화면에서 로그인하세요.");
    setMode("login");setPassword("");setConfirm("");
   }else{
    const{error}=await dfSupabase.auth.signInWithPassword({email:normalized,password});
    if(error)throw error;
    await claimAndEnter();
   }
  }catch(e){setMsg(e.message||"처리 중 오류가 발생했습니다.")}finally{setBusy(false)}
 }

 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="편집국 로그인" kicker="PASSWORD ACCESS" back="/my"/>
 <section className="dfAdminLoginHero"><small>DEVELOPMENT FOCUS</small><h1>{mode==="setup"?"처음 한 번만\n비밀번호를 설정하세요":"편집국 운영센터\n로그인"}</h1><p>{mode==="setup"?"초대된 이메일로 편집국 전용 비밀번호를 만들면 이후부터 바로 로그인할 수 있습니다.":"등록한 이메일과 비밀번호로 편집국 운영센터에 들어갑니다."}</p></section>
 <section className="adminPanel formPanel">
  <div className="dfLoginMode"><button className={mode==="setup"?"on":""} onClick={()=>{setMode("setup");setMsg("");setPassword("");setConfirm("")}}>처음 비밀번호 설정</button><button className={mode==="login"?"on":""} onClick={()=>{setMode("login");setMsg("");setPassword("");setConfirm("")}}>로그인</button></div>
  <label>이메일<input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" placeholder="초대받은 이메일"/></label>
  <label>{mode==="setup"?"새 비밀번호":"비밀번호"}<input value={password} onChange={e=>setPassword(e.target.value)} type="password" autoComplete={mode==="setup"?"new-password":"current-password"} placeholder="8자 이상"/></label>
  {mode==="setup"&&<label>비밀번호 확인<input value={confirm} onChange={e=>setConfirm(e.target.value)} type="password" autoComplete="new-password" placeholder="같은 비밀번호 다시 입력"/></label>}
  <button className="adminPrimary" disabled={busy||!email.trim()||password.length<8||(mode==="setup"&&confirm.length<8)} onClick={submit}>{busy?"확인 중…":mode==="setup"?"비밀번호 설정":"로그인"}</button>
  {msg&&<div className="editorGate"><span>{msg}</span></div>}
  <p className="adminDataNote">편집국 초대 또는 활성 권한이 있는 이메일만 사용할 수 있습니다. 비밀번호는 서버에 평문으로 저장되지 않고 Supabase Auth가 관리합니다.</p>
 </section></main>
}