import{createHash}from"crypto";

export function decodeEntities(s=""){
 return s.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
}
export function htmlToText(html=""){
 let x=html.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<noscript[\s\S]*?<\/noscript>/gi," ");
 x=x.replace(/<br\s*\/?\s*>/gi,"\n").replace(/<\/(p|div|li|tr|h[1-6]|section|article|table|ul|ol)>/gi,"\n").replace(/<[^>]+>/g," ");
 return decodeEntities(x).replace(/\r/g,"").replace(/[ \t]+/g," ").replace(/ *\n */g,"\n").replace(/\n{3,}/g,"\n\n").trim();
}
function pick(html,patterns){
 const found=[];
 for(const re of patterns)for(const m of html.matchAll(re)){const t=htmlToText(m[1]);if(t.length>=80)found.push({html:m[1],text:t})}
 found.sort((a,b)=>b.text.length-a.text.length);
 return found[0]||null;
}
const COMMON=[
 /<article\b[^>]*>([\s\S]*?)<\/article>/gi,
 /<main\b[^>]*>([\s\S]*?)<\/main>/gi,
 /<(?:div|section)\b[^>]*(?:id|class)=["'][^"']*(?:board[_-]?view|view[_-]?(?:content|cont|body)|article[_-]?(?:content|body)|bbs[_-]?view|board[_-]?(?:content|cont)|detail[_-]?(?:content|cont)|content[_-]?view|txt[_-]?view)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi
];
const HOST_PATTERNS={
 "molit.go.kr":[/<(?:div|section)\b[^>]*(?:id|class)=["'][^"']*(?:view_cont|board_view|bbs_view|view_content)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi,...COMMON],
 "daejeon.go.kr":[/<(?:div|section)\b[^>]*(?:id|class)=["'][^"']*(?:board_view|view_cont|bbs_view|content)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi,...COMMON],
 "incheon.go.kr":[/<(?:div|section)\b[^>]*(?:id|class)=["'][^"']*(?:boardView|board_view|view_content|content)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi,...COMMON],
 "elis.go.kr":[/<(?:div|section)\b[^>]*(?:id|class)=["'][^"']*(?:content|detail|view|law)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi,...COMMON],
 "opinion.lawmaking.go.kr":[/<(?:div|section)\b[^>]*(?:id|class)=["'][^"']*(?:cont|content|view|detail|board)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi,...COMMON]
};
function hostname(url){try{return new URL(url).hostname.replace(/^www\./,"")}catch{return""}}
function abs(base,href){try{return new URL(href,base).toString()}catch{return null}}
export function extractAttachments(base,html){
 const out=[],seen=new Set(),re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
 for(const m of html.matchAll(re)){
  const url=abs(base,decodeEntities(m[1]).trim()),name=htmlToText(m[2])||"첨부파일";
  if(!url||seen.has(url))continue;
  if(!(/\.(pdf|hwp|hwpx|doc|docx|xls|xlsx|ppt|pptx|zip)(?:$|[?#])/i.test(url)||/(첨부|다운로드|파일)/.test(name)))continue;
  seen.add(url);out.push({name,url});
  if(out.length>=30)break;
 }
 return out;
}
export function parseOfficialDetail(url,html){
 const host=hostname(url),patterns=HOST_PATTERNS[host]||COMMON;
 const picked=pick(html,patterns);
 const text=(picked?.text||htmlToText(html)).slice(0,160000);
 const attachments=extractAttachments(url,html);
 const navNoise=/(홈|로그인|사이트맵|개인정보처리방침|저작권)/g;
 const noise=(text.match(navNoise)||[]).length;
 const complete=text.length>=250&&noise<12;
 return{host,text,attachments,complete,bodyHash:complete?createHash("md5").update(text).digest("hex"):null};
}
