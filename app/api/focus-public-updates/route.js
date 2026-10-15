import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic="force-dynamic";
export const revalidate=0;
export const maxDuration=30;

const BASE="https://svafsvyjjufbqvxzoqee.supabase.co";
const KEY="sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud";
const upstream=BASE+"/functions/v1/df-public-update";
const json=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store, max-age=0","Vary":"Authorization"}});
const badAuth=()=>json({error:"관리자 로그인이 필요합니다."},401);
async function verifiedOperator(req){
 const header=req.headers.get("authorization")||"";
 if(!/^Bearer [A-Za-z0-9._~+\/-]+$/.test(header)||header.length>8192)return {code:401};
 const token=header.slice(7);
 const db=createClient(BASE,KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:"Bearer "+token}}});
 const {data:{user},error:userError}=await db.auth.getUser(token);
 if(userError||!user)return {code:401};
 const {data:role,error:roleError}=await db.from("df_admin_roles").select("role").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
 if(roleError)return {code:503};
 if(!role)return {code:403};
 return {code:200};
}

async function readJson(response){
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(typeof body.error==="string"?body.error:"공식자료 서버 응답 오류");
 return body;
}
async function fetchWithDeadline(url,options={},ms=14000){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),ms);
 try{return await fetch(url,{...options,signal:controller.signal,cache:"no-store"})}
 finally{clearTimeout(timer)}
}
export async function GET(){
 const [health,publicDocs,factory]=await Promise.allSettled([
  fetchWithDeadline(upstream,{headers:{Accept:"application/json"}}).then(readJson),
  fetchWithDeadline(BASE+"/rest/v1/rpc/df_public_development_policy",{
   method:"POST",
   headers:{"Content-Type":"application/json","apikey":KEY,"Authorization":"Bearer "+KEY},
   body:JSON.stringify({p_channel:null,p_topic:null,p_limit:100,p_offset:0})
  }).then(readJson),
  fetchWithDeadline(BASE+"/rest/v1/df_official_factory_health?select=*",{
   headers:{"apikey":KEY,"Authorization":"Bearer "+KEY}
  },10000).then(readJson)
 ]);
 const status=health.status==="fulfilled"?{...health.value,factory:factory.status==="fulfilled"&&Array.isArray(factory.value)?factory.value[0]||null:null}:null;
 const records=publicDocs.status==="fulfilled"&&Array.isArray(publicDocs.value)?publicDocs.value:[];
 return json({ok:Boolean(status||publicDocs.status==="fulfilled"),status,records,
  warnings:[
   ...(health.status==="rejected"?["기관 수집 현황을 일시적으로 조회하지 못했습니다."]:[]),
   ...(publicDocs.status==="rejected"?["공개자료 목록을 일시적으로 조회하지 못했습니다."] :[])
  ]});
}
export async function POST(req){
 const gate=await verifiedOperator(req).catch(()=>({code:503}));
 if(gate.code!==200)return gate.code===401?badAuth():gate.code===403?json({error:"관리자 권한이 필요합니다."},403):json({error:"관리자 권한을 확인하지 못했습니다."},503);
 let body;
 try{body=await req.json()}catch{return json({error:"잘못된 수집 요청입니다."},400)}
 if(!body||Object.keys(body).length!==1||!Number.isInteger(body.batch)||body.batch<0||body.batch>9)return json({error:"사전에 등록된 기관만 수집할 수 있습니다."},400);
 try{
  const result=await fetchWithDeadline(upstream,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({batch:body.batch})},57000);
  const payload=await result.json().catch(()=>({error:"수집기 응답 오류"}));
  return json(payload,result.status);
 }catch{return json({error:"공식기관 서버 응답이 지연됐습니다. 잠시 후 다시 실행해 주세요."},503)}
}
