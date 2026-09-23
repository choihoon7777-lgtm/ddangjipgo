"use client";
import{useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader}from"../../../components/df-shell";

export default function Login(){
 const[email,setEmail]=useState(""),[code,setCode]=useState(""),[step,setStep]=useState("email"),[msg,setMsg]=useState(""),[busy,setBusy]=useState(false);

 async function sendCode(){
  setBusy(true);setMsg("");
  try{
   const normalized=email.trim().toLowerCase();
   if(!normalized)throw new Error("이메일을 입력하세요.");
   const{data:allowed,error:gateError}=await dfSupabase.rpc("df_can_request_admin_otp",{p_email:normalized});
   if(gateError)throw gateError;
   if(!allowed)throw new Error("편집국 초대 또는 활성 권한이 확인되지 않는 이메일입니다.");

   const{error}=await dfSupabase.auth.signInWithOtp({
    email:normalized,
    options:{shouldCreateUser:true}
   });
   if(error)throw error;
   setStep("code");
   setMsg("이메일로 인증코드를 보냈습니다.");
  }catch(e){setMsg(e.message||"인증코드 발송에 실패했습니다.")}finally{setBusy(false)}
 }

 async function verifyCode(){
  setBusy(true);setMsg("");
  try{
   const token=code.replace(/\s/g,"").trim();
   if(token.length<6)throw new Error("이메일로 받은 인증코드를 입력하세요.");
   const{data,error}=await dfSupabase.auth.verifyOtp({
    email:email.trim().toLowerCase(),
    token,
    type:"email"
   });
   if(error)throw error;
   if(!data?.session)throw new Error("로그인 세션을 만들지 못했습니다.");

   const claim=await dfSupabase.rpc("df_claim_admin_invite");
   if(claim.error&&!String(claim.error.message).includes("no active admin invite"))throw claim.error;

   const{data:role}=await dfSupabase.from("df_admin_roles").select("role,is_active").eq("profile_id",data.user.id).eq("is_active",true).maybeSingle();
   if(!role){await dfSupabase.auth.signOut();throw new Error("편집국 권한이 확인되지 않습니다.");}
   location.href="/focus-admin";
  }catch(e){setMsg(e.message||"인증코드 확인에 실패했습니다.")}finally{setBusy(false)}
 }

 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="편집국 로그인" kicker="EMAIL OTP" back="/my"/>
 <section className="dfAdminLoginHero"><small>DEVELOPMENT FOCUS</small><h1>비밀번호 없이<br/>이메일 인증코드로 로그인</h1><p>승인된 편집국 운영자 이메일로 인증코드를 보내고, 코드 확인 후 바로 운영센터에 들어갑니다.</p></section>
 <section className="adminPanel formPanel">
  <label>이메일<input value={email} disabled={step==="code"} onChange={e=>setEmail(e.target.value)} type="email" autoComplete="email" placeholder="초대받은 이메일"/></label>
  {step==="code"&&<label>인증코드<input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,8))} inputMode="numeric" autoComplete="one-time-code" placeholder="이메일 인증코드"/></label>}
  {step==="email"
   ?<button className="adminPrimary" disabled={busy||!email.trim()} onClick={sendCode}>{busy?"발송 중…":"인증코드 받기"}</button>
   :<button className="adminPrimary" disabled={busy||code.trim().length<6} onClick={verifyCode}>{busy?"확인 중…":"인증코드 확인하고 로그인"}</button>}
  {step==="code"&&<div className="dfOtpActions"><button className="adminSecondary" disabled={busy} onClick={sendCode}>인증코드 다시 받기</button><button className="adminSecondary" disabled={busy} onClick={()=>{setStep("email");setCode("");setMsg("")}}>이메일 변경</button></div>}
  {msg&&<div className="editorGate"><span>{msg}</span></div>}
  <p className="adminDataNote">비밀번호는 사용하지 않습니다. 편집국 초대 또는 활성 권한이 있는 이메일만 인증코드를 요청할 수 있습니다.</p>
 </section></main>
}