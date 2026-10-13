import {createClient} from "npm:@supabase/supabase-js@2.57.0";

const DB_URL=Deno.env.get("SUPABASE_URL")||"";
const SERVER_KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const db=createClient(DB_URL,SERVER_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const BLOG="devel10-01";
const FEED="https://rss.blog.naver.com/devel10-01.xml";
const PERIOD_MINUTES=30;
const json=(v:unknown,status=200)=>new Response(JSON.stringify(v),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"content-type"}});
const entities=(s:string)=>s.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
const strip=(v:string)=>entities(v.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ")).trim();
function field(block:string,key:string){
 const match=block.match(new RegExp("<"+key+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+key+">","i"));
 if(!match)return"";
 return entities(match[1].replace(/^\s*<!\[CDATA\[/,"").replace(/\]\]>\s*$/,"")).trim();
}
const hexHash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,"0")).join("");
function categoryFor(title:string){
 const t=title.replace(/\s+/g," ");
 if(/공매|경매|온비드|캠코|유찰/.test(t))return "경매·공매 분석";
 if(/도시개발|개발사업|사업부지|클러스터|신도시|도시계획|역세권|사옥 부지|부지|개발계획|주상복합|사옥|빌딩|주택공급/.test(t))return "토지·도시개발";
 if(/재건축|재개발|정비사업|공사비|기본형건축비|GS건설|건설사|분담금/.test(t))return "건설·정비사업";
 if(/PF|대출|주담대|금리/.test(t)&&/부동산|아파트|주택|건설|대출|주담대/.test(t))return "부동산 금융";
 if(/부동산|주택|아파트|청약|분양|무순위|오피스텔|전셋값|전세|전셋|방배|반포|과천|강북|고양대곡/.test(t))return "부동산 정책·시장";
 if(/매각|건축|공공시설|지가|토지|인허가/.test(t))return "검토 필요";
 return "";
}
function sanitizeThumbnail(raw:string){
 const x=raw.match(/<img\b[^>]*src=["'](https:\/\/[^"']+)["']/i)?.[1]||"";
 try{const u=new URL(entities(x));return u.protocol==="https:"&&/(\.pstatic\.net|\.naver\.net)$/.test(u.hostname)?u.href:null}catch{return null}
}
async function feedItems(){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);
 try{
  const response=await fetch(FEED,{signal:controller.signal,redirect:"follow",headers:{Accept:"application/rss+xml,application/xml,text/xml"}});
  if(!response.ok)throw Error("NAVER_RSS_HTTP_"+response.status);
  const xml=await response.text();
  if(xml.length>600000||!xml.includes("<rss"))throw Error("INVALID_RSS_DOCUMENT");
  const out:any[]=[],seen=new Set<string>();
  for(const match of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)){
   const block=match[1],title=field(block,"title").slice(0,400),guid=field(block,"guid");
   const found=guid.match(/^https:\/\/blog\.naver\.com\/devel10-01\/([0-9]{9,15})$/);
   if(!found||!title||seen.has(found[1]))continue;
   seen.add(found[1]);
   const description=field(block,"description");
   const excerpt=strip(description).slice(0,1100);
   const category=field(block,"category").slice(0,120);
   const pub=field(block,"pubDate");const time=Date.parse(pub);
   const classification=categoryFor(title);
   const thumb=sanitizeThumbnail(description);
   out.push({
    source_blog_id:BLOG,source_post_id:found[1],original_url:found[0],
    original_title:title,original_category:category,
    original_published_at:Number.isFinite(time)?new Date(time).toISOString():null,
    rss_excerpt:excerpt||null,rss_thumbnail_url:thumb,
    source_scope:"rss_excerpt",target_category:classification||null,
    eligibility:classification===""?"out_of_scope":classification==="검토 필요"?"review":"candidate",
    import_status:"staged",original_snapshot_hash:await hexHash([found[1],title,pub,excerpt].join("|"))
   });
  }
  if(!out.length)throw Error("NAVER_RSS_HAS_NO_POSTS");
  if(out.length>100)throw Error("RSS_TOO_MANY_POSTS");
  return out;
 }finally{clearTimeout(timer)}
}
async function read(){
 const [posts,runs]=await Promise.all([
  db.from("df_blog_import_posts").select("id,source_post_id,original_title,original_url,original_published_at,original_category,target_category,eligibility,import_status,source_scope,rss_excerpt,rss_thumbnail_url,first_seen_at,last_seen_at").eq("source_blog_id",BLOG).order("original_published_at",{ascending:false}).limit(100),
  db.from("df_blog_import_runs").select("started_at,completed_at,feed_item_count,inserted_count,duplicate_count,relevant_count,outcome,error_text").eq("source_blog_id",BLOG).order("started_at",{ascending:false}).limit(1)
 ]);
 if(posts.error||runs.error)throw posts.error||runs.error;
 const rows=posts.data||[];
 return {ok:true,source_blog_id:BLOG,feed_url:FEED,scanned_posts:rows.length,
  candidate_count:rows.filter(x=>x.eligibility==="candidate").length,
  out_of_scope_count:rows.filter(x=>x.eligibility==="out_of_scope").length,
  review_count:rows.filter(x=>x.eligibility==="review").length,
  full_text_migrated:rows.filter(x=>x.source_scope==="full_export_verified").length,
  posts:rows,latest_run:runs.data?.[0]||null};
}
async function sync(){
 const threshold=new Date(Date.now()-PERIOD_MINUTES*60*1000).toISOString();
 const now=new Date().toISOString();
 const lock=await db.from("df_blog_import_sync_lock").update({claimed_at:now,last_error:null}).eq("lock_key",BLOG).lt("claimed_at",threshold).select("lock_key").maybeSingle();
 if(lock.error)throw lock.error;
 if(!lock.data)return {ok:false,cooldown:true,message:"이미 가져오기 작업이 실행 중이거나 30분 이내 실행했습니다."};
 const run=await db.from("df_blog_import_runs").insert({source_blog_id:BLOG,outcome:"running"}).select("id").single();
 try{
  if(run.error)throw run.error;
  const posts=await feedItems();
  // Existing entries are immutable source snapshots. A repeated sync cannot change original content or publish it.
  const {data:inserted,error}=await db.from("df_blog_import_posts").upsert(posts,{onConflict:"source_blog_id,source_post_id",ignoreDuplicates:true}).select("source_post_id");
  if(error)throw error;
  const insertedCount=inserted?.length||0;
  const res={ok:true,source_blog_id:BLOG,feed_item_count:posts.length,inserted_count:insertedCount,duplicate_count:posts.length-insertedCount,relevant_count:posts.filter(x=>x.eligibility==="candidate").length,full_text_migrated:0,public_articles_created:0};
  await db.from("df_blog_import_runs").update({outcome:"success",completed_at:new Date().toISOString(),feed_item_count:res.feed_item_count,inserted_count:res.inserted_count,duplicate_count:res.duplicate_count,relevant_count:res.relevant_count}).eq("id",run.data.id);
  await db.from("df_blog_import_sync_lock").update({last_completed_at:new Date().toISOString()}).eq("lock_key",BLOG);
  return res;
 }catch(error){
  const message=String(error instanceof Error?error.message:error).slice(0,250);
  if(run.data)await db.from("df_blog_import_runs").update({outcome:"failed",completed_at:new Date().toISOString(),error_text:message}).eq("id",run.data.id);
  await db.from("df_blog_import_sync_lock").update({last_error:message}).eq("lock_key",BLOG);
  throw Error(message);
 }
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return json({ok:true});
 if(!DB_URL||!SERVER_KEY)return json({error:"SERVER_CONFIG_UNAVAILABLE"},503);
 try{
  if(req.method==="GET")return json(await read());
  if(req.method==="POST"){
   const body=await req.json().catch(()=>null);
   if(!body||Object.keys(body).length!==1||body.action!=="sync")return json({error:"ONLY_FIXED_NAVER_RSS_SYNC_ALLOWED"},400);
   const result=await sync();
   return json(result,result.cooldown?429:200);
  }
  return json({error:"METHOD_NOT_ALLOWED"},405);
 }catch(e){return json({error:String(e instanceof Error?e.message:e)},500)}
});