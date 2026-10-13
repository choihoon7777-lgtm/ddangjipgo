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
  if(!url||!/^https?:\/\//i.test(url)||seen.has(url))continue;
  if(!(/\.(pdf|hwp|hwpx|doc|docx|xls|xlsx|ppt|pptx|zip)(?:$|[?#])/i.test(url)||/(첨부|다운로드|파일|\.(?:pdf|hwpx?|docx?|xlsx?|zip)$)/i.test(name)))continue;
  seen.add(url);out.push({name,url});
  if(out.length>=30)break;
 }
 return out;
}
export function parseOfficialDetail(url,html){
 const host=hostname(url);
 const incheon=host==="announce.incheon.go.kr";
 const body=incheon ? html.match(/<td\b[^>]*wrap=["']VIRTUAL["'][^>]*>([\s\S]*?)<\/td>/i)?.[1] : null;
 const matchedHost=Object.keys(HOST_PATTERNS).find(h=>host===h||host.endsWith("."+h));
 const picked=body!==null&&body!==undefined?{text:htmlToText(body)}:pick(html,HOST_PATTERNS[matchedHost]||COMMON);
 const metadata={};
 if(incheon)for(const m of html.replace(/<tr[^>]*>\s*<td[^>]*class=["']board_line["'][^>]*><\/td>\s*<\/tr>/gi,"").matchAll(/<th\b[^>]*>([\s\S]*?)<\/th>\s*<td\b[^>]*>([\s\S]*?)<\/td>/gi)){
  const label=htmlToText(m[1]).replace(/\s+/g,""),value=htmlToText(m[2]);
  if(["고시/공고번호","담당부서","게재일자","제목"].includes(label)&&value)metadata[label]=value;
 }
 const text=(picked?.text||"").slice(0,160000);
 const attachments=extractAttachments(url,html);
 const noise=(text.match(/로그인|사이트맵|개인정보처리방침|저작권/g)||[]).length;
 const complete=!!picked&&text.length>=40&&noise<3&&!/접근이 차단|요청하신 페이지를 찾을 수|비정상적인 접근/.test(text);
 return{host,text,metadata,attachments,complete,bodyHash:complete?createHash("md5").update(text).digest("hex"):null};
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
 if(!/searchList|MediaList|lgsltNtcList|rcntEstrevAlrList|locgovAlrPopup/i.test(listUrl))return listUrl;
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
export function looksLikeListPage(url=""){return /searchList|MediaList|lgsltNtcList|rcntEstrevAlrList|locgovAlrPopup/i.test(url)}

function cleanLines(text=""){return text.split(/\n+/).map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean)}
export function extractOfficialKeyContent(text="",title=""){
 const titleNorm=norm(title),out=[];
 const skip=/^(?:홈|로그인|사이트맵|목록|이전글|다음글|첨부파일|출처|담당부서|등록일|게재일|공고번호|고시공고번호|제목)(?:\s|[:：]|$)/;
 for(const line of cleanLines(text)){
  if(norm(line)===titleNorm||skip.test(line)||line.length<18||/copyright|all rights reserved|개인정보처리방침/i.test(line))continue;
  if(!/(변경|결정|인가|지정|고시|공고|설치|시행|승인|계획|면적|규모|위치|기간|사업|계약액|증가|감소|조원|억원)/.test(line))continue;
  if(out.includes(line))continue;
  out.push(line);
  if(out.length>=6||out.join("\n").length>=900)break;
 }
 return out.join("\n");
}
export function extractOfficialFacts(text="",title="",raw={}){
 const facts={},values=new Map();
 // Keep each labelled value on its own source line; never merge adjacent fields.
 const labels=/^(?:\d+[.)]\s*)?(?:[○❍□▪•※*-]\s*)?(공고번호|고시공고번호|고시\/공고번호|담당부서|등록일|게재일자|고시일|위치|사업위치|소재지|면적|사업면적|규모|사업규모|기간|사업기간|열람기간|의견제출기간|산업단지 위치|산업단지 면적|사업시행기간|준공예정일|착수예정일)\s*[:：]\s*(.+)$/;
 for(const line of cleanLines(text)){
  const m=line.match(labels);
  if(m&&m[2].length<=240){if(!values.has(m[1]))values.set(m[1],new Set());values.get(m[1]).add(m[2]);}
 }
 for(const [label,entries] of values)if(entries.size===1)facts[label]=[...entries][0];
 if(raw?.official_number&&!facts["공고번호"])facts["공고번호"]=raw.official_number;
 return facts;
}
