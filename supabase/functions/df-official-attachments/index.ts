import {createClient} from "npm:@supabase/supabase-js@2.57.0";
import {unzipSync} from "npm:fflate@0.8.2";

const BASE=Deno.env.get("SUPABASE_URL")||"";
const KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||(()=>{try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||""}catch{return""}})();
const db=createClient(BASE,KEY,{auth:{autoRefreshToken:false,persistSession:false}});
const json=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"null"}});
const officialPage=(raw:string)=>{try{const u=new URL(raw);return u.protocol==="https:"&&u.hostname==="www.daejeon.go.kr"&&u.pathname==="/drh/drhGosiView.do"&&/^[0-9]{3,10}$/.test(u.searchParams.get("sno")||"")&&!u.username&&!u.password&&!u.port}catch{return false}};
const hash=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))).map(x=>x.toString(16).padStart(2,"0")).join("");
const decodeEntities=(x:string)=>x.replace(/&(?:lt|gt|amp|quot|apos|nbsp);|&#(?:x[0-9a-f]+|[0-9]+);/gi,m=>{const t=m.toLowerCase();const simple:Record<string,string>={"&lt;":"<","&gt;":">","&amp;":"&","&quot;":'"',"&apos;":"'","&nbsp;":" "};if(simple[t])return simple[t];const n=t.startsWith("&#x")?parseInt(t.slice(3,-1),16):parseInt(t.slice(2,-1),10);return Number.isInteger(n)&&n>0&&n<=0x10ffff?String.fromCodePoint(n):" "});
function hwpxText(bytes:Uint8Array){
 if(bytes.length<1000||bytes.length>3500000||bytes[0]!==0x50||bytes[1]!==0x4b)throw Error("INVALID_OR_OVERSIZED_HWPX");
 const items=unzipSync(bytes);
 const sections=Object.keys(items).filter(k=>/^Contents\/section[0-9]+\.xml$/i.test(k)).sort((a,b)=>parseInt(a.match(/\d+/)?.[0]||"0")-parseInt(b.match(/\d+/)?.[0]||"0")).slice(0,60);
 if(!sections.length)throw Error("HWPX_SECTIONS_MISSING");
 let size=0;const passages:string[]=[];
 for(const key of sections){
  const contents=items[key];
  size+=contents.length;if(size>16000000)throw Error("HWPX_UNCOMPRESSED_TOO_LARGE");
  let xml=new TextDecoder("utf-8",{fatal:true}).decode(contents);
  xml=xml.replace(/<\/(?:[a-z]+:)?(?:p|tr|tbl)>/gi,"\n").replace(/<[^>]+>/g," ");
  const body=decodeEntities(xml).replace(/[ \t\r]+/g," ").replace(/\n[ \t]*/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
  if(body.length)passages.push(body);
 }
 const full=passages.join("\n\n");
 if(full.length<700||full.length>180000)throw Error("HWPX_TEXT_UNVERIFIED_"+full.length);
 return full;
}
async function fetchWithTimeout(url:string,init:RequestInit,ms:number){
 const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),ms);
 try{return await fetch(url,{...init,signal:ctrl.signal,redirect:"manual"})}finally{clearTimeout(t)}
}
async function processDoc(doc:any){
 const name=String(doc.raw_payload?.attachment_name||"");
 const post=String(doc.source_url||"");
 if(!officialPage(post)||!/^F[0-9]{8,25}_[^\/\u0000-\u001f]{8,195}[.]hwpx$/i.test(name))return {id:doc.id,state:"unsupported_attachment"};
 const a=new URL(post);
 const view=await fetchWithTimeout(post,{headers:{"User-Agent":"Mozilla/5.0","Accept":"text/html"}},15000);
 if(!view.ok||view.status>=300)throw Error("OFFICIAL_VIEW_HTTP_"+view.status);
 const html=await view.text();
 if(!html.includes(name)||!html.includes(doc.title)||!html.includes("2026-10-16")||html.length>350000)throw Error("ATTACHMENT_NOT_IN_OFFICIAL_VIEW");
 const endpoint=new URL("/drh/drhGosiFileDownload.do",a.origin);
 const form=new URLSearchParams();form.set("filePath",name);
 const file=await fetchWithTimeout(endpoint.href,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8","Accept":"application/octet-stream,application/zip,*/*","Referer":post,"User-Agent":"Mozilla/5.0"},body:form.toString()},24000);
 if(!file.ok||file.status>=300)throw Error("HWPX_DOWNLOAD_HTTP_"+file.status);
 if(Number(file.headers.get("content-length")||"0")>3500000)throw Error("HWPX_TOO_LARGE");
 const bytes=new Uint8Array(await file.arrayBuffer());
 const extracted=hwpxText(bytes);
 const tag=String(doc.title||"").match(/(?:대흥2구역|용문동4구역)/)?.[0];
 if(!tag||!extracted.includes(tag))throw Error("HWPX_TITLE_MISMATCH");
 // Do not auto-publish landowner registers or unreviewed maps. Keep the
 // complete extracted text behind administrator-only RLS for fact checking.
 const evidence=extracted.slice(0,Math.min(extracted.length,16000));
 const beforePrivate=evidence.split(/\n(?=[^\n]{0,45}(?:토지세목조서|토지조서|소유자(?:의)?\s*성명|권리자\s*성명))/)[0]||"";
 const keyText=beforePrivate.split(/\n/).map(x=>x.trim()).filter(x=>x.length>18&&/(사업|면적|기간|정비|구역|계획|위치|지구|토지|지형|도시|사업시행)/.test(x)).slice(0,22).join("\n").slice(0,3500);
 if(keyText.length<100)throw Error("HWPX_KEY_FACTS_TOO_SHORT");
 const fileHash=await hash(bytes),txtHash=await hash(new TextEncoder().encode(extracted));
 const evidenceUrl=post+"#file="+encodeURIComponent(name);
 const aResult=await db.from("df_source_document_attachments").upsert({document_id:doc.id,file_name:name,file_url:evidenceUrl,file_type:"hwpx",file_hash:fileHash,extracted_text:extracted,extracted_text_hash:txtHash,extraction_status:"complete",updated_at:new Date().toISOString()},{onConflict:"document_id,file_url"});
 if(aResult.error)throw aResult.error;
 const upd=await db.from("df_source_documents").update({content_text:extracted,content_hash:txtHash,body_hash:txtHash,key_content:keyText,key_extract_status:"ready",key_extracted_at:new Date().toISOString(),detail_status:"partial",last_checked_at:new Date().toISOString(),raw_payload:{...doc.raw_payload,public_hidden:false,auto_hidden:false,needs_detail_fetch:false,attachment_text_extracted:true,attachment_texts_extracted:1,detail_ok:false,manual_review_required:true,verified_attachment_sha256:fileHash,last_detail_error:null}}).eq("id",doc.id).eq("detail_status","partial");
 if(upd.error)throw upd.error;
 return {id:doc.id,state:"extracted_for_review",characters:extracted.length,preview_chars:keyText.length,attachment_sha256:fileHash};
}
Deno.serve(async req=>{
 if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
 if(!BASE||!KEY)return json({error:"NOT_CONFIGURED"},503);
 let payload:any=null;try{payload=await req.json()}catch{return json({error:"INVALID_BODY"},400)}
 if(!payload||Object.keys(payload).length!==1||payload.action!=="run")return json({error:"INVALID_ACTION"},400);
 const token=req.headers.get("x-df-collector-token")||"";
 if(!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(token))return json({error:"MISSING_SCHEDULER_AUTH"},403);
 const claim=await db.rpc("df_claim_ingest_token",{p_token:token,p_batch:9});
 if(claim.error||claim.data!==true)return json({error:"SINGLE_USE_AUTH_REQUIRED"},403);
 try{
  const origin=await db.from("df_sources").select("id").eq("name","대전광역시 고시·공고").eq("source_type","official").eq("is_active",true).maybeSingle();
  if(origin.error||!origin.data)throw Error("OFFICIAL_SOURCE_NOT_FOUND");
  const sources=await db.from("df_source_documents").select("id,title,source_url,raw_payload,detail_status").eq("source_id",origin.data.id).eq("detail_status","partial").eq("verification_status","verified").order("last_checked_at",{ascending:false}).limit(12);
  if(sources.error)throw sources.error;
  const docs=(sources.data||[]).filter((d:any)=>d.raw_payload?.needs_detail_fetch===true&&d.raw_payload?.attachment_text_extracted!==true&&d.raw_payload?.attachment_name&&officialPage(d.source_url)).slice(0,3);
  const results:any[]=[];
  for(const doc of docs){
   try{results.push(await processDoc(doc))}
   catch(e){results.push({id:doc.id,state:"failed",reason:String(e instanceof Error?e.message:e).slice(0,165)})}
  }
  return json({ok:true,checked:docs.length,extracted:results.filter(x=>x.state==="extracted_for_review").length,failed:results.filter(x=>x.state==="failed").length,results});
 }catch(e){return json({error:String(e instanceof Error?e.message:e).slice(0,200)},500)}
});