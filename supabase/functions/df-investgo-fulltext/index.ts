import {createClient} from "npm:@supabase/supabase-js@2.57.0";
const URL=Deno.env.get("SUPABASE_URL")||"",KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const sb=createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"content-type"}});
function decode(s:string){
 return s.replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&apos;|&#39;/gi,"'").replace(/&#x([0-9a-f]+);/gi,(_,v)=>String.fromCodePoint(parseInt(v,16))).replace(/&#(\d+);/g,(_,v)=>String.fromCodePoint(Number(v)));
}
function plain(html:string){
 return decode(html.replace(/<br\b[^>]*\/?>/gi,"\n").replace(/<\/(?:div|p|h[1-6])>/gi,"\n").replace(/<[^>]*>/g," ")).replace(/\u200b|\u200c|\u200d|\ufeff/g,"").replace(/[\t \u00a0]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
}
const fingerprint=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))).map(x=>x.toString(16).padStart(2,"0")).join("");
async function original(post:string){
 if(!/^\d{9,15}$/.test(post))throw Error("INVALID_NAVER_POST");
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),12500);
 try{
  const response=await fetch("https://m.blog.naver.com/devel10-01/"+post,{signal:ctl.signal,redirect:"error",headers:{Accept:"text/html","User-Agent":"Mozilla/5.0 (compatible; DevelopmentFocusImporter/1.0)"}});
  if(!response.ok)throw Error("NAVER_FULLTEXT_HTTP_"+response.status);
  const data=await response.text();
  if(data.length<12000||data.length>1800000)throw Error("FULLTEXT_PAGE_SIZE_INVALID");
  const start=data.indexOf('class="se-main-container"');
  if(start<0)throw Error("SMART_EDITOR_BODY_NOT_FOUND");
  const tail=data.slice(start);
  const end=tail.search(/<!--\s*SE_DOC_FOOTER|<!--\s*SE_DOC_END|<div[^>]+class="[^"]*post_tag|<div[^>]+id="post_footer/i);
  const body=tail.slice(0,end>1000?end:Math.min(tail.length,800000));
  const lines:string[]=[],images:string[]=[];
  for(const m of body.matchAll(/<p\b[^>]*\bse-text-paragraph\b[^>]*>([\s\S]*?)<\/p>/gi)){
   const item=plain(m[1]);
   if(item.length>=2&&item.length<=3000&&(lines.at(-1)!==item))lines.push(item);
  }
  for(const m of body.matchAll(/<img\b[^>]*>/gi)){
   const html=m[0];
   const raw=html.match(/\b(?:data-lazy-src|data-src|src)=["']([^"']+)["']/i)?.[1]||"";
   try{const u=new globalThis.URL(decode(raw));if(u.protocol==="https:"&&/(?:^|\.)pstatic\.net$/.test(u.hostname)&&!images.includes(u.href))images.push(u.href)}catch{}
  }
  const full=lines.join("\n\n").trim();
  if(lines.length<6||full.length<650||full.length>70000)throw Error("FULL_TEXT_NOT_VERIFIED_"+full.length);
  return {text:full,images:images.slice(0,30),paragraphs:lines.length,hash:await fingerprint(full)};
 }finally{clearTimeout(timer)}
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return json({ok:true});
 if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
 if(!URL||!KEY)return json({error:"SERVER_UNAVAILABLE"},503);
 const payload=await req.json().catch(()=>null);
 if(!payload||Object.keys(payload).length!==1||!Number.isInteger(payload.batch)||payload.batch<0||payload.batch>6)return json({error:"ONLY_FIXED_CANDIDATE_BATCH_ALLOWED"},400);
 try{
  const from=payload.batch*5;
  const {data:posts,error}=await sb.from("df_blog_import_posts").select("id,source_post_id,original_title,extraction_status,full_body_hash,original_url").eq("source_blog_id","devel10-01").eq("eligibility","candidate").eq("import_status","staged").order("original_published_at",{ascending:false}).range(from,from+4);
  if(error)throw error;
  const outcome:any[]=[];
  for(const post of posts||[]){
   if(post.extraction_status==="complete"&&post.full_body_hash){outcome.push({id:post.source_post_id,status:"already_complete"});continue}
   try{
    const data=await original(post.source_post_id);
    const {error:e}=await sb.from("df_blog_import_posts").update({full_body_text:data.text,full_body_hash:data.hash,body_extracted_at:new Date().toISOString(),original_image_urls:data.images,source_scope:"full_export_verified",extraction_status:"complete",extraction_error:null}).eq("id",post.id).eq("source_post_id",post.source_post_id).eq("import_status","staged");
    if(e)throw e;
    outcome.push({id:post.source_post_id,status:"complete",chars:data.text.length,paragraphs:data.paragraphs,images:data.images.length});
   }catch(e){
    const msg=String(e instanceof Error?e.message:e).slice(0,160);
    await sb.from("df_blog_import_posts").update({extraction_status:"failed",extraction_error:msg}).eq("id",post.id).eq("import_status","staged");
    outcome.push({id:post.source_post_id,status:"failed",error:msg});
   }
  }
  return json({ok:true,batch:payload.batch,processed:outcome.length,complete:outcome.filter(x=>x.status==="complete"||x.status==="already_complete").length,failed:outcome.filter(x=>x.status==="failed").length,outcome});
 }catch(e){return json({error:String(e instanceof Error?e.message:e)},500)}
});