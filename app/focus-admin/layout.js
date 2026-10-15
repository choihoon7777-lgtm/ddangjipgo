"use client";
import{useEffect,useState}from"react";
import{usePathname}from"next/navigation";
import DFAdminGuestPreview from"../../components/df-admin-guest-preview";

// All management screens are available for visual testing without login.
// Operational pages are never mounted for anonymous or unauthorized visitors.
// Supabase RLS and privileged server routes retain their existing protections.
const publicPages=new Set(["/focus-admin","/focus-admin/updates","/focus-admin/blog-import","/focus-admin/login","/focus-admin/reset-password"]);
export default function FocusAdminLayout({children}){
 const path=usePathname()||"/focus-admin";
 const publicPage=publicPages.has(path);
 const[auth,setAuth]=useState(publicPage?"public":"checking");
 useEffect(()=>{let live=true;if(publicPage){setAuth("public");return()=>{live=false}}
  setAuth("checking");
  (async()=>{try{
   const{dfSupabase}=await import("../../lib/df-browser");
   const{data:{user}}=await dfSupabase.auth.getUser();
   if(!live)return;
   if(!user){setAuth("guest");return}
   const{data,error}=await dfSupabase.from("df_admin_roles").select("role").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
   if(live)setAuth(!error&&data?"admin":"guest");
  }catch{if(live)setAuth("guest")}})();
  return()=>{live=false}
 },[path,publicPage]);
 if(publicPage)return children;
 if(auth==="admin")return children;
 if(auth==="guest")return <DFAdminGuestPreview path={path}/>;
 return <main className="adminShell dfAdminUnified"><section className="dfAdminAuthState"><b>관리자 페이지 준비 중</b><span>로그인 없이 모든 메뉴를 검수할 수 있습니다.</span></section></main>;
}