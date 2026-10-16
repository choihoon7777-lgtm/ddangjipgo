import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const SUPABASE_ENDPOINT = Deno.env.get("SUPABASE_URL") || "";
const SECRET = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || (()=>{try{return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}").default||""}catch{return""}})();
const db = createClient(SUPABASE_ENDPOINT, SECRET, {auth:{persistSession:false,autoRefreshToken:false}});
const terms=["도시계획","도시관리","지구단위","도시개발","개발계획","개발사업","재개발","재건축","정비구역","정비계획","산업단지","산단","주택","건축","토지","지형도면","도로","건설","반도체","철도","GTX","광역급행","교통망","신도시","공원","하천","하수도","용도지역","용도구역","공공주택","역세권","특구","연구개발특구","인구감소지역","글로벌 AI 허브","혁신연구소","지역균형발전","첨단산업","혁신도시","국가산단","지적재조사","입법예고","조례","규칙"];
const excludes=["채용","인사발령","공시송달","담배소매","과태료","입찰결과","수의계약","물품구매","안전점검 수행기관","평가 결과 상위 업체","도로점용","입찰","선정위원","등록말소"];
const fallback:Record<string,string>={"국토교통부":"https://www.molit.go.kr/USR/NEWS/m_71/lst.jsp","경기도 자동수집":"https://gnews.gg.go.kr/briefing/brief_gongbo.do?BS_CODE=s017&page=1&subject_Code=BO01","과학기술정보통신부":"https://www.msit.go.kr/bbs/list.do?sCode=user&mId=307&mPid=208&bbsSeqNo=94","행정안전부":"https://www.mois.go.kr/frt/bbs/type010/commonSelectBoardList.do?bbsId=BBSMSTR_000000000008","세종특별자치시 자동수집":"https://www.sejong.go.kr/prog/publicNotice/kor/sub02_030301/C1_1/list.do","경상북도 자동수집":"https://gb.go.kr/page/link.do?mn=10109&pageNo=67","대구광역시 자동수집":"https://info.daegu.go.kr/newshome/mtnmain.php?mtnkey=todaylist","광주광역시 자동수집":"https://www.gwangju.go.kr/boardList.do?boardId=BD_0000000027&pageId=www789","충청남도 자동수집":"https://www.chungnam.go.kr/cnportal/cnapcPressList/cnapcPress/list.do?menuNo=500498","인천광역시 자동수집":"https://www.incheon.go.kr/mayor_9/MA05010000","충청북도 자동수집":"https://www.chungbuk.go.kr/www/selectGosiPblancList.do?key=422&pageIndex=1&pageUnit=20&searchCnd=all"};
const relevant=(s:string)=>terms.some(k=>s.includes(k))&&!excludes.some(k=>s.includes(k));
const entities=(s:string)=>s.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
const text=(html:string)=>entities(html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<br\b[^>]*>/gi,"\n").replace(/<\/(?:p|div|article|section|li|tr|h[1-6])>/gi,"\n").replace(/<[^>]*>/g," ").replace(/[ \t\u00a0]+/g," ").replace(/\n{3,}/g,"\n\n")).trim();
const tag=(s:string,k:string)=>{const raw=s.match(new RegExp("<"+k+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+k+">","i"))?.[1]||"";return text(raw.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,(_,inner)=>inner));};
const hash=async(s:string)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s)))).map(b=>b.toString(16).padStart(2,"0")).join("");
const cors=(req:Request)=>{
 const o=req.headers.get("origin")||"";
 const ok=/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(o)||/^https:\/\/[a-z0-9.-]+\.go\.kr$/i.test(o);
 return {"Access-Control-Allow-Origin":ok?o:"null","Access-Control-Allow-Methods":"GET,POST,OPTIONS","Access-Control-Allow-Headers":"content-type,apikey,x-client-info","Vary":"Origin","Cache-Control":"no-store"};
};
const respond=(req:Request,status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:{...cors(req),"Content-Type":"application/json; charset=utf-8"}});
const allowed=(u:URL)=>u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&/\.go\.kr$/.test(u.hostname);
async function download(value:string,timeout=12000){
 let u=new URL(value);
 for(let i=0;i<4;i++){
  if(!allowed(u))throw new Error("OFFICIAL_HOST_REQUIRED");
  const abort=new AbortController();const timer=setTimeout(()=>abort.abort(),timeout);
  try{
   const res=await fetch(u.toString(),{signal:abort.signal,redirect:"manual",headers:{"User-Agent":"DevelopmentFocus/1.0 (Official-Source-Collector)","Accept":"text/html,application/rss+xml,application/xml;q=0.9,*/*;q=0.5"}});
   if([301,302,303,307,308].includes(res.status)){const location=res.headers.get("location");if(!location)throw new Error("REDIRECT_MISSING");u=new URL(location,u);continue}
   if(!res.ok)throw new Error("HTTP_"+res.status);
   const contentType=res.headers.get("content-type")||"";
   if(/pdf|octet-stream|msword|hwp|zip/i.test(contentType))throw new Error("ATTACHMENT_REQUIRES_EXTRACTION");
   const len=Number(res.headers.get("content-length")||0);if(len>2500000)throw new Error("BODY_TOO_LARGE");
   const bytes=new Uint8Array(await res.arrayBuffer());if(bytes.length>2500000)throw new Error("BODY_TOO_LARGE");
   const encoding=/euc-kr|cp949|ks_c_5601/i.test(contentType)?"euc-kr":"utf-8";
   return {url:u.href,raw:new TextDecoder(encoding).decode(bytes),type:contentType};
  }finally{clearTimeout(timer)}
 }
 throw new Error("REDIRECT_LIMIT");
}
type Item={title:string;link:string;published:string|null;snippet:string;officialBody?:string;hasAttachments?:boolean;detailApi?:string};
const officialLink=(base:string,path:string)=>{try{const u=new URL(entities(path),base);return allowed(u)?u.href:""}catch{return""}};
const parseDate=(s:string):string|null=>{
 const m=s.match(/^(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})/);
 if(m){
  const date=new Date(m[1]+"-"+m[2].padStart(2,"0")+"-"+m[3].padStart(2,"0")+"T00:00:00+09:00");
  return Number.isNaN(date.getTime())?null:date.toISOString();
 }
 const time=Date.parse(s.replace(/\sKST$/i," +0900"));return Number.isNaN(time)?null:new Date(time).toISOString();
};
function discover(base:string,raw:string):Item[]{
 const out:Item[]=[],seen=new Set<string>();
 // Daegu government newsroom: actual article URLs, dates and titles are
 // present in date-labelled list items (not HTML table rows).
 if(new URL(base).hostname==="info.daegu.go.kr"&&new URL(base).searchParams.get("mtnkey")==="todaylist"){
  for(const li of raw.matchAll(/<li\b[^>]*>[\s\S]*?<\/li>/gi)){
   const block=li[0];
   const a=block.match(/<a\b[^>]*href=["']([^"']*mtnkey=articleview[^"']*)["']/i);
   const head=block.match(/<p\b[^>]*class=["'][^"']*\btitle\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
   const date=block.match(/<p\b[^>]*class=["'][^"']*\bdate\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
   if(!a||!head||!date)continue;
   const title=text(head[1]),link=officialLink(base,a[1]),published=parseDate(text(date[1]));
   if(!relevant(title)||title.length<9||title.length>190||!link||!published||seen.has(link))continue;
   const intro=block.match(/<p\b[^>]*class=["'][^"']*\bcontext\b[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
   seen.add(link);out.push({title,link,published,snippet:intro?text(intro[1]).slice(0,1100):""});
   if(out.length>=8)break;
  }
  return out;
 }
 // Jeju's official government website supplies a JSON index and JSON detail
 // API; the HTML listing only contains Vue templates with no actual notices.
 if(new URL(base).hostname==="www.jeju.go.kr"&&new URL(base).pathname==="/tool/sido/api.jsp"){
  try{
   const payload=JSON.parse(raw);
   if(payload?.act==="index"&&Array.isArray(payload.gosis)){
    for(const row of payload.gosis){
     const title=String(row.title||"").trim();
     const number=String(row.no||""),gb=String(row.gb||"");
     if(!relevant(title)||!/^[0-9]{3,12}$/.test(number)||!/^[ANPE]$/.test(gb))continue;
     const published=parseDate(String(row.date||""));
     const link=officialLink(base,"/news/news/law.htm#"+gb+"_"+number);
     const detailApi=officialLink(base,"/tool/sido/api.jsp?act=view&gb="+gb+"&no="+number);
     if(!link||!detailApi||seen.has(link))continue;
     seen.add(link);out.push({title,link,published,snippet:"",detailApi});
     if(out.length>=8)break;
    }
   }
  }catch{}
  return out;
 }



 // Gyeonggi's first-party newsroom is reachable when its notice homepage
 // blocks data-center traffic. Select only the dated press rows, never menus.
 if(new URL(base).hostname==="gnews.gg.go.kr"&&new URL(base).pathname==="/briefing/brief_gongbo.do"){
  for(const row of raw.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)){
   const block=row[0];
   const a=block.match(/<a\b[^>]*href=["']([^"']*\/briefing\/brief_gongbo_view\.do[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
   const date=block.match(/<td\b[^>]*class=["']date["'][^>]*>([\s\S]*?)<\/td>/i);
   if(!a||!date)continue;
   const title=text(a[2]),published=parseDate(text(date[1]));
   const rawLink=officialLink(base,a[1]);
   if(!rawLink)continue;
   const u=new URL(rawLink);u.pathname=u.pathname.replace(/;jsessionid=[A-Za-z0-9.]+/,"");
   const link=officialLink(base,u.toString());
   if(!relevant(title)||title.length<9||!link||!published||seen.has(link))continue;
   seen.add(link);out.push({title,link,published,snippet:"",hasAttachments:/class=["']file["']/.test(block)});
   if(out.length>=8)break;
  }
  return out;
 }

 // Chungnam's verified official press desk publishes a dated table with
 // first-party detail URLs. Never use the supplementary HTTP/IP mirror links.
 if(new URL(base).hostname==="www.chungnam.go.kr"&&new URL(base).pathname.endsWith("/cnapcPress/list.do")){
  for(const row of raw.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)){
   const block=row[0];
   const a=block.match(/<a\b[^>]*href=["']([^"']*\/cnportal\/cnapcPressList\/cnapcPress\/view\.do\?[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
   const date=block.match(/20\d{2}-\d{2}-\d{2}/);
   if(!a||!date)continue;
   const title=text(a[2]),link=officialLink(base,a[1]),published=parseDate(date[0]);
   if(!relevant(title)||title.length<9||!link||!published||seen.has(link))continue;
   seen.add(link);out.push({title,link,published,snippet:""});
   if(out.length>=8)break;
  }
  return out;
 }
 // Gwangju's official newsroom is a div-based dated board, not a table.
 if(new URL(base).hostname==="www.gwangju.go.kr"&&new URL(base).pathname==="/boardList.do"&&new URL(base).searchParams.get("boardId")==="BD_0000000027"){
  for(const m of raw.matchAll(/<div class="body_row">/gi)){
   const block=raw.slice(m.index||0,(m.index||0)+5000);
   const anchor=block.match(/<a\b[^>]*href=["']([^"']*\/boardView\.do\?[^"']+)["'][^>]*title=["']([^"']+)["'][^>]*>/i);
   const dated=block.match(/<div class="date">[\s\S]{0,240}?(20\d{2}-\d{2}-\d{2})/i);
   if(!anchor||!dated)continue;
   const title=text(anchor[2]),link=officialLink(base,anchor[1]),published=parseDate(dated[1]);
   if(!relevant(title)||title.length<9||!link||!published||seen.has(link))continue;
   seen.add(link);out.push({title,link,published,snippet:""});
   if(out.length>=8)break;
  }
  return out;
 }
 // Gyeongbuk's board references its documented boardList.view(boardNo)
 // handler. The handler submits to /board/view.do with boardMngNo=71.
 if(new URL(base).hostname==="www.gb.go.kr"&&new URL(base).pathname==="/page/link.do"&&new URL(base).searchParams.get("mn")==="10109"){
  for(const row of raw.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)){
   const block=row[0];
   const boardNo=block.match(/onclick=["']boardList\.view\(['"](\d{5,12})['"]\);?["']/i)?.[1];
   const headline=block.match(/<a\b[^>]*class=["'][^"']*board_title[^"']*["'][^>]*>[\s\S]*?<p\b[^>]*class=["']except["'][^>]*>([\s\S]*?)<\/p>/i)?.[1];
   const dated=block.match(/20\d{2}-\d{2}-\d{2}/);
   if(!boardNo||!headline||!dated)continue;
   const title=text(headline).replace(/\bNEW\b/g,"").trim(),published=parseDate(dated[0]);
   const link=officialLink(base,"/board/view.do?boardNo="+boardNo+"&boardMngNo=71&mn=10109&pageNo=67");
   if(!relevant(title)||title.length<9||!link||!published||seen.has(link))continue;
   seen.add(link);out.push({title,link,published,snippet:"",hasAttachments:/class=["'][^"']*file_icons/.test(block)});
   if(out.length>=8)break;
  }
  return out;
 }

 for(const m of raw.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)){
  const b=m[1],title=tag(b,"title"),link=officialLink(base,tag(b,"link")||tag(b,"guid")),published=tag(b,"pubDate")||tag(b,"dc:date"),snippet=tag(b,"description").slice(0,1200);
  if(!relevant(title)||!link||seen.has(link))continue;
  const rawBody=b.match(/<(?:cn|content:encoded)(?:\s[^>]*)?>([\s\S]*?)<\/(?:cn|content:encoded)>/i)?.[1]||"";
  const cleaned=text(rawBody.replace(/&lt;!--\[data-hwpjson\][\s\S]*/i,"").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,(_,inner)=>inner).slice(0,300000));
  const attached=/<fileUrl>|<fileCnt>[1-9]/i.test(b);
  seen.add(link);out.push({title,link,published:parseDate(published),snippet,officialBody:cleaned.length>=140?cleaned:(snippet.length>=300?snippet:""),hasAttachments:attached});
  if(out.length>=8)break;
 }
 if(out.length)return out;
 // Incheon's government press releases are published as dated article cards.
 // Never infer entries from its header/navigation links.
 if(new URL(base).hostname==="www.incheon.go.kr"&&new URL(base).pathname==="/mayor_9/MA05010000"){
  for(const a of raw.matchAll(/<a\b[^>]*href=["']([^"']*\/mayor_9\/MA05010000\/view\?[^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
   const b=a[2];
   const head=b.match(/<strong\b[^>]*class=["'][^"']*\bsubject\b[^"']*["'][^>]*>([\s\S]*?)<\/strong>/i);
   const date=b.match(/<dt>\s*제공일자\s*<\/dt>\s*<dd>\s*(20\d{2}[-./]\d{1,2}[-./]\d{1,2})\s*<\/dd>/i);
   if(!head||!date)continue;
   const title=text(head[1]),link=officialLink(base,a[1]),published=parseDate(date[1]);
   if(!relevant(title)||!link||seen.has(link)||title.length<9)continue;
   const short=b.match(/<div\b[^>]*class=["'][^"']*\btxt\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
   seen.add(link);out.push({title,link,published,snippet:short?text(short[1]).slice(0,500):""});
   if(out.length>=8)break;
  }
 }
 if(out.length)return out;
 // Only parse rows with an explicit publication date and an official detail href.
 for(const row of raw.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)){
  const block=row[0],plain=text(block);
  const match=plain.match(/(20\d{2})[-./]\s*(\d{1,2})[-./]\s*(\d{1,2})/);
  if(!match)continue;
  const published=`${match[1]}-${match[2].padStart(2,"0")}-${match[3].padStart(2,"0")}T00:00:00+09:00`;
  // Daegu's notice list uses a fixed JavaScript view callback instead of a direct href.
  // The sno/gosi_gbn URL structure is published on Daegu's own notice detail pages.
  if(new URL(base).hostname==="www.daegu.go.kr"&&new URL(base).searchParams.get("menu_id")==="00940170"){
   for(const a of block.matchAll(/<a\b[^>]*href=["']javascript:fn_goLinkView\(['"](\d{3,10})['"]\s*,\s*['"]([A-Za-z])['"]\)["'][^>]*>([\s\S]*?)<\/a>/gi)){
    const title=text(a[3]);
    if(!relevant(title)||title.length<9)continue;
    const detail=new URL(base);
    detail.searchParams.set("menu_link","/front/daeguSidoGosi/daeguSidoGosiView.do");
    detail.searchParams.set("sno",a[1]);detail.searchParams.set("gosi_gbn",a[2]);
    const link=officialLink(base,detail.toString());
    if(!link||seen.has(link))continue;
    seen.add(link);out.push({title,link,published,snippet:""});break;
   }
   if(out.length>=8)break;
   continue;
  }
  // The Gangwon official notice board uses goPage(id) rather than an href.
  if(new URL(base).hostname==="state.gwd.go.kr"&&new URL(base).pathname.endsWith("/announce")){
   for(const a of block.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)){
    const seq=a[1].match(/onclick=["']\s*goPage\((\d{4,12})\)/)?.[1];
    const title=text(a[2]);
    if(!seq||!relevant(title)||title.length<9)continue;
    const link=officialLink(base,"?articleSeq="+seq);
    if(!link||seen.has(link))continue;
    seen.add(link);out.push({title,link,published,snippet:""});break;
   }
   if(out.length>=8)break;
   if(out.length)continue;
  }
  for(const a of block.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
   const title=text(a[2]),link=officialLink(base,a[1]);
   if(!relevant(title)||title.length<9||title.length>190||!link||seen.has(link))continue;
   if(/\b(list|search|rss|index)\b/i.test(new URL(link).pathname.split("/").pop()||"")||link===base)continue;
   seen.add(link);out.push({title,link,published,snippet:""});
   break;
  }
  if(out.length>=8)break;
 }
 // Gyeonggi official home SSRs notices in date-labelled <li> cards, while
 // its board.do list is loaded by browser AJAX. Only accept documented boardView links.
 if(!out.length&&new URL(base).hostname==="www.gg.go.kr"){
  for(const li of raw.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)){
   const block=li[1];
   const dateMatch=block.match(/(20\d{2})[.\/-](\d{1,2})[.\/-](\d{1,2})/);
   const anchor=block.match(/<a\b[^>]*href=["']([^"']*\/bbs\/boardView[.]do\?[^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
   if(!dateMatch||!anchor||!/(?:[?&]|&amp;)bsIdx=469(?:&|$)/.test(anchor[1]))continue;
   const title=text(anchor[2].match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1]||"");
   const link=officialLink(base,anchor[1]);
   if(!relevant(title)||title.length<9||!link||seen.has(link))continue;
   const published=parseDate(dateMatch[0]);
   seen.add(link);out.push({title,link,published,snippet:""});
   if(out.length>=8)break;
  }
 }
 return out;
}
// Distinguish a working dated official notice board with no relevant entries
// from a transport/HTML parser failure. Never treat the government home page
// alone as evidence of a successful notice feed.
function isValidatedNoRelevantBoard(base:string,html:string){
 let datedDetails=0;
 for(const match of html.matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)){
  const row=match[0];
  if(!/20\d{2}[.\/-]\s*\d{1,2}[.\/-]\s*\d{1,2}/.test(row))continue;
  const anchors=[...row.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)];
  if(anchors.some(a=>{
   const url=officialLink(base,a[1]);
   return !!url&&/(?:\/view|\/board|\/bbs|gosi|pblanc|page\.do|list\.ulsan)/i.test(new URL(url).pathname);
  }))datedDetails++;
  if(datedDetails>=2)return true;
 }
 return false;
}
function channelUrls(base:string,html:string){
 const links:string[]=[],seen=new Set<string>();
 for(const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)){
  const caption=text(match[2]).replace(/\s+/g," ");
  if(!/(고시.{0,3}공고|고시공고|보도자료|입법예고|공보|공지사항)/.test(caption))continue;
  const link=officialLink(base,match[1]);
  if(!link||link===base||seen.has(link))continue;
  seen.add(link);links.push(link);
  if(links.length>=4)break;
 }
 return links;
}
function bodyFrom(raw:string,title:string){
 const candidates:string[]=[];
 const patterns=[
  /<div\b[^>]*class=["'][^"']*\bpostBody\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
  /<article\b[^>]*>([\s\S]*?)<\/article>/gi,
  /<main\b[^>]*>([\s\S]*?)<\/main>/gi,
  /<(?:div|section)\b[^>]*(?:id|class)=["'][^"']*(?:view[_-]?cont|board[_-]?view|bbs[_-]?view|article[_-]?body|content[_-]?view|view[_-]?body|view_content)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi,
  /<td\b[^>]*wrap=["']VIRTUAL["'][^>]*>([\s\S]*?)<\/td>/gi
 ];
 for(const re of patterns)for(const m of raw.matchAll(re)){
  const content=text(m[1]);if(content.length>=220&&content.length<=85000)candidates.push(content);
 }
 let selected=candidates.sort((a,b)=>a.length-b.length)[0]||"";
 if(/고시공고\(시도행정연계\)|고시\/공고 번호/.test(selected)){
  const start=selected.indexOf("첨부파일");
  const end=selected.indexOf("이전글",Math.max(start,0));
  if(start>=0&&end>start)selected=selected.slice(start+"첨부파일".length,end).trim();
  else if(start>=0)selected=selected.slice(start+"첨부파일".length).trim();
 }
 const pageText=text(raw.slice(0,280000));
 const prefix=title.replace(/\s+/g,"").slice(0,8);
 const pageMatch=pageText.replace(/\s+/g,"").includes(prefix);
 const noise=(selected.match(/개인정보처리방침|로그인|회원가입|사이트맵|전체메뉴|저작권|이전글|다음글/g)||[]).length;
 if(!pageMatch||noise>1||selected.length<140||selected.length>250000)return "";
 return selected;
}
function summary(body:string,title=""){
 const normalize=(s:string)=>s.replace(/[^0-9a-z가-힣]/gi,"").toLowerCase();
 const normalizedTitle=normalize(title);
 const lines=body.replace(/\r/g,"").split(/\n+/).map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean);
 const selected:string[]=[],seen=new Set<string>();
 for(const line of lines){
  if(line.length<20||/저작권|개인정보처리방침|미리보기|다운로드|^첨부파일|^서울특별시장$|^공고 제\d/i.test(line))continue;
  const flat=normalize(line);
  // Headline repetition is not a substantive summary.
  if(!flat||seen.has(flat)||normalizedTitle&&flat===normalizedTitle)continue;
  if(!/(고시|공고|변경|계획|면적|사업|인가|지정|결정|지역|주택|개발|기간|준공|공급|하천|공원|일시|장소|의견|토지|조례|규제|보상|건축|철도|도시|용도|기준|분양|공청회)/.test(line)&&!/\b20\d{2}[.\/-]\s*\d{1,2}/.test(line))continue;
  selected.push(line);seen.add(flat);
  // No editorial length limit: retain every relevant verified source paragraph.
 }
 return selected.join("\n");
}
async function collectRow(source:any,item:Item){
 const now=new Date().toISOString();
 const baseSource=await db.from("df_source_documents").select("id,title,content_text,content_hash,detail_status,key_content,raw_payload,body_hash,published_at").eq("source_id",source.id).eq("external_id",item.link).maybeSingle();
 if(baseSource.error)throw baseSource.error;
 let old=baseSource.data;
 if(!old){
  const [byUrl,byTitle]=await Promise.all([
   db.from("df_source_documents").select("id").eq("source_url",item.link).limit(1).maybeSingle(),
   db.from("df_source_documents").select("id").eq("source_id",source.id).eq("title",item.title).limit(1).maybeSingle()
  ]);
  if(byUrl.error||byTitle.error)throw byUrl.error||byTitle.error;
  if(byUrl.data||byTitle.data)return "duplicate";
 }
 let verified=false,body="",keyContent="",error="",usedFeedBody=false;
 try{
  if(item.detailApi){
   const detail=await download(item.detailApi,12000);
   const j=JSON.parse(detail.raw);
   if(j.error||!j.gosi||String(j.gosi.title||"").replace(/\s+/g,"")!==item.title.replace(/\s+/g,""))throw new Error("JEJU_OFFICIAL_DETAIL_MISMATCH");
   body=text(String(j.gosi.content||""));
   item.hasAttachments=Number(j.gosi.fileCount||0)>0||Array.isArray(j.gosi.gosiFiles)&&j.gosi.gosiFiles.length>0;
  }else if(item.officialBody&&item.officialBody.length>=140){
   usedFeedBody=true;
   // Seoul city publishes the authenticated notice body inside its official RSS <cn>.
   // For hash-based view links, downloading the list page would discard that body.
   body=item.officialBody;
  }else{
   const fetched=await download(item.link,10500);
   body=bodyFrom(fetched.raw,item.title);
  }
  keyContent=summary(body,item.title);
  verified=body.length>=140&&keyContent.length>=45&&!!item.published;
  if(!verified)error="OFFICIAL_BODY_OR_DATE_NOT_VERIFIED";
 }catch(e){error=String(e instanceof Error?e.message:e).slice(0,150)}
 if(!old){
  const hasAttachment=item.hasAttachments||/\.hwpx?|\.pdf|첨부파일/i.test(body);
  const rightsHold=source.name==="전북특별자치도 자동수집";
  const payload={collector:"fixed_public_official",source_type:source.source_type,collector_kind:source.collector_kind,channel:/입법예고|조례|규칙/.test(item.title)?"입법예고":/고시|공고|계획/.test(item.title)?"고시공고":"보도자료",category_hint:"정책·고시",region_code:source.region_code||null,public_hidden:!verified||rightsHold,auto_hidden:!verified||rightsHold,rights_requires_review:rightsHold,needs_detail_fetch:!verified||usedFeedBody,detail_ok:verified&&!usedFeedBody&&!hasAttachment,feed_excerpt_only:usedFeedBody,attachments_detected:!!hasAttachment,attachment_text_extracted:false,last_detail_error:error||null};
  const idHash=await hash(item.link);
  const cHash=await hash(body||item.snippet||item.title);
  const record={source_id:source.id,external_id:item.link,canonical_key:idHash,title:item.title,source_url:item.link,detail_url:item.link,published_at:item.published,content_text:verified?body:item.snippet||item.title,content_hash:cHash,body_hash:verified?cHash:null,detail_status:verified?(hasAttachment||usedFeedBody?"partial":"complete"):"queued",detail_retry_count:0,detail_completed_at:verified?now:null,last_checked_at:now,key_content:verified?keyContent:null,key_extract_status:verified?"ready":"pending",key_extracted_at:verified?now:null,raw_payload:payload,verification_status:verified?"verified":"pending"};
  const insert=await db.from("df_source_documents").insert(record).select("id").single();
  if(insert.error){if(insert.error.code==="23505")return"duplicate";throw insert.error}
  if(verified)await db.from("df_source_document_versions").insert({document_id:insert.data.id,content_hash:cHash,title:item.title,content_text:body,source_url:item.link,source_published_at:item.published});
  return verified?"created_published":"created_pending";
 }
 if(!verified){
  const patch:any={last_checked_at:now};
  if(old.detail_status!=="complete"&&old.detail_status!=="partial")patch.detail_status="queued";
  const r=await db.from("df_source_documents").update(patch).eq("id",old.id);
  if(r.error)throw r.error;
  return "unchanged_pending";
 }
 const same=old.content_text===body;
 if(same){
  const keyChanged=keyContent.length>=45&&old.key_content!==keyContent;
  const patch:any={last_checked_at:now};
  if(keyChanged){patch.key_content=keyContent;patch.key_extract_status="ready";patch.key_extracted_at=now;}
  const r=await db.from("df_source_documents").update(patch).eq("id",old.id);
  if(r.error)throw r.error;
  return keyChanged?"summary_refreshed":"unchanged";
 }
 // Preserve curated manual data. Do not overwrite an already verified detail without review.
 if(old.detail_status==="complete"||old.raw_payload?.collector==="manual_official_source_verification"){
  const r=await db.from("df_source_documents").update({last_checked_at:now,raw_payload:{...old.raw_payload,source_change_candidate:true}}).eq("id",old.id);
  if(r.error)throw r.error;
  return "change_pending_review";
 }
 const cHash=await hash(body);
 const hasAttachment=item.hasAttachments||/\.hwpx?|\.pdf|첨부파일/i.test(body);
 const upd=await db.from("df_source_documents").update({title:item.title,content_text:body,content_hash:cHash,body_hash:cHash,detail_status:hasAttachment||usedFeedBody?"partial":"complete",detail_completed_at:now,key_content:keyContent,key_extract_status:"ready",key_extracted_at:now,verification_status:"verified",raw_payload:{...(old.raw_payload||{}),public_hidden:false,auto_hidden:false,needs_detail_fetch:usedFeedBody,detail_ok:!usedFeedBody&&!hasAttachment,feed_excerpt_only:usedFeedBody,attachments_detected:!!hasAttachment,attachment_text_extracted:false,last_detail_error:null},last_checked_at:now}).eq("id",old.id);
 if(upd.error)throw upd.error;
 await db.from("df_source_document_versions").upsert({document_id:old.id,content_hash:cHash,title:item.title,content_text:body,source_url:item.link,source_published_at:item.published},{onConflict:"document_id,content_hash",ignoreDuplicates:true});
 return"completed_published";
}
async function runBatch(batch:number){
 const claimAt=new Date().toISOString(),limit=new Date(Date.now()-15*60*1000).toISOString();
 const locked=await db.from("df_public_collection_claims").update({claimed_at:claimAt,last_status:"running"}).eq("batch_id",batch).lt("claimed_at",limit).select("batch_id").maybeSingle();
 if(locked.error)throw locked.error;
 if(!locked.data)return {busy:true,batch,message:"동일 기관 묶음은 15분 간격으로 다시 수집할 수 있습니다."};
 const sourcesRes=await db.from("df_sources").select("id,name,feed_url,base_url,region_code,collector_kind,source_type").eq("is_active",true).eq("collector_enabled",true).order("name").range(batch*3,batch*3+2);
 if(sourcesRes.error)throw sourcesRes.error;
 const results:any[]=[];
 for(const source of sourcesRes.data||[]){
  const stats:any={source:source.name,found:0,created:0,published:0,pending:0,duplicate:0,changed:0,failed:0};
  try{
   let current;
   const primary=source.collector_kind==="local_auto"&&fallback[source.name]
    ?fallback[source.name]:(source.feed_url||source.base_url);
   try{current=await download(primary,11000)}catch(e){
    const alternate=primary===source.feed_url||primary===source.base_url
     ?fallback[source.name]:source.feed_url||source.base_url;
    if(!alternate||alternate===primary)throw e;
    try{current=await download(alternate,11000)}catch{throw e}
   }
   // Prefer a verified official board to the site homepage on auto-discovery
   // sources. A homepage may be healthy yet contain no document detail links.
   let items=discover(current.url,current.raw);
   const board=fallback[source.name]||"";
   if(!items.length&&board&&source.collector_kind==="local_auto"&&current.url!==board){
    try{
     const page=await download(board,11000);
     current=page;
     items=discover(page.url,page.raw);
    }catch{/* Keep original evidence and report failure if no valid list exists. */}
   }
   if(!items.length&&fallback[source.name as keyof typeof fallback]&&current.url!==fallback[source.name as keyof typeof fallback]){
    try{const other=await download(fallback[source.name as keyof typeof fallback],11000);current=other;items=discover(other.url,other.raw)}catch{/* Continue with diagnostic evidence for the first verified page. */}
   }
   if(!items.length&&source.collector_kind==="local_auto"){
    const candidates=channelUrls(current.url,current.raw);
    for(const candidate of candidates){
     try{
      const page=await download(candidate,9000);
      const links=discover(page.url,page.raw);
      for(const item of links)if(!items.find(x=>x.link===item.link))items.push(item);
     }catch{}
     if(items.length>=8)break;
    }
    items=items.slice(0,8);
   }
   // Valid official RSS with no matching development content is NOT a failed connection.
   const validButFiltered=(new URL(current.url).hostname==="info.daegu.go.kr"&&/mtnkey=articleview/.test(current.raw)&&/class=["']date["']/.test(current.raw))||isValidatedNoRelevantBoard(current.url,current.raw)||
    (/<rss[\s>]/i.test(current.raw)&&/<item[\s>]/i.test(current.raw))||
    (source.name==="경기도 자동수집"&&current.raw.includes("bsIdx=469")&&current.raw.includes("고시공고"))||
    (()=>{try{const v=JSON.parse(current.raw);return v?.act==="index"&&Array.isArray(v.gosis)&&v.gosis.length>0&&current.url.includes("/tool/sido/api.jsp")}catch{return false}})()||
    (current.url.includes("/cnapcPress/list.do")&&current.raw.includes("/cnapcPress/view.do")&&current.raw.includes("제공일자"))||
    (current.url.includes("gwangju.go.kr/boardList.do")&&current.raw.includes("board_list_body")&&current.raw.includes("작성일"))||
    (current.url.includes("gb.go.kr/page/link.do")&&current.raw.includes("boardList.view(")&&current.raw.includes("등록일"))||
    (source.name==="대구광역시 고시·공고"&&current.raw.includes("fn_goLinkView(")&&current.raw.includes("00940170"))||
    (source.name==="인천광역시 고시·공고"&&current.raw.includes("/IC010307/view")&&current.raw.includes("2026-"));
   if(!items.length&&validButFiltered){
    stats.filteredOnly=true;
    const r=await db.from("df_sources").update({last_attempt_at:new Date().toISOString(),last_collected_at:new Date().toISOString(),last_result:"success",last_error:null,last_found:0,last_created:0,last_changed:0}).eq("id",source.id);
    if(r.error)throw r.error;
    results.push(stats);
    continue;
   }
   if(!items.length)throw new Error("목록에서 유효한 상세 링크를 찾지 못했습니다.");
   stats.found=items.length;
   for(const item of items){
    try{
     const state=await collectRow(source,item);
     if(state==="created_published"){stats.created++;stats.published++}
     else if(state==="created_pending"){stats.created++;stats.pending++}
     else if(state==="completed_published")stats.published++;
     else if(state==="change_pending_review")stats.changed++;
     else stats.duplicate++;
    }catch(e){stats.failed++;stats.error=String(e instanceof Error?e.message:e).slice(0,150)}
   }
   const r=await db.from("df_sources").update({last_attempt_at:new Date().toISOString(),last_collected_at:new Date().toISOString(),last_result:stats.failed?"partial":"success",last_error:stats.error||null,last_found:stats.found,last_created:stats.created,last_changed:stats.changed}).eq("id",source.id);
   if(r.error)throw r.error;
  }catch(e){
   stats.failed++;stats.error=String(e instanceof Error?e.message:e).slice(0,230);
   await db.from("df_sources").update({last_attempt_at:new Date().toISOString(),last_result:"failed",last_error:stats.error,last_found:0,last_created:0,last_changed:0}).eq("id",source.id);
  }
  results.push(stats);
 }
 const result={ok:true,batch,processed:results.length,created:results.reduce((a,b)=>a+b.created,0),published:results.reduce((a,b)=>a+b.published,0),changed:results.reduce((a,b)=>a+b.changed,0),failed:results.reduce((a,b)=>a+b.failed,0),sources:results};
 await db.from("df_public_collection_claims").update({last_finished_at:new Date().toISOString(),last_status:result.failed?"partial":"success",last_result:result}).eq("batch_id",batch);
 return result;
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors(req)});
 if(!SUPABASE_ENDPOINT||!SECRET)return respond(req,503,{error:"SERVER_CONFIG_MISSING"});
 if(req.method==="GET"){
  try{
   const [sources,total,published,pending,failed]=await Promise.all([
    db.from("df_sources").select("name,region_code,collector_enabled,last_attempt_at,last_collected_at,last_result,last_error,last_found,last_created,last_changed").eq("is_active",true).order("name"),
    db.from("df_source_documents").select("id",{count:"exact",head:true}),
    db.from("df_source_documents").select("id",{count:"exact",head:true}).eq("key_extract_status","ready"),
    db.from("df_source_documents").select("id",{count:"exact",head:true}).in("detail_status",["queued","discovered","partial"]),
    db.from("df_source_documents").select("id",{count:"exact",head:true}).eq("detail_status","failed")
   ]);
   const error=[sources,total,published,pending,failed].find(r=>r.error)?.error;
   if(error)throw error;
   return respond(req,200,{ok:true,total:total.count||0,ready:published.count||0,pending:pending.count||0,failed:failed.count||0,sources:sources.data||[],checked_at:new Date().toISOString()});
  }catch(e){return respond(req,500,{error:String(e instanceof Error?e.message:e).slice(0,180)})}
 }
 if(req.method!=="POST")return respond(req,405,{error:"METHOD_NOT_ALLOWED"});
 try{
  const data=await req.json().catch(()=>({}));
  const batch=data?.batch;
  if(!Number.isInteger(batch)||batch<0||batch>9||Object.keys(data).some(x=>x!=="batch"))return respond(req,400,{error:"ONLY_FIXED_BATCH_ALLOWED"});
  if(!SUPABASE_ENDPOINT||!SECRET)return respond(req,503,{error:"SERVER_CONFIG_MISSING"});
  // Accept only single-use pg_cron credentials or a verified active admin.
  // Supabase auth is NOT inferred from CORS, origin or a public anon key.
  const runToken=req.headers.get("x-df-collector-token")||"";
  let authorized=false;
  if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runToken)){
   const {data:valid,error:claimError}=await db.rpc("df_claim_ingest_token",{p_token:runToken,p_batch:batch});
   authorized=!claimError&&valid===true;
  }
  if(!authorized){
   const bearer=req.headers.get("authorization")||"";
   if(bearer.startsWith("Bearer ")&&bearer.length>20&&bearer.length<=8192){
    const {data:{user},error:authError}=await db.auth.getUser(bearer.slice(7));
    if(!authError&&user){
     const {data:role,error:roleError}=await db.from("df_admin_roles").select("role").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
     authorized=!roleError&&!!role;
    }
   }
  }
  if(!authorized)return respond(req,403,{error:"ADMIN_OR_SCHEDULER_AUTH_REQUIRED"});
  const result=await runBatch(batch);
  return respond(req,result.busy?429:200,result);
 }catch(e){return respond(req,500,{error:String(e instanceof Error?e.message:e).slice(0,240)})}
});
