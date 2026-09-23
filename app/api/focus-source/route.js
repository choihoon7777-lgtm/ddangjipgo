import{NextResponse}from"next/server";
import{createClient}from"@supabase/supabase-js";

const SUPABASE_URL="https://svafsvyjjufbqvxzoqee.supabase.co";
const SUPABASE_KEY="sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud";
const allowedExact=new Set(["korea.kr","law.go.kr","www.law.go.kr","dart.fss.or.kr","kind.krx.co.kr","www.krx.co.kr","www.data.go.kr"]);
function allowedHost(host){
 const h=host.toLowerCase();
 return allowedExact.has(h)||h.endsWith(".go.kr")||h.endsWith(".or.kr")||h.endsWith(".re.kr");
}
async function requireAdmin(req){
 const auth=req.headers.get("authorization")||"";
 const token=auth.startsWith("Bearer ")?auth.slice(7):"";
 if(!token)return null;
 const sb=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const{data:{user},error}=await sb.auth.getUser(token);if(error||!user)return null;
 const scoped=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const{data:role}=await scoped.from("df_admin_roles").select("role,is_active").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
 return role?{user,role}:null;
}
function decode(s){
 return s.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
}
function stripHtml(html){
 let x=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<noscript[\s\S]*?<\/noscript>/gi," ");
 x=x.replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/gi,"\n").replace(/<[^>]+>/g," ");
 return decode(x).replace(/\r/g,"").replace(/[ \t]+/g," ").replace(/\n[ \t]+/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
}
export async function POST(req){
 try{
  const admin=await requireAdmin(req);if(!admin)return NextResponse.json({error:"NEWSROOM_AUTH_REQUIRED"},{status:401});
  const{url}=await req.json();if(!url)return NextResponse.json({error:"공식 URL을 입력하세요."},{status:400});
  let u;try{u=new URL(url)}catch{return NextResponse.json({error:"올바른 URL이 아닙니다."},{status:400})}
  if(u.protocol!=="https:"||!allowedHost(u.hostname))return NextResponse.json({error:"정부·공공기관 공식 도메인만 불러올 수 있습니다."},{status:400});
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),15000);
  const res=await fetch(u.toString(),{redirect:"follow",signal:controller.signal,headers:{"User-Agent":"DevelopmentFocus/1.0 (+official-source-review)"},cache:"no-store"});clearTimeout(timer);
  if(!res.ok)return NextResponse.json({error:"공식자료 요청 실패 HTTP "+res.status},{status:502});
  const type=(res.headers.get("content-type")||"").toLowerCase();
  if(type.includes("pdf"))return NextResponse.json({error:"PDF 원문은 현재 자동 추출하지 않습니다. PDF의 본문 텍스트를 붙여 넣어 주세요.",contentType:type},{status:415});
  const raw=(await res.text()).slice(0,800000);
  const title=decode((raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||"공식자료").replace(/\s+/g," ").trim();
  const text=type.includes("html")?stripHtml(raw):raw.trim();
  if(text.length<80)return NextResponse.json({error:"공식자료 본문을 충분히 추출하지 못했습니다."},{status:422});
  return NextResponse.json({title,url:res.url||u.toString(),text:text.slice(0,120000),contentType:type});
 }catch(e){return NextResponse.json({error:e.name==="AbortError"?"공식자료 요청 시간이 초과되었습니다.":(e.message||"공식자료 불러오기 실패")},{status:500})}
}