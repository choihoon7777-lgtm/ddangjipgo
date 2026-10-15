import{NextResponse}from"next/server";
import{createClient}from"@supabase/supabase-js";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const BASE="https://svafsvyjjufbqvxzoqee.supabase.co";
const KEY="sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud";
const attempts=new Map();
const PERIOD=15*60*1000;
const json=(body,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store, max-age=0","Pragma":"no-cache","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff"}});
export async function POST(req){
 const origin=req.headers.get("origin");
 const url=new URL(req.url);
 if(!origin||origin!==url.origin)return json({error:"잘못된 요청입니다."},403);
 const type=req.headers.get("content-type")||"";
 if(!type.toLowerCase().startsWith("application/json"))return json({error:"잘못된 요청 형식입니다."},415);
 const length=Number(req.headers.get("content-length")||0);
 if(length>1024)return json({error:"입력 형식이 올바르지 않습니다."},413);
 // Supplemental per-instance backoff; Supabase Auth also enforces provider rate limits.
 const ip=(req.headers.get("x-forwarded-for")||"").split(",")[0].trim()||"unknown";
 const ipKey=ip.slice(0,96);
 const now=Date.now();
 if(attempts.size>2500)for(const[k,v]of attempts)if(v.until<=now)attempts.delete(k);
 const record=attempts.get(ipKey);
 if(record&&record.until>now&&record.count>=8)return json({error:"시도가 많습니다. 잠시 후 다시 시도하세요."},429);
 if(!record||record.until<=now)attempts.set(ipKey,{count:1,until:now+PERIOD});
 else record.count++;
 const body=await req.json().catch(()=>null);
 if(!body||Object.keys(body).length!==1||typeof body.password!=="string"||body.password.length<8||body.password.length>128)return json({error:"비밀번호를 확인해 주세요."},400);
 const adminEmail=process.env.DF_ADMIN_LOGIN_EMAIL?.trim().toLowerCase();
 if(!adminEmail)return json({error:"운영센터 로그인 설정이 필요합니다."},503);
 try{
  const db=createClient(BASE,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const{data,error}=await db.auth.signInWithPassword({email:adminEmail,password:body.password});
  if(error||!data?.session?.access_token||!data?.session?.refresh_token||!data?.user)return json({error:"관리자 비밀번호가 올바르지 않습니다."},401);
  const{data:role,error:roleError}=await db.from("df_admin_roles").select("role").eq("profile_id",data.user.id).eq("is_active",true).maybeSingle();
  if(roleError||!role){await db.auth.signOut().catch(()=>{});return json({error:"관리자 권한을 확인할 수 없습니다."},403)}
  attempts.delete(ipKey);
  return json({ok:true,access_token:data.session.access_token,refresh_token:data.session.refresh_token});
 }catch{return json({error:"인증 서버에 일시적으로 연결할 수 없습니다."},503)}
}
