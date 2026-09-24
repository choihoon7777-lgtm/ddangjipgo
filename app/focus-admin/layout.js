"use client";
import{useEffect,useState}from"react";
import{usePathname}from"next/navigation";
import{dfSupabase}from"../../lib/df-browser";

export default function FocusAdminLayout({children}){
 const path=usePathname();
 const[status,setStatus]=useState(path==="/focus-admin/login"?"ready":"checking");
 useEffect(()=>{let live=true;if(path==="/focus-admin/login"){setStatus("ready");return()=>{live=false}};(async()=>{
   const{data:{user}}=await dfSupabase.auth.getUser();
   if(!live)return;
   if(!user){location.replace("/focus-admin/login");return}
   const{data,error}=await dfSupabase.from("df_admin_roles").select("role,is_active").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
   if(!live)return;
   if(error||!data){await dfSupabase.auth.signOut();location.replace("/focus-admin/login?denied=1");return}
   setStatus("ready");
 })();return()=>{live=false}},[path]);
 if(status!=="ready")return <main className="adminShell dfAdminUnified"><section className="dfAdminAuthState"><b>운영센터 권한을 확인하고 있습니다.</b><span>승인된 운영 계정만 접근할 수 있습니다.</span></section></main>;
 return children;
}