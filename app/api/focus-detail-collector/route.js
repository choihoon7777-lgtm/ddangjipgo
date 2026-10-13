import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { parseOfficialDetail,resolveOfficialDetailUrl,looksLikeListPage,extractOfficialKeyContent,extractOfficialFacts } from '../../../lib/focus-policy-parsers';
import { fetchOfficial,extractHwpx } from '../../../lib/focus-official-fetch';

const URL='https://svafsvyjjufbqvxzoqee.supabase.co';
export const maxDuration=60;
const hash=x=>createHash('md5').update(x).digest('hex');
async function checked(query){const result=await query;if(result.error)throw result.error;return result.data;}
async function run(req){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY,secret=process.env.CRON_SECRET;
 if(!key||!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'DETAIL_COLLECTOR_AUTH_REQUIRED'},{status:401});
 const sb=createClient(URL,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const stale=new Date(Date.now()-10*60*1000).toISOString();
 const docs=await checked(sb.from('df_source_documents').select('*').or(`detail_status.in.(queued,partial,failed),and(detail_status.eq.fetching,last_detail_attempt_at.lt.${stale})`).lt('detail_retry_count',6).order('published_at',{ascending:false,nullsFirst:false}).limit(2));
 const detail=await Promise.all(docs.map(async d=>{
  const now=new Date().toISOString();
  const update=values=>checked(sb.from('df_source_documents').update(values).eq('id',d.id));
  try{
   if(!d.detail_url&&!d.source_url)throw new Error('DETAIL_URL_MISSING');
   await update({detail_status:'fetching',last_detail_attempt_at:now});
   let page=await fetchOfficial(d.detail_url||d.source_url,{timeout:8000});
   if(looksLikeListPage(page.url)){
    const url=resolveOfficialDetailUrl(page.url,page.text,d.title,d.raw_payload||{});
    if(!url)throw new Error('DETAIL_URL_NOT_RESOLVED');
    page=await fetchOfficial(url,{timeout:8000});
   }
   if(/pdf/i.test(page.type)){
    await checked(sb.from('df_source_document_attachments').upsert({document_id:d.id,file_name:'공식 PDF',file_url:page.url,file_type:'pdf',extraction_status:'pending'},{onConflict:'document_id,file_url'}));
    await update({detail_status:'partial',detail_url:page.url,detail_retry_count:(d.detail_retry_count||0)+1,last_detail_attempt_at:now,attachment_hash:hash(page.url)});
    return {id:d.id,status:'partial',reason:'pdf_only'};
   }
   if(!/html/i.test(page.type))throw new Error('HTML_DETAIL_REQUIRED');
   const parsed=parseOfficialDetail(page.url,page.text);
   if(parsed.metadata['제목']&&parsed.metadata['제목'].replace(/\s|[・·ㆍ]/g,'')!==d.title.replace(/\s|[・·ㆍ]/g,''))throw new Error('DETAIL_TITLE_MISMATCH');
   if(!parsed.complete)throw new Error('OFFICIAL_BODY_NOT_VERIFIED');
   const attachmentTexts=[];
   for(const a of parsed.attachments){
    const type=(a.name.match(/\.(hwpx|hwp|pdf|docx|xlsx|zip)$/i)?.[1]||a.url.match(/\.(hwpx|hwp|pdf)(?:[?#]|$)/i)?.[1]||'').toLowerCase();
    let extraction='pending',extractedText=null,fileHash=null;
    if(type==='hwpx'&&attachmentTexts.length<2){
     try{const file=await fetchOfficial(a.url,{timeout:8000});const text=extractHwpx(file.bytes);fileHash=hash(file.bytes);extractedText=text;if(text.trim()){attachmentTexts.push(text);extraction='complete';}}catch{extraction='failed';}
    }
    // Preserve extraction state only; unsupported PDF/HWP remains pending, never ready.
    await checked(sb.from('df_source_document_attachments').upsert({document_id:d.id,file_name:a.name,file_url:a.url,file_type:type,extraction_status:extraction,extracted_text:extractedText,extracted_text_hash:extractedText?hash(extractedText):null,file_hash:fileHash,updated_at:now},{onConflict:'document_id,file_url'}));
   }
   const text=[parsed.text,...attachmentTexts].join('\n\n');
   const contentHash=hash(text);
   const keyContent=extractOfficialKeyContent(text,d.title);
   const keyFacts=extractOfficialFacts(text,d.title,d.raw_payload||{});
   for(const [k,v] of Object.entries(parsed.metadata))if(k!=='제목')keyFacts[k==='고시/공고번호'?'공고번호':k]=v;
   if(d.body_hash&&d.content_hash&&d.content_hash!==contentHash)await checked(sb.from('df_source_document_versions').upsert({document_id:d.id,content_hash:d.content_hash,title:d.title,content_text:d.content_text||'',source_url:d.detail_url||d.source_url,source_published_at:d.published_at},{onConflict:'document_id,content_hash',ignoreDuplicates:true}));
   await checked(sb.from('df_source_document_versions').upsert({document_id:d.id,content_hash:contentHash,title:d.title,content_text:text,source_url:page.url,source_published_at:d.published_at},{onConflict:'document_id,content_hash',ignoreDuplicates:true}));
   await update({content_text:text,content_hash:contentHash,body_hash:contentHash,attachment_hash:hash(parsed.attachments.map(a=>a.url).sort().join('|')),detail_url:page.url,detail_status:'complete',detail_retry_count:0,last_detail_attempt_at:now,detail_completed_at:now,key_content:keyContent||null,key_facts:keyFacts,key_extract_status:keyContent?'ready':'pending',key_extracted_at:keyContent?now:null,raw_payload:{...(d.raw_payload||{}),detail_ok:true,needs_detail_fetch:false,last_detail_error:null,attachment_texts_extracted:attachmentTexts.length}});
   return {id:d.id,status:'complete',chars:text.length,attachments:parsed.attachments.length,extractedAttachments:attachmentTexts.length};
  }catch(e){
   await update({detail_status:'failed',detail_retry_count:(d.detail_retry_count||0)+1,last_detail_attempt_at:now,raw_payload:{...(d.raw_payload||{}),detail_ok:false,needs_detail_fetch:true,last_detail_error:e.message}});
   return {id:d.id,status:'failed',error:e.message};
  }
 }));
 return NextResponse.json({ok:true,processed:docs.length,complete:detail.filter(x=>x.status==='complete').length,failed:detail.filter(x=>x.status==='failed').length,partial:detail.filter(x=>x.status==='partial').length,detail});
}
export async function GET(req){try{return await run(req);}catch(e){return NextResponse.json({error:e.message||'상세 수집 실패'},{status:500});}}
export async function POST(req){return GET(req);}
