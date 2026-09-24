import{NextResponse}from"next/server";
import{createClient}from"@supabase/supabase-js";
const SUPABASE_URL="https://svafsvyjjufbqvxzoqee.supabase.co";
export const maxDuration=60;
function allowed(req){return !!process.env.CRON_SECRET&&(req.headers.get("authorization")||"")==="Bearer "+process.env.CRON_SECRET}
export async function GET(req){
 if(!allowed(req))return NextResponse.json({error:"CRON_AUTH_REQUIRED"},{status:401});
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)return NextResponse.json({ok:false,configured:false,missing:["SUPABASE_SERVICE_ROLE_KEY"]});
 const sb=createClient(SUPABASE_URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const{data,error}=await sb.rpc("df_publish_due_articles");
 if(error)return NextResponse.json({ok:false,error:error.message},{status:500});
 return NextResponse.json({ok:true,published:data||0,checked_at:new Date().toISOString()});
}
