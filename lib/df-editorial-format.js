// Pure editorial typography parser. Changes presentation, never source records.
// Preserves original sentences, numbers, legal clauses, dates and citations.
const clean=s=>String(s||"").replace(/\r\n?/g,"\n").replace(/[\u200b\u200c\u200d\ufeff]/g,"").replace(/\u00a0/g," ").trim();
const header=/^(?:#{1,4}\s+|[■◆◈▣]\s*|【[^】]{2,110}】$|\[[^\]]{3,100}\]$|제\s*\d+\s*[장절]\s+)/;
const bullet=/^(?:[□○●◎※✓✔☑☐•·▶▸①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]\s*|[-–]\s+|\d{1,2}[)]\s+)/;
const numbered=/^\d{1,2}[.．]\s+.{2,110}$/;
const quote=/^[“"][^\n]{8,240}[”"]$/;
const byline=/^(?:자료\s*(?:확인|출처)|출처\s*:|※\s*본\s*기사는|※\s*이\s*기사는|작성\s*기준\s*:)/;
const isHeading=s=>s.length<135&&(header.test(s)||numbered.test(s)&&s.length<85);
const isBullet=s=>bullet.test(s)&&s.length<700;
const trimHeading=s=>s.replace(/^#{1,4}\s*/,"").replace(/^[■◆◈▣]\s*/,"").trim();
const append=(out,kind,text)=>{if(text.trim())out.push({kind,text:text.trim()})};
export function parseEditorialBody(source,{dedupe=true}={}){
 const raw=clean(source);if(!raw)return[];
 const lines=raw.split("\n");
 const blocks=[];let buffer=[];
 const flush=()=>{if(buffer.length){append(blocks,"paragraph",buffer.join("\n"));buffer=[]}};
 for(const rawLine of lines){
  const line=rawLine.replace(/\t/g," ").trim();
  if(!line){flush();continue}
  if(isHeading(line)){flush();append(blocks,"heading",trimHeading(line));continue}
  if(byline.test(line)){flush();append(blocks,"note",line);continue}
  if(isBullet(line)){flush();append(blocks,"bullet",line);continue}
  if(quote.test(line)){flush();append(blocks,"quote",line);continue}
  // Official press text sometimes separates completed sentences with one newline.
  // Keep a paragraph boundary in that case, while preserving soft-wrapped clauses.
  const previous=buffer[buffer.length-1];
  if(previous&&previous.length>=50&&/[.!?。][”"]?$/.test(previous))flush();
  buffer.push(line);
  if(buffer.join("\n").length>520)flush();
 }
 flush();
 if(!dedupe)return blocks;
 // Collated official articles sometimes paste the introduction verbatim twice:
 // once under "핵심 내용" and again under "공식 문서 내용".
 // Suppress only substantial paragraphs with EXACTLY identical displayed text.
 // Even differing whitespace can affect the meaning of laws or figures.
 // Never remove short repeated lines, lists, facts, headings or disclaimers.
 const seen=new Set();
 return blocks.filter(b=>{
  if(b.kind!=="paragraph"||b.text.length<105)return true;
  const key=b.text;
  if(seen.has(key))return false;
  seen.add(key);return true;
 });
}
// Indices always refer to the rendered section list so every link has a target.
export function getEditorialOutline(sections,{minHeadings=3,longBodyChars=1800}={}){
 const headings=sections.flatMap((section,index)=>section.kind==="heading"?[{index,text:section.text}]:[]);
 if(headings.length<2)return[];
 const totalChars=sections.reduce((sum,section)=>sum+(section.kind==="list"?(section.items||[]).join("").length:(section.text||"").length),0);
 return headings.length>=minHeadings||totalChars>=longBodyChars?headings:[];
}
export const editorialPlainText=source=>clean(source);
export const safeOriginalUrl=source=>{try{const u=new URL(source);return u.protocol==="https:"?u.href:null}catch{return null}};
