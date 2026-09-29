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

function absUrl(base,href){try{return new URL(href,base).toString()}catch{return null}}
function norm(s=""){return htmlToText(s).replace(/\s+/g,"").replace(/[・·ㆍ]/g,"·").toLowerCase()}
function rowForTitle(html,title){
 const want=norm(title); if(!want)return"";
 const rows=[...html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(m=>m[0]);
 const exact=rows.find(r=>norm(r).includes(want));
 if(exact)return exact;
 const key=want.slice(0,Math.min(24,want.length));
 return rows.find(r=>norm(r).includes(key))||"";
}
function directHref(base,row){
 for(const m of row.matchAll(/href=["']([^"']+)["']/gi)){
  const h=decodeEntities(m[1]).trim();
  if(!h||/^javascript:/i.test(h)||h==="#")continue;
  if(/searchDetail|MediaView|mediaView|View\.do|view\.do|dtl\.jsp|Detail/i.test(h)){
   const u=absUrl(base,h);if(u)return u;
  }
 }
 for(const m of row.matchAll(/(?:onclick|href)=["'][^"']*?(https?:\/\/[^"'\s]+|\/[^"'\s]*(?:searchDetail|MediaView|View\.do|view\.do|dtl\.jsp)[^"'\s]*)/gi)){
  const u=absUrl(base,decodeEntities(m[1]));if(u)return u;
 }
 return null;
}
function incheonDetail(base,row,title,raw={}){
 const direct=directHref(base,row); if(direct&&/searchDetail/i.test(direct))return direct;
 const text=decodeEntities(row);
 let sno=(text.match(/[?&]sno=(\d{4,})/i)||text.match(/\bsno\D{0,12}(\d{4,})/i)||[])[1];
 let gbn=(text.match(/[?&]gosiGbn=([A-Za-z])/i)||text.match(/\bgosiGbn\D{0,12}([A-Za-z])/i)||[])[1];
 if(!sno){
  const nums=[...text.matchAll(/(?:['"(,=:\s])(\d{5,})(?=['"),&\s<])/g)].map(m=>m[1]).filter(x=>!/^20\d{6,}$/.test(x));
  if(nums.length)sno=nums[0];
 }
 if(!gbn){
  const official=String(raw?.official_number||"");
  gbn=/공고|공고열람|열람공고/.test(title)||/2026-1\d{3}/.test(official)?"A":"N";
 }
 if(!sno)return null;
 const u=new URL("/citynet/jsp/sap/SAPGosiBizProcess.do",base);
 u.searchParams.set("command","searchDetail");u.searchParams.set("flag","gosiGL");u.searchParams.set("gosiGbn",gbn);
 u.searchParams.set("sido","ic");u.searchParams.set("sno",sno);u.searchParams.set("svp","Y");
 return u.toString();
}
export function resolveOfficialDetailUrl(listUrl,html,title,raw={}){
 let host="";try{host=new URL(listUrl).hostname.replace(/^www\./,"")}catch{return null}
 if(!/searchList|MediaList|lgsltNtcList|rcntEstrevAlrList/i.test(listUrl))return listUrl;
 const row=rowForTitle(html,title);
 if(!row)return null;
 if(host==="announce.incheon.go.kr")return incheonDetail(listUrl,row,title,raw);
 const direct=directHref(listUrl,row); if(direct)return direct;
 if(host==="daejeon.go.kr"){
  const pop=row.match(/popupCenterNew\(['"]([^'"]+)['"]\s*,\s*['"](\d+)['"]\)/i);
  if(pop){
   const map={donggu:"http://eminwon.donggu.go.kr/",djjunggu:"http://eminwon.djjunggu.go.kr/",seogu:"http://eminwon.seogu.go.kr/",yuseonggu:"http://eminwon.yuseong.go.kr/",daedeokgu:"http://eminwon.daedeok.go.kr/"};
   const root=map[pop[1]];
   if(root)return root+"emwp/gov/mogaha/ntis/web/ofr/action/OfrAction.do?subCheck=Y&jndinm=OfrNotAncmtEJB&context=NTIS&method=selectOfrNotAncmt&methodnm=selectOfrNotAncmtRegst&not_ancmt_mgt_no="+pop[2];
  }
  const text=decodeEntities(row);
  const seq=(text.match(/(?:seq|nttId|boardId|sno|idx)\D{0,10}(\d{3,})/i)||[])[1];
  if(seq){
   const urls=[...row.matchAll(/["']([^"']*(?:MediaView|View\.do|view\.do)[^"']*)["']/gi)];
   if(urls.length)return absUrl(listUrl,decodeEntities(urls[0][1]));
  }
 }
 return null;
}
export function looksLikeListPage(url=""){return /searchList|MediaList|lgsltNtcList|rcntEstrevAlrList/i.test(url)}

function cleanLines(text=""){return text.split(/\n+/).map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean)}
export function extractOfficialKeyContent(text="",title=""){
 const lines=cleanLines(text);
 const skip=/^(홈|로그인|사이트맵|목록|이전|다음|첨부파일|출처|담당부서|등록일|게재일|공고번호|고시공고번호|제목)\b/;
 const titleNorm=norm(title);
 const substantive=[];
 for(const line of lines){
  const n=norm(line);
  if(!n||n===titleNorm||skip.test(line))continue;
  if(line.length<18)continue;
  if(/^(copyright|all rights reserved)/i.test(line))continue;
  substantive.push(line);
 }
 let picked=substantive.filter(x=>/(변경|결정|인가|지정|고시|공고|설치|시행|승인|계획|면적|규모|위치|기간|사업)/.test(x));
 if(!picked.length)picked=substantive;
 const out=[]; let chars=0;
 for(const x of picked){
  if(out.includes(x))continue;
  out.push(x); chars+=x.length;
  if(out.length>=6||chars>=700)break;
 }
 return out.join("\n");
}
export function extractOfficialFacts(text="",title="",raw={}){
 const lines=cleanLines(text), facts={};
 const all=lines.join(" ");
 const num=all.match(/(?:고시공고번호|고시|공고)\s*[:：]?\s*([^\n]{0,40}?20\d{2}\s*[-–—]\s*\d+호?)/);
 if(num)facts["공고번호"]=num[1].trim();
 const dept=all.match(/담당부서\s*[:：]?\s*([^\n]{2,40})/);
 if(dept)facts["담당부서"]=dept[1].trim();
 const date=all.match(/(?:등록일|게재일|고시일)\s*[:：]?\s*(20\d{2}[-.\/]\d{1,2}[-.\/]\d{1,2})/);
 if(date)facts["등록일"]=date[1];
 const area=all.match(/(\d[\d,]*(?:\.\d+)?\s*(?:㎡|m²|평|제곱미터))/i);
 if(area)facts["면적"]=area[1].replace(/\s+/g," ");
 const period=all.match(/(20\d{2}[.-]\s*\d{1,2}[.-]\s*\d{1,2}[.]?\s*(?:~|∼|부터)[^\n]{0,40})/);
 if(period)facts["기간"]=period[1].trim();
 if(raw?.official_number&&!facts["공고번호"])facts["공고번호"]=raw.official_number;
 return facts;
}
