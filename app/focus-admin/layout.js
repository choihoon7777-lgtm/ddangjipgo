"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";
import {dfSupabase} from "../../lib/df-browser";

// Only the overview and the update control room expose a public, read-only guest preview.
// Every other operational admin page still requires a valid admin session and RLS.
const guestPages=new Set(["/focus-admin","/focus-admin/updates","/focus-admin/login"]);
export default function FocusAdminLayout({children}){
 const path=usePathname();
 const [status,setStatus]=useState(guestPages.has(path)?"ready":"checking");
 useEffect(()=>{
  let alive=true;
  if(guestPages.has(path)){setStatus("ready");return()=>{alive=false}};
  setStatus("checking");
  (async()=>{
   const{data:{user}}=await dfSupabase.auth.getUser();
   if(!alive)return;
   if(!user){location.replace("/focus-admin/login");return}
   const{data,error}=await dfSupabase.from("df_admin_roles").select("role,is_active").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
   if(!alive)return;
   if(error||!data){location.replace("/focus-admin/login?denied=1");return}
   setStatus("ready");
  })();
  return()=>{alive=false};
 },[path]);
 if(status!=="ready")return <main className="adminShell dfAdminUnified"><section className="dfAdminAuthState"><b>관리자 권한 확인 중</b><span>실제 자료 변경은 승인된 운영 계정만 가능합니다.</span></section></main>;
 return children;
}
