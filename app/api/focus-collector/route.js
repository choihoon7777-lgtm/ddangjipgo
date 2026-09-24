import{NextResponse}from"next/server";
import{createClient}from"@supabase/supabase-js";
import{createHash}from"crypto";

const SUPABASE_URL="https://svafsvyjjufbqvxzoqee.supabase.co";
const SUPABASE_KEY="sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud";

async function adminClient(req){
 const auth=req.headers.get("authorization")||"";
 const token=auth.startsWith("Bearer ")?auth.slice(7):"";
 if(!token)return null;
 const sb=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const{data:{user},error}=await sb.auth.getUser(token);if(error||!user)return null;
 const scoped=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const{data:role}=await scoped.from("df_admin_roles").select("role,is_active").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
 return role?scoped:null;
}
function decode(s=""){
 return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
}
function tag(block,name){
 const m=block.match(new RegExp("<"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+name+">","i"));return m?decode(m[1]):"";
}
function items(xml){
 return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(x=>x[1]).map(b=>({title:tag(b,"title"),link:tag(b,"link")||tag(b,"guid"),description:tag(b,"description"),pubDate:tag(b,"pubDate")||tag(b,"dc:date")})).filter(x=>x.title&&x.link);
}
function hash(x){return createHash("md5").update(x||"").digest("hex")}

export async function POST(req){
 try{
  const sb=await adminClient(req);if(!sb)return NextResponse.json({error:"NEWSROOM_AUTH_REQUIRED"},{status:401});
  const{data:sources,error}=await sb.from("df_sources").select("id,name,feed_url").eq("is_active",true).eq("collector_enabled",true).not("feed_url","is",null);
  if(error)throw error;
  let discovered=0,created=0,changed=0,unchanged=0,failed=0;
  const detail=[];
  for(const source of sources||[]){
   try{
    const res=await fetch(source.feed_url,{cache:"no-store",headers:{"User-Agent":"DevelopmentFocus/1.0 (+official-rss-collector)"},signal:AbortSignal.timeout(12000)});
    if(!res.ok)throw new Error("HTTP "+res.status);
    const feed=await res.text();const rows=items(feed).slice(0,20);discovered+=rows.length;
    let sCreated=0,sChanged=0,sSame=0;
    for(const row of rows){
      const body=(row.description||row.title).trim();const h=hash(body);const published=row.pubDate&&!Number.isNaN(new Date(row.pubDate).getTime())?new Date(row.pubDate).toISOString():null;
      const{data:old}=await sb.from("df_source_documents").select("id,title,content_text,content_hash,source_url,published_at").eq("source_id",source.id).eq("external_id",row.link).maybeSingle();
      if(!old){
       const{error:e}=await sb.from("df_source_documents").insert({source_id:source.id,external_id:row.link,title:row.title,source_url:row.link,published_at:published,content_text:body,content_hash:h,raw_payload:{collector:"rss",feed_url:source.feed_url},verification_status:"pending"});if(e)throw e;created++;sCreated++;
      }else if(old.content_hash!==h||old.title!==row.title){
       const{error:e}=await sb.from("df_source_documents").update({title:row.title,source_url:row.link,published_at:published,content_text:body,content_hash:h,fetched_at:new Date().toISOString(),raw_payload:{collector:"rss",feed_url:source.feed_url}}).eq("id",old.id);if(e)throw e;
       await sb.from("df_project_updates").insert({source_document_id:old.id,update_type:"source_changed",before_data:{title:old.title,content_hash:old.content_hash,content_text:old.content_text},after_data:{title:row.title,content_hash:h,content_text:body},diff_data:{title_changed:old.title!==row.title,content_changed:old.content_hash!==h}});
       changed++;sChanged++;
      }else{sSame++;}
    }
    unchanged+=sSame;await sb.from("df_sources").update({last_collected_at:new Date().toISOString()}).eq("id",source.id);
    detail.push({source:source.name,found:rows.length,created:sCreated,changed:sChanged,unchanged:sSame});
   }catch(e){failed++;detail.push({source:source.name,error:e.message})}
  }
  return NextResponse.json({ok:true,discovered,created,changed,unchanged,failed,detail});
 }catch(e){return NextResponse.json({error:e.message||"공식 RSS 수집 실패"},{status:500})}
}