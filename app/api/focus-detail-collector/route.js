import{NextResponse}from"next/server";
import{createClient}from"@supabase/supabase-js";
import{createHash}from"crypto";
import{parseOfficialDetail,resolveOfficialDetailUrl,looksLikeListPage,extractOfficialKeyContent,extractOfficialFacts}from"../../../lib/focus-policy-parsers";

const URL="https://svafsvyjjufbqvxzoqee.supabase.co";
const KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
export const maxDuration=60;
function md5(x=""){return createHash("md5").update(x).digest("hex")}
async function client(req){
 const auth=req.headers.get("authorization")||"",token=auth.startsWith("Bearer ")?auth.slice(7):"";
 if(!KEY||!process.env.CRON_SECRET||token!==process.env.CRON_SECRET)return null;
 return createClient(URL,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
}
async function fetchPage(url){
 const r=await fetch(url,{cache:"no-store",redirect:"follow",headers:{"User-Agent":"DevelopmentFocus/1.0 (+official-detail-collector)"},signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw new Error("HTTP "+r.status);
 const type=(r.headers.get("content-type")||"").toLowerCase();
 const buf=await r.arrayBuffer();
 const charset=/charset\s*=\s*["']?([^;"'\s]+)/i.exec(type)?.[1]?.toLowerCase()||"";
 let enc="utf-8";
 if(/euc-kr|ks_c_5601|ksc5601|cp949/.test(charset))enc="euc-kr";
 let text;
 try{text=new TextDecoder(enc).decode(buf)}catch{text=new TextDecoder("utf-8").decode(buf)}
 return{url:r.url||url,type,text};
}
async function run(req){
 const sb=await client(req);if(!sb)return NextResponse.json({error:"DETAIL_COLLECTOR_AUTH_REQUIRED"},{status:401});
 const{data:docs,error}=await sb.from("df_source_documents")
  .select("id,title,detail_url,source_url,published_at,content_text,content_hash,body_hash,detail_status,detail_retry_count,raw_payload,key_content,key_facts")
  .in("detail_status",["queued","partial","failed"])
  .lt("detail_retry_count",6)
  .order("published_at",{ascending:false,nullsFirst:false})
  .limit(12);
 if(error)throw error;
 let complete=0,partial=0,failed=0;
 const detail=[];
 for(const d of docs||[]){
  let target=d.detail_url||d.source_url;
  if(!target){failed++;await sb.from("df_source_documents").update({detail_status:"failed",detail_retry_count:(d.detail_retry_count||0)+1,last_detail_attempt_at:new Date().toISOString(),raw_payload:{...(d.raw_payload||{}),detail_ok:false,needs_detail_fetch:true,last_detail_error:e.message}}).eq("id",d.id);continue}
  try{
   await sb.from("df_source_documents").update({detail_status:"fetching",last_detail_attempt_at:new Date().toISOString()}).eq("id",d.id);
   let page=await fetchPage(target);
   if(page.type.includes("html")&&looksLikeListPage(page.url)){
    const resolved=resolveOfficialDetailUrl(page.url,page.text,d.title,d.raw_payload||{});
    if(!resolved){
     await sb.from("df_source_documents").update({detail_status:"partial",detail_retry_count:(d.detail_retry_count||0)+1,last_detail_attempt_at:new Date().toISOString(),raw_payload:{...(d.raw_payload||{}),detail_ok:false,needs_detail_fetch:true,last_detail_error:"DETAIL_URL_NOT_RESOLVED"}}).eq("id",d.id);
     partial++;detail.push({id:d.id,status:"partial",reason:"detail_url_not_resolved"});continue;
    }
    target=resolved;
    await sb.from("df_source_documents").update({detail_url:resolved}).eq("id",d.id);
    page=await fetchPage(resolved);
   }
   if(page.type.includes("pdf")){
    const arr=[{document_id:d.id,file_name:"공식 PDF",file_url:page.url,file_type:"pdf",extraction_status:"pending"}];
    await sb.from("df_source_document_attachments").upsert(arr,{onConflict:"document_id,file_url"});
    await sb.from("df_source_documents").update({detail_status:"partial",detail_url:page.url,detail_retry_count:(d.detail_retry_count||0)+1,last_detail_attempt_at:new Date().toISOString(),attachment_hash:md5(page.url)}).eq("id",d.id);
    partial++;detail.push({id:d.id,status:"partial",reason:"pdf_only"});continue;
   }
   if(looksLikeListPage(page.url))throw new Error("LIST_PAGE_NOT_DETAIL");
   const parsed=parseOfficialDetail(page.url,page.text);
   const keyContent=extractOfficialKeyContent(parsed.text,d.title);
   const keyFacts=extractOfficialFacts(parsed.text,d.title,d.raw_payload||{});
   if(parsed.attachments.length)await sb.from("df_source_document_attachments").upsert(parsed.attachments.map(a=>({document_id:d.id,file_name:a.name,file_url:a.url,file_type:(a.url.split(".").pop()||"").split(/[?#]/)[0].toLowerCase(),extraction_status:"pending"})),{onConflict:"document_id,file_url"});
   const attHash=parsed.attachments.length?md5(parsed.attachments.map(a=>a.url).sort().join("|")):null;
   if(parsed.complete){
    if(d.body_hash&&d.body_hash!==parsed.bodyHash)await sb.from("df_source_document_versions").upsert({document_id:d.id,content_hash:d.content_hash||d.body_hash,title:d.title,content_text:d.content_text||"",source_url:page.url,source_published_at:d.published_at},{onConflict:"document_id,content_hash",ignoreDuplicates:true});
    const contentHash=md5(parsed.text);
    await sb.from("df_source_documents").update({content_text:parsed.text,content_hash:contentHash,body_hash:parsed.bodyHash,attachment_hash:attHash,detail_url:page.url,detail_status:"complete",detail_retry_count:0,last_detail_attempt_at:new Date().toISOString(),detail_completed_at:new Date().toISOString(),key_content:keyContent||d.key_content||null,key_facts:Object.keys(keyFacts).length?keyFacts:(d.key_facts||{}),key_extract_status:keyContent?"ready":"failed",key_extracted_at:keyContent?new Date().toISOString():null,raw_payload:{...(d.raw_payload||{}),detail_ok:true,detail_parser_host:parsed.host,needs_detail_fetch:false}}).eq("id",d.id);
    await sb.from("df_source_document_versions").upsert({document_id:d.id,content_hash:contentHash,title:d.title,content_text:parsed.text,source_url:page.url,source_published_at:d.published_at},{onConflict:"document_id,content_hash",ignoreDuplicates:true});
    complete++;detail.push({id:d.id,status:"complete",chars:parsed.text.length,attachments:parsed.attachments.length});
   }else{
    await sb.from("df_source_documents").update({detail_status:"partial",detail_url:page.url,detail_retry_count:(d.detail_retry_count||0)+1,last_detail_attempt_at:new Date().toISOString(),attachment_hash:attHash,key_content:keyContent||d.key_content||null,key_facts:Object.keys(keyFacts).length?keyFacts:(d.key_facts||{}),key_extract_status:keyContent?"ready":"pending",key_extracted_at:keyContent?new Date().toISOString():null,raw_payload:{...(d.raw_payload||{}),detail_ok:false,detail_parser_host:parsed.host,needs_detail_fetch:true}}).eq("id",d.id);
    partial++;detail.push({id:d.id,status:"partial",chars:parsed.text.length,attachments:parsed.attachments.length});
   }
  }catch(e){
   await sb.from("df_source_documents").update({detail_status:"failed",detail_retry_count:(d.detail_retry_count||0)+1,last_detail_attempt_at:new Date().toISOString()}).eq("id",d.id);
   failed++;detail.push({id:d.id,status:"failed",error:e.message});
  }
 }
 return NextResponse.json({ok:true,processed:(docs||[]).length,complete,partial,failed,detail});
}
export async function GET(req){try{return await run(req)}catch(e){return NextResponse.json({error:e.message||"상세수집 실패"},{status:500})}}
export async function POST(req){return GET(req)}
