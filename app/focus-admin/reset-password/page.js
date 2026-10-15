"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader}from"../../../components/df-shell";
export default function ResetPassword(){
 const[password,setPassword]=useState(""),[confirm,setConfirm]=useState(""),[ready,setReady]=useState(false),[checking,setChecking]=useState(true),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 useEffect(()=>{
  let live=true;
  async function verify(){
   try{
    const{data:{user},error}=await dfSupabase.auth.getUser();
    if(!live)return;
    if(error||!user){setReady(false);setNotice("재설정 링크가 만료됐거나 인증되지 않았습니다. 로그인 화면에서 새 링크를 요청해 주세요.");return;}
    const{data:role,error:roleError}=await dfSupabase.from("df_admin_roles").select("role").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
    if(!live)return;
    if(roleError||!role){setReady(false);setNotice("관리자 계정만 비밀번호를 변경할 수 있습니다.");return}
    setReady(true);setNotice("");
   }catch{if(live){setReady(false);setNotice("인증 정보를 확인할 수 없습니다.")}}
   finally{if(live)setChecking(false)}
  }
  const{data:{subscription}}=dfSupabase.auth.onAuthStateChange(event=>{
   if(event==="PASSWORD_RECOVERY"||event==="SIGNED_IN"||event==="INITIAL_SESSION")setTimeout(verify,0);
  });
  verify();
  return()=>{live=false;subscription.unsubscribe()};
 },[]);
 async function save(e){
  e.preventDefault();
  if(!ready||busy||password.length<8||password.length>128||password!==confirm)return;
  setBusy(true);setNotice("");
  try{
   const{data:{user},error:userError}=await dfSupabase.auth.getUser();
   if(userError||!user)throw new Error("인증 세션이 만료됐습니다. 재설정 링크를 다시 요청하세요.");
   const{data:role,error:roleError}=await dfSupabase.from("df_admin_roles").select("role").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
   if(roleError||!role)throw new Error("관리자 권한이 확인되지 않습니다.");
   const{error}=await dfSupabase.auth.updateUser({password});
   if(error)throw error;
   setPassword("");setConfirm("");
   await dfSupabase.auth.signOut();
   location.replace("/focus-admin/login?reset=ok");
  }catch(err){setNotice(err.message||"비밀번호 변경에 실패했습니다.");setBusy(false)}
 }
 return <main className="adminShell dfAdminUnified dfAdminPasswordLogin"><DFAdminHeader title="비밀번호 재설정" kicker="DOSIMAEK" back="/focus-admin/login"/>
 <section className="dfAdminLoginHero"><small>SECURE RECOVERY</small><h1>새 관리자 비밀번호</h1><p>메일에 도착한 인증 링크를 연 뒤 새 비밀번호를 설정해 주세요.</p></section>
 <section className="adminPanel formPanel dfAdminPasswordPanel">
  {checking?<p className="adminDataNote" role="status">관리자 인증 링크 확인 중…</p>:ready?<form onSubmit={save}>
   <label htmlFor="df-new-admin-pass">새 비밀번호</label><input id="df-new-admin-pass" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="8자 이상"/>
   <label htmlFor="df-confirm-admin-pass">새 비밀번호 확인</label><input id="df-confirm-admin-pass" type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirm} onChange={e=>setConfirm(e.target.value)} placeholder="같은 비밀번호 입력"/>
   <button type="submit" className="adminPrimary" disabled={busy||password.length<8||password!==confirm}>{busy?"변경 중…":"새 비밀번호 저장 →"}</button>
  </form>:<p className="adminDataNote">비밀번호 변경을 위해 관리자 이메일로 받은 최신 재설정 링크를 열어 주세요.</p>}
  {notice&&<p className="dfAdminRecoveryNotice" role="alert">{notice}</p>}
  <a className="adminSecondary dfAdminRecoveryBack" href="/focus-admin/login">로그인 화면으로 돌아가기 →</a>
 </section></main>;
}
