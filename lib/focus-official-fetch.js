import { unzipSync, strFromU8 } from 'fflate';
import { htmlToText, decodeEntities } from './focus-policy-parsers.js';

export function officialUrl(value){
 const u=new URL(value);
 if(!['https:','http:'].includes(u.protocol)||!(u.hostname.endsWith('.go.kr')||['korea.kr','www.korea.kr'].includes(u.hostname))||u.username||u.password||(u.port&&!['80','443'].includes(u.port)))throw new Error('공식기관 URL이 아닙니다.');
 return u;
}
export async function fetchOfficial(url,{timeout=12000,maxBytes=8000000}={}){
 let target=officialUrl(url);
 for(let i=0;i<5;i++){
  const response=await fetch(target,{redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(timeout),headers:{'User-Agent':'DevelopmentFocus/1.0 (+official-source-reader)'}});
  if([301,302,303,307,308].includes(response.status)){target=officialUrl(new URL(response.headers.get('location'),target).href);continue;}
  if(!response.ok)throw new Error('HTTP '+response.status);
  const reader=response.body.getReader();let size=0;const chunks=[];
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>maxBytes)throw new Error('공식파일 용량 제한 초과');chunks.push(value);}}finally{await reader.cancel();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  const type=response.headers.get('content-type')||'';
  const head=new TextDecoder('ascii').decode(bytes.slice(0,4096));
  const encoding=/euc-kr|ks_c_5601|ksc5601|cp949/i.test(type+' '+head)?'euc-kr':'utf-8';
  return {url:target.href,type,bytes,text:new TextDecoder(encoding).decode(bytes)};
 }
 throw new Error('공식페이지 리디렉션 횟수 초과');
}
export function extractHwpx(bytes){
 let total=0;
 const files=unzipSync(bytes,{filter:file=>{
  if(!/^Contents\/section\d+\.xml$/.test(file.name))return false;
  total+=file.originalSize;
  if(total>16000000)throw new Error('HWPX 본문 용량 제한 초과');
  return true;
 }});
 const sections=Object.keys(files).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
 if(!sections.length)throw new Error('HWPX 본문을 찾지 못했습니다.');
 return sections.map(name=>{
  const xml=strFromU8(files[name]);let out='',cell=null,row=null;
  // Read visible text nodes only, excluding field instructions and style metadata.
  for(const token of xml.matchAll(/<hp:t(?:\s[^>]*)?>[\s\S]*?<\/hp:t>|<hp:tr\b[^>]*>|<hp:tc\b[^>]*>|<\/hp:(?:p|tc|tr)>/g)){
   const t=token[0];
   if(t.startsWith('<hp:t>')||/^<hp:t\s/.test(t)){
    const value=decodeEntities(t.replace(/^<hp:t[^>]*>|<\/hp:t>$/g,'').replace(/<hp:(?:lineBreak|fwSpace|nbSpace)[^>]*\/>/g,' ').replace(/<[^>]+>/g,''));
    if(cell!==null)cell+=value;else out+=value;
   }else if(t.startsWith('<hp:tr'))row=[];
   else if(t.startsWith('<hp:tc'))cell='';
   else if(t==='</hp:tc>'){if(row)row.push((cell||'').replace(/\s+/g,' ').trim());cell=null;}
   else if(t==='</hp:tr>'){if(row)out+='\n'+row.join(' | ')+'\n';row=null;}
   else if(cell!==null)cell+=' ';else out+='\n';
  }
  return out.replace(/\n{3,}/g,'\n\n').trim();
 }).join('\n\n').slice(0,160000);
}
