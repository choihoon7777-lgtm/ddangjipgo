"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader}from"../../../components/df-shell";

export default function Login(){
 const[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const[mailBusy,setMailBusy]=useState(false),[mailNotice,setMailNotice]=useState("");
 const[advanced,setAdvanced]=useState(false),[email,setEmail]=useState(""),[legacyPassword,setLegacyPassword]=useState(""),[confirm,setConfirm]=useState(""),[mode,setMode]=useState("login"),[legacyBusy,setLegacyBusy]=useState(false);
 useEffect(()=>{if(typeof window!=="undefined"&&new URLSearchParams(window.location.search).get("reset")==="ok")setMsg("비밀번호가 변경됐습니다. 새 비밀번호로 로그인하세요.");let live=true;(async()=>{
  const{data:{user}}=await dfSupabase.auth.getUser();
  if(!live||!user)return;
  const{data:role}=await dfSupabase.from("df_admin_roles").select("role").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
  if(live&&role)location.replace("/focus-admin/publish");
 })();return()=>{live=false}},[]);

 // Password only on screen. The server chooses the one configured, verified admin account.
 async function passwordLogin(e){
  e.preventDefault();if(busy||password.length<8)return;
  setBusy(true);setMsg("");
  try{
   const response=await fetch("/api/focus-admin-password",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({password}),cache:"no-store"});
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw new Error(response.status===429?"로그인 시도가 많습니다. 잠시 후 다시 시도하세요.":result.error||"로그인할 수 없습니다.");
   if(!result.access_token||!result.refresh_token)throw new Error("로그인 세션을 확인하지 못했습니다.");
   const{error}=await dfSupabase.auth.setSession({access_token:result.access_token,refresh_token:result.refresh_token});
   if(error)throw error;
   setPassword("");location.replace("/focus-admin/publish");
  }catch(err){setMsg(err.message||"비밀번호를 확인해 주세요.");setPassword("")}finally{setBusy(false)}
 }
 async function sendRecovery(){
  if(mailBusy)return;
  setMailBusy(true);setMailNotice("");
  try{
   const res=await fetch("/api/focus-admin-recovery",{method:"POST",headers:{"Content-Type":"application/json"},body:"{}",cache:"no-store"});
   const body=await res.json().catch(()=>({}));
   if(!res.ok)throw new Error(res.status===429?"재설정 메일을 이미 요청했습니다. 잠시 후 다시 시도하세요.":body.error||"재설정 메일을 보내지 못했습니다.");
   setMailNotice("관리자 등록 이메일로 비밀번호 재설정 링크를 요청했습니다. 받은편지함과 스팸함을 확인해 주세요.");
  }catch(err){setMailNotice(err.message||"메일 요청 중 오류가 발생했습니다.")}finally{setMailBusy(false)}
 }
 async function verifyAllowed(normalized){
  const{data:allowed,error}=await dfSupabase.rpc("df_can_request_admin_otp",{p_email:normalized});
  if(error)throw error;
  if(!allowed)throw new Error("운영센터 초대 또는 활성 권한이 확인되지 않는 이메일입니다.");
 }
 async function claimAndEnter(){
  const claim=await dfSupabase.rpc("df_claim_admin_invite");
  if(claim.error&&!String(claim.error.message).includes("no active admin invite"))throw claim.error;
  const{data:{user}}=await dfSupabase.auth.getUser();
  if(!user)throw new Error("로그인 세션을 확인하지 못했습니다.");
  const{data:role,error}=await dfSupabase.from("df_admin_roles").select("role").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
  if(error)throw error;
  if(!role){await dfSupabase.auth.signOut();throw new Error("운영센터 권한이 확인되지 않습니다.");}
  location.replace("/focus-admin/publish");
 }
 async function legacySubmit(e){
  e.preventDefault();setLegacyBusy(true);setMsg("");
  try{
   const normalized=email.trim().toLowerCase();
   if(!normalized)throw new Error("이메일을 입력하세요.");
   if(legacyPassword.length<8)throw new Error("비밀번호는 8자 이상으로 설정하세요.");
   await verifyAllowed(normalized);
   if(mode==="setup"){
    if(legacyPassword!==confirm)throw new Error("비밀번호가 서로 다릅니다.");
    const{data,error}=await dfSupabase.auth.signUp({email:normalized,password:legacyPassword});
    if(error)throw error;
    if(data?.session){await claimAndEnter();return;}
    setMsg("확인 메일의 링크를 누른 뒤 이 화면에서 로그인하세요.");
    setMode("login");setLegacyPassword("");setConfirm("");
   }else{
    const{error}=await dfSupabase.auth.signInWithPassword({email:normalized,password:legacyPassword});
    if(error)throw error;
    await claimAndEnter();
   }
  }catch(err){setMsg(err.message||"로그인 오류")}finally{setLegacyBusy(false)}
 }
 return <main className="adminShell dfAdminUnified dfAdminPasswordLogin"><DFAdminHeader title="운영센터 로그인" kicker="DOSIMAEK" back="/focus-admin"/>
  <section className="dfAdminLoginHero"><small>NEWSROOM ACCESS</small><h1>관리자 로그인</h1><p>기존 관리자 비밀번호를 입력하면 바로 기사 검토·발행 화면으로 이동합니다.</p></section>
  <section className="adminPanel formPanel dfAdminPasswordPanel">
   <form onSubmit={passwordLogin}>
    <label htmlFor="df-admin-single-password">관리자 비밀번호</label>
    <input id="df-admin-single-password" type="password" autoComplete="current-password" autoFocus value={password} onChange={e=>setPassword(e.target.value)} placeholder="비밀번호를 입력하세요" minLength={8} maxLength={128} required/>
    <button type="submit" className="adminPrimary" disabled={busy||password.length<8}>{busy?"확인 중…":"관리자 로그인 →"}</button>
   </form>
   <p className="adminDataNote">이메일 입력은 필요 없습니다. 기존 관리자 계정의 비밀번호를 사용합니다.</p>
   <button type="button" className="dfAdminRecoveryButton" disabled={mailBusy} onClick={sendRecovery}>{mailBusy?"메일 요청 중…":"비밀번호를 모르겠어요 · 재설정 메일 받기 →"}</button>
   {mailNotice&&<p className="dfAdminRecoveryNotice" role="status">{mailNotice}</p>}
   {msg&&<div className="editorGate" role="alert"><span>{msg}</span></div>}
   <details className="dfAdminLoginRecovery" open={advanced} onToggle={e=>setAdvanced(e.currentTarget.open)}>
    <summary>처음 설정하거나 다른 관리자 계정으로 로그인</summary>
    <form onSubmit={legacySubmit}>
     <div className="dfLoginMode"><button type="button" className={mode==="login"?"on":""} onClick={()=>{setMode("login");setMsg("")}}>기존 계정 로그인</button><button type="button" className={mode==="setup"?"on":""} onClick={()=>{setMode("setup");setMsg("")}}>처음 비밀번호 설정</button></div>
     <label htmlFor="df-admin-email">초대받은 이메일</label><input id="df-admin-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="초대된 관리자 이메일"/>
     <label htmlFor="df-admin-legacy-password">{mode==="setup"?"새 비밀번호":"비밀번호"}</label><input id="df-admin-legacy-password" type="password" autoComplete={mode==="setup"?"new-password":"current-password"} value={legacyPassword} onChange={e=>setLegacyPassword(e.target.value)} minLength={8} required placeholder="8자 이상"/>
     {mode==="setup"&&<><label htmlFor="df-admin-confirm">비밀번호 확인</label><input id="df-admin-confirm" type="password" autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} minLength={8} required/></>}
     <button type="submit" className="adminSecondary" disabled={legacyBusy||!email.trim()||legacyPassword.length<8||(mode==="setup"&&confirm.length<8)}>{legacyBusy?"확인 중…":mode==="setup"?"비밀번호 설정":"이메일 계정으로 로그인"}</button>
    </form>
   </details>
  </section>
  <p className="adminDataNote">로그인 없이 화면만 확인하려면 <a href="/focus-admin/publish">기사 발행 검수 모드 →</a></p>
 </main>;
}
