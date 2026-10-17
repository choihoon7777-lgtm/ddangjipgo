// Shared article summary presentation for official news, original reporting
// and imported insight. Content fields are never mutated by this module.
const normalized=s=>String(s??"").replace(/\s+/g," ").trim();
const identity=s=>normalized(s).toLocaleLowerCase("ko-KR").replace(/[\s.,·!?()[\]“”"']/g,"");
const boilerplate=/^(?:세부\s*사항은\s*해당\s*기관의\s*자료로\s*확인해야\s*합니다\.?|공식\s*자료(?:를|는)\s*요약|원문(?:을|에서)\s*확인해야\s*합니다\.?|공식\s*지자체\s*정책[·ㆍ-]고시)$/;
function firstCompleteThought(raw,max=145){
 const s=normalized(raw);
 if(s.length<=max)return s;
 // Prefer an entire sentence over slicing an important caveat in half.
 const endings=[...s.matchAll(/[.!?。][”"']?(?=\s|$)/g)].map(m=>m.index+m[0].length);
 const end=endings.find(n=>n>=44&&n<=max);
 if(end)return s.slice(0,end).trim();
 // Other headlines contain no terminal punctuation: cut a teaser only.
 const words=s.slice(0,max).lastIndexOf(" ");
 if(words>=Math.floor(max*.65))return s.slice(0,words).trimEnd()+"…";
 return s.slice(0,max).trimEnd()+"…";
}
export function articleSummary(summary,{title="",maxHighlights=2}={}){
 if(!Array.isArray(summary))return "";
 const out=[],seen=new Set(),titleKey=identity(title);
 for(const candidate of summary){
  const raw=normalized(typeof candidate==="string"?candidate:typeof candidate?.text==="string"?candidate.text:"");
  if(raw.length<12||boilerplate.test(raw))continue;
  const text=firstCompleteThought(raw),key=identity(text);
  if(!key||key===titleKey||titleKey.length>15&&key.includes(titleKey)&&key.length<titleKey.length+20||seen.has(key))continue;
  if(out.some(p=>identity(p).includes(key)||key.includes(identity(p))))continue;
  seen.add(key);out.push(text);
  if(out.length>=maxHighlights)break;
 }
 return out.join(" ");
}
