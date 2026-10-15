import{NextResponse}from"next/server";
import{createClient}from"@supabase/supabase-js";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const BASE="https://svafsvyjjufbqvxzoqee.supabase.co";
const KEY="sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud";
const redirectTo="https://ddangjipgo.vercel.app/focus-admin/reset-password";
const attempts=new Map();
const WINDOW_MS=30*60*1000;
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store","Pragma":"no-cache","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"}});
export async function POST(req){
 // Recovery email always goes to the fixed existing admin. Never accept a target email or URL from callers.
 const origin=req.headers.get("origin");
 if(!origin||origin!==new URL(req.url).origin)return json({error:"잘못된 요청입니다."},403);
 if(!(req.headers.get("content-type")||"").toLowerCase().startsWith("application/json"))return json({error:"요청 형식이 올바르지 않습니다."},415);
 if(Number(req.headers.get("content-length")||0)>128)return json({error:"요청 형식이 올바르지 않습니다."},413);
 const body=await req.json().catch(()=>null);
 if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).length)return json({error:"요청 형식이 올바르지 않습니다."},400);
 const adminEmail=process.env.DF_ADMIN_LOGIN_EMAIL?.trim().toLowerCase();
 if(!adminEmail)return json({error:"관리자 이메일 설정을 확인할 수 없습니다."},503);
 const ip=(req.headers.get("x-forwarded-for")||"").split(",")[0].trim().slice(0,96)||"unknown";
 const now=Date.now();
 if(attempts.size>2000)for(const[k,v]of attempts)if(v.until<now)attempts.delete(k);
 const previous=attempts.get(ip);
 if(previous&&previous.until>now&&previous.count>=2)return json({error:"재설정 메일 요청 횟수를 초과했습니다. 잠시 후 다시 시도하세요."},429);
 attempts.set(ip,previous&&previous.until>now?{count:previous.count+1,until:previous.until}:{count:1,until:now+WINDOW_MS});
 try{
  const auth=createClient(BASE,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const{error}=await auth.auth.resetPasswordForEmail(adminEmail,{redirectTo});
  if(error){if(error.status===429)return json({error:"메일 요청이 많습니다. 잠시 후 다시 시도하세요."},429);return json({error:"재설정 메일 발송에 실패했습니다. 인증 메일 설정을 확인해 주세요."},503)}
  return json({ok:true,message:"재설정 메일 요청을 접수했습니다."});
 }catch{return json({error:"인증 서버 연결이 지연되고 있습니다. 잠시 후 다시 시도하세요."},503)}
}
