"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader}from"../../../components/df-shell";

export default function Login(){
 const[email,setEmail]=useState(""),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);

 useEffect(()=>{let live=true;(async()=>{
  const{data:{user}}=await dfSupabase.auth.getUser();
  if(!live||!user)return;
  setBusy(true);setMsg("편집국 권한을 연결하고 있습니다.");
  try{
   const claim=await dfSupabase.rpc("df_claim_admin_invite");
   if(claim.error&&!String(claim.error.message).includes("no active admin invite"))throw claim.error;
   const{data:role,error}=await dfSupabase.from("df_admin_roles").select("role,is_active").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
   if(error)throw error;
   if(!role)throw new Error("편집국 권한이 확인되지 않습니다.");
   location.replace("/focus-admin");
  }catch(e){setMsg(e.message||"편집국 권한 확인에 실패했습니다.");setBusy(false)}
 })();return()=>{live=false}},[]);

 async function sendLink(){
  setBusy(true);setMsg("");
  try{
   const normalized=email.trim().toLowerCase();
   if(!normalized)throw new Error("이메일을 입력하세요.");
   const{data:allowed,error:gateError}=await dfSupabase.rpc("df_can_request_admin_otp",{p_email:normalized});
   if(gateError)throw gateError;
   if(!allowed)throw new Error("편집국 초대 또는 활성 권한이 확인되지 않는 이메일입니다.");

   const redirectTo=window.location.origin+"/focus-admin/login";
   const{error}=await dfSupabase.auth.signInWithOtp({
    email:normalized,
    options:{shouldCreateUser:true,emailRedirectTo:redirectTo}
   });
   if(error)throw error;
   setMsg("로그인 링크를 이메일로 보냈습니다. 메일에서 링크를 누르면 바로 편집국으로 들어갑니다.");
  }catch(e){setMsg(e.message||"로그인 링크 발송에 실패했습니다.")}finally{setBusy(false)}
 }

 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="편집국 로그인" kicker="MAGIC LINK" back="/my"/>
 <section className="dfAdminLoginHero"><small>DEVELOPMENT FOCUS</small><h1>비밀번호 없이<br/>메일 링크로 바로 입장</h1><p>승인된 편집국 운영자 이메일로 로그인 링크를 보냅니다. 메일에서 한 번 누르면 바로 운영센터로 들어갑니다.</p></section>
 <section className="adminPanel formPanel">
  <label>이메일<input value={email} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" placeholder="초대받은 이메일"/></label>
  <button className="adminPrimary" disabled={busy||!email.trim()} onClick={sendLink}>{busy?"확인 중…":"로그인 링크 받기"}</button>
  {msg&&<div className="editorGate"><span>{msg}</span></div>}
  <p className="adminDataNote">비밀번호·인증코드 설정이 필요 없습니다. 초대된 이메일에서 로그인 링크만 누르면 됩니다.</p>
 </section></main>
}