import{NextResponse}from"next/server";
import{createClient}from"@supabase/supabase-js";
import{buildArticle}from"../../../lib/df-ai";

const SUPABASE_URL="https://svafsvyjjufbqvxzoqee.supabase.co";
const SUPABASE_KEY="sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud";

async function requireAdmin(req){
 const auth=req.headers.get("authorization")||"";
 const token=auth.startsWith("Bearer ")?auth.slice(7):"";
 if(!token)return null;
 const sb=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const{data:{user},error}=await sb.auth.getUser(token);
 if(error||!user)return null;
 const scoped=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const{data:role,error:roleError}=await scoped.from("df_admin_roles").select("role,is_active").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
 if(roleError||!role)return null;
 return{user,role};
}

export async function POST(req){
 try{
  const admin=await requireAdmin(req);
  if(!admin)return NextResponse.json({error:"NEWSROOM_AUTH_REQUIRED"},{status:401});
  const{source}=await req.json();
  if(!source||source.trim().length<80)return NextResponse.json({error:"공식자료 원문이 너무 짧습니다."},{status:400});
  const result=await buildArticle(source);
  return NextResponse.json(result);
 }catch(e){
  const missing=e.message==="OPENAI_API_KEY_NOT_CONFIGURED"||e.message==="AI_AUTH_NOT_CONFIGURED";
  return NextResponse.json({error:missing?"AI API 키 연결이 필요합니다.":e.message},{status:missing?503:500});
 }
}