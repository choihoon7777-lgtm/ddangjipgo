import{NextResponse}from"next/server";
import{createClient}from"@supabase/supabase-js";
import{createHash}from"crypto";

const SUPABASE_URL="https://svafsvyjjufbqvxzoqee.supabase.co";
const SUPABASE_KEY="sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud";

const FALLBACK_LISTS={
 "국토교통부":"https://www.molit.go.kr/USR/NEWS/m_71/lst.jsp",
 "과학기술정보통신부":"https://www.msit.go.kr/bbs/list.do?sCode=user&mId=307&mPid=208&bbsSeqNo=94",
 "행정안전부":"https://www.mois.go.kr/frt/bbs/type010/commonSelectBoardList.do?bbsId=BBSMSTR_000000000008"
};

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
 return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
}
function tag(block,name){
 const m=block.match(new RegExp("<"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+name+">","i"));return m?decode(m[1]):"";
}
function rssItems(xml){
 return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(x=>x[1]).map(b=>({title:tag(b,"title"),link:tag(b,"link")||tag(b,"guid"),description:tag(b,"description"),pubDate:tag(b,"pubDate")||tag(b,"dc:date")})).filter(x=>x.title&&x.link);
}
function stripHtml(html){
 let x=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<noscript[\s\S]*?<\/noscript>/gi," ");
 x=x.replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/gi,"\n").replace(/<[^>]+>/g," ");
 return decode(x).replace(/\n{3,}/g,"\n\n").trim();
}
function abs(base,href){try{return new URL(href,base).toString()}catch{return null}}
function htmlListItems(sourceName,base,html){
 const out=[],seen=new Set();
 const patterns={
  "국토교통부":/href=["']([^"']*dtl\.jsp\?[^"']*id=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
  "과학기술정보통신부":/href=["']([^"']*bbs\/view\.do\?[^"']*nttSeqNo=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
  "행정안전부":/href=["']([^"']*commonSelectBoardArticle\.do\?[^"']*nttId=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
 };
 const re=patterns[sourceName];if(!re)return out;
 for(const m of html.matchAll(re)){
  const link=abs(base,decode(m[1]));const title=decode(m[2]);
  if(!link||!title||title.length<4||seen.has(link))continue;
  seen.add(link);out.push({title,link,description:"",pubDate:""});
  if(out.length>=12)break;
 }
 return out;
}
function hash(x){return createHash("md5").update(x||"").digest("hex")}
async function fetchText(url,timeout=12000){
 const res=await fetch(url,{cache:"no-store",redirect:"follow",headers:{"User-Agent":"DevelopmentFocus/1.0 (+official-source-collector)"},signal:AbortSignal.timeout(timeout)});
 if(!res.ok)throw new Error("HTTP "+res.status);
 return{url:res.url||url,type:(res.headers.get("content-type")||"").toLowerCase(),text:await res.text()};
}
async function fullText(link,fallback){
 try{
  const r=await fetchText(link,10000);
  if(r.type.includes("pdf"))return fallback;
  const t=r.type.includes("html")?stripHtml(r.text):decode(r.text);
  return t.length>=80?t.slice(0,120000):fallback;
 }catch{return fallback}
}

export async function POST(req){
 try{
  const sb=await adminClient(req);if(!sb)return NextResponse.json({error:"NEWSROOM_AUTH_REQUIRED"},{status:401});
  const{data:sources,error}=await sb.from("df_sources").select("id,name,feed_url,base_url").eq("is_active",true).eq("collector_enabled",true);
  if(error)throw error;
  let discovered=0,created=0,changed=0,unchanged=0,failed=0;
  const detail=[];
  for(const source of sources||[]){
   try{
    let rows=[],mode="rss",feedError=null;
    if(source.feed_url){
      try{
       const feed=await fetchText(source.feed_url,10000);
       rows=rssItems(feed.text).slice(0,20);
       if(!rows.length)throw new Error("RSS 항목 0건");
      }catch(e){feedError=e.message;rows=[]}
    }
    if(!rows.length){
      mode="html_fallback";
      const listUrl=FALLBACK_LISTS[source.name];
      if(!listUrl)throw new Error(feedError||"사용 가능한 수집 경로 없음");
      const list=await fetchText(listUrl,12000);
      rows=htmlListItems(source.name,list.url,list.text).slice(0,8);
      if(!rows.length)throw new Error((feedError?feedError+" / ":"")+"목록 파싱 0건");
    }
    discovered+=rows.length;
    let sCreated=0,sChanged=0,sSame=0;
    for(const row of rows){
      const published=row.pubDate&&!Number.isNaN(new Date(row.pubDate).getTime())?new Date(row.pubDate).toISOString():null;
      const{data:old}=await sb.from("df_source_documents").select("id,title,content_text,content_hash,source_url,published_at").eq("source_id",source.id).eq("external_id",row.link).maybeSingle();

      if(old&&old.title===row.title&&mode==="html_fallback"){sSame++;continue}

      const seed=(row.description||row.title).trim();
      const body=mode==="rss"&&row.description?.trim().length>=80?seed:await fullText(row.link,seed);
      const h=hash(body);

      if(!old){
       const{error:e}=await sb.from("df_source_documents").insert({source_id:source.id,external_id:row.link,title:row.title,source_url:row.link,published_at:published,content_text:body,content_hash:h,raw_payload:{collector:mode,feed_url:source.feed_url||null,list_url:FALLBACK_LISTS[source.name]||null},verification_status:"pending"});if(e)throw e;created++;sCreated++;
      }else if(old.content_hash!==h||old.title!==row.title){
       const{error:e}=await sb.from("df_source_documents").update({title:row.title,source_url:row.link,published_at:published||old.published_at,content_text:body,content_hash:h,fetched_at:new Date().toISOString(),raw_payload:{collector:mode,feed_url:source.feed_url||null,list_url:FALLBACK_LISTS[source.name]||null}}).eq("id",old.id);if(e)throw e;
       await sb.from("df_project_updates").insert({source_document_id:old.id,update_type:"source_changed",before_data:{title:old.title,content_hash:old.content_hash,content_text:old.content_text},after_data:{title:row.title,content_hash:h,content_text:body},diff_data:{title_changed:old.title!==row.title,content_changed:old.content_hash!==h}});
       changed++;sChanged++;
      }else{sSame++;}
    }
    unchanged+=sSame;await sb.from("df_sources").update({last_collected_at:new Date().toISOString()}).eq("id",source.id);
    detail.push({source:source.name,mode,feedError,found:rows.length,created:sCreated,changed:sChanged,unchanged:sSame});
   }catch(e){failed++;detail.push({source:source.name,error:e.message})}
  }
  return NextResponse.json({ok:true,discovered,created,changed,unchanged,failed,detail});
 }catch(e){return NextResponse.json({error:e.message||"공식자료 수집 실패"},{status:500})}
}
