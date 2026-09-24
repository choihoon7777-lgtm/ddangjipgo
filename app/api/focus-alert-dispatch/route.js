import{NextResponse}from"next/server";
import{createClient}from"@supabase/supabase-js";
import{getSiteUrl}from"../../../lib/df-site";
const SUPABASE_URL="https://svafsvyjjufbqvxzoqee.supabase.co";
export const maxDuration=60;
function allowed(req){return !!process.env.CRON_SECRET&&(req.headers.get("authorization")||"")==="Bearer "+process.env.CRON_SECRET}
function esc(x=""){return String(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
export async function GET(req){
 if(!allowed(req))return NextResponse.json({error:"CRON_AUTH_REQUIRED"},{status:401});
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY,resend=process.env.RESEND_API_KEY,from=process.env.ALERT_FROM_EMAIL;
 const missing=[!service&&"SUPABASE_SERVICE_ROLE_KEY",!resend&&"RESEND_API_KEY",!from&&"ALERT_FROM_EMAIL"].filter(Boolean);
 if(missing.length)return NextResponse.json({ok:true,configured:false,missing,sent:0});
 const sb=createClient(SUPABASE_URL,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const{data:alerts,error}=await sb.from("df_land_alerts").select("id,article_id,title,status,created_at,df_land_watchlists(profile_id,label,address_text)").eq("status","pending").order("created_at",{ascending:true}).limit(50);
 if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
 const ids=[...new Set((alerts||[]).map(x=>x.df_land_watchlists?.profile_id).filter(Boolean))];
 if(!ids.length)return NextResponse.json({ok:true,configured:true,sent:0,pending:(alerts||[]).length});
 const{data:prefs,error:pe}=await sb.from("df_notification_preferences").select("profile_id,email_enabled,email_address").in("profile_id",ids).eq("email_enabled",true);
 if(pe)return NextResponse.json({ok:false,error:pe.message},{status:500});
 const map=new Map((prefs||[]).filter(x=>x.email_address).map(x=>[x.profile_id,x]));
 let sent=0,failed=0,skipped=0;const site=getSiteUrl();
 for(const a of alerts||[]){
  const pref=map.get(a.df_land_watchlists?.profile_id);if(!pref){skipped++;continue}
  const property=a.df_land_watchlists?.label||a.df_land_watchlists?.address_text||"관심부동산";
  const link=a.article_id?site+"/focus/article?id="+encodeURIComponent(a.article_id):site+"/alerts";
  try{
   const r=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+resend,"Content-Type":"application/json"},body:JSON.stringify({from,to:[pref.email_address],subject:"[개발포커스] "+a.title,html:`<div style="font-family:Arial,sans-serif;line-height:1.7;color:#10233c"><b style="color:#f47721">DEVELOPMENT FOCUS</b><h2>${esc(a.title)}</h2><p>${esc(property)}과 관련된 새 개발정보가 확인됐습니다.</p><p><a href="${esc(link)}">개발포커스에서 확인하기</a></p><small>이메일 알림은 MY에서 언제든 끌 수 있습니다.</small></div>`})});
   if(!r.ok)throw new Error("email provider "+r.status);
   const{error:u}=await sb.from("df_land_alerts").update({status:"sent"}).eq("id",a.id).eq("status","pending");if(u)throw u;sent++;
  }catch{failed++}
 }
 return NextResponse.json({ok:true,configured:true,sent,failed,skipped,checked_at:new Date().toISOString()});
}
