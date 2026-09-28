import{NextResponse}from"next/server";
import{createClient}from"@supabase/supabase-js";
import{createHash}from"crypto";

const SUPABASE_URL="https://svafsvyjjufbqvxzoqee.supabase.co";
const SUPABASE_KEY="sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud";
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
export const maxDuration=60;

const POLICY_KEYWORDS=["도시계획","도시관리계획","지구단위계획","개발계획","개발사업","도시개발","정비계획","정비구역","재개발","재건축","산업단지","택지","주택","공동주택","건축","토지","용도지역","용도지구","용도구역","지형도면","도로","철도","교통","공원","공공주택","역세권","경제자유구역","연구개발특구","입법예고","조례","규칙","계획 변경","지정 고시","결정 고시","승인 고시","정책"];
const EXCLUDE_KEYWORDS=["채용","인사","시험","입찰","수의계약","물품","구매","공시송달","과태료","체납","영업정지","허가취소","담배소매","모집 공고","위원 모집","행정대집행"];
function relevantPolicy(title=""){
 const t=decode(title); if(!t)return false;
 if(EXCLUDE_KEYWORDS.some(k=>t.includes(k)))return false;
 return POLICY_KEYWORDS.some(k=>t.includes(k));
}
const FALLBACK_LISTS={
 "국토교통부":"https://www.molit.go.kr/USR/NEWS/m_71/lst.jsp",
 "과학기술정보통신부":"https://www.msit.go.kr/bbs/list.do?sCode=user&mId=307&mPid=208&bbsSeqNo=94",
 "행정안전부":"https://www.mois.go.kr/frt/bbs/type010/commonSelectBoardList.do?bbsId=BBSMSTR_000000000008"
};

async function authorizedClient(req){
 const auth=req.headers.get("authorization")||"";
 const token=auth.startsWith("Bearer ")?auth.slice(7):"";
 if(process.env.CRON_SECRET&&SERVICE_KEY&&token===process.env.CRON_SECRET){
  return createClient(SUPABASE_URL,SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 }
 if(!token)return null;
 const sb=createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const{data:{user},error}=await sb.auth.getUser(token);if(error||!user)return null;
 const scoped=createClient(SUPABASE_URL,SUPABASE_KEY,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const{data:role}=await scoped.from("df_admin_roles").select("role,is_active").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
 return role?scoped:null;
}
function decode(s=""){
 return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n))).replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim();
}
function tag(block,name){
 const m=block.match(new RegExp("<"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+name+">","i"));return m?decode(m[1]):"";
}
function rssItems(xml){
 return [...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].map(x=>x[1]).map(b=>({title:tag(b,"title"),link:tag(b,"link")||tag(b,"guid"),description:tag(b,"description"),pubDate:tag(b,"pubDate")||tag(b,"dc:date")})).filter(x=>x.title&&x.link);
}
function decodeText(s=""){
 return s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1")
  .replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">")
  .replace(/&quot;/gi,'"').replace(/&#39;/gi,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCharCode(Number(n)));
}
function stripHtml(html){
 let x=(html||"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<noscript[\s\S]*?<\/noscript>/gi," ");
 x=x.replace(/<br\s*\/?\s*>/gi,"\n").replace(/<\/(p|div|li|tr|h[1-6]|section|article|table|ul|ol)>/gi,"\n").replace(/<[^>]+>/g," ");
 x=decodeText(x).replace(/\r/g,"").replace(/[ \t]+/g," ").replace(/ *\n */g,"\n").replace(/\n{3,}/g,"\n\n");
 return x.trim();
}
function mainHtml(html){
 const candidates=[];
 const patterns=[
  /<article\b[^>]*>([\s\S]*?)<\/article>/gi,
  /<main\b[^>]*>([\s\S]*?)<\/main>/gi,
  /<(?:div|section)\b[^>]*(?:id|class)=["'][^"']*(?:board[_-]?view|view[_-]?(?:content|cont|body)|article[_-]?(?:content|body)|bbs[_-]?view|board[_-]?(?:content|cont)|detail[_-]?(?:content|cont)|content[_-]?view|txt[_-]?view)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/gi
 ];
 for(const re of patterns)for(const m of html.matchAll(re)){const t=stripHtml(m[1]);if(t.length>=80)candidates.push({html:m[1],text:t})}
 candidates.sort((a,b)=>b.text.length-a.text.length);
 return candidates[0]?.html||html;
}
function attachmentLinks(base,html){
 const out=[],seen=new Set(),re=/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
 for(const m of html.matchAll(re)){
  const href=abs(base,decodeText(m[1]).trim()),label=stripHtml(m[2]);
  if(!href||seen.has(href))continue;
  if(!(/\.(pdf|hwp|hwpx|doc|docx|xls|xlsx|ppt|pptx|zip)(?:$|[?#])/i.test(href)||/(첨부|다운로드|파일)/.test(label)))continue;
  seen.add(href);out.push({name:label||href.split("/").pop()||"첨부파일",url:href});
  if(out.length>=20)break;
 }
 return out;
}
function abs(base,href){try{return new URL(href,base).toString()}catch{return null}}
function htmlListItems(sourceName,base,html){
 const out=[],seen=new Set();
 const patterns={
  "국토교통부":/href=["']([^"']*dtl\.jsp\?[^"']*id=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
  "과학기술정보통신부":/href=["']([^"']*bbs\/view\.do\?[^"']*nttSeqNo=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi,
  "행정안전부":/href=["']([^"']*commonSelectBoardArticle\.do\?[^"']*nttId=\d+[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi
 };
 const re=patterns[sourceName];if(!re)return out;
 for(const m of html.matchAll(re)){
  const link=abs(base,decode(m[1]));const title=decode(m[2]);
  if(!link||!title||title.length<4||seen.has(link))continue;
  seen.add(link);out.push({title,link,description:"",pubDate:""});
  if(out.length>=12)break;
 }
 return out;
}
function channelFromTitle(title=""){
 const t=decode(title);
 if(t.includes("입법예고")||t.includes("조례")||t.includes("규칙"))return "입법예고";
 if(t.includes("고시")||t.includes("공고")||t.includes("지형도면")||t.includes("결정"))return "고시공고";
 return "보도자료";
}
function discoverChannelLinks(base,html){
 const out=[],seen=new Set(),re=/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
 for(const m of html.matchAll(re)){
  const label=decode(m[2]); if(!/(보도자료|보도·해명|보도해명|고시.?공고|입법예고|공보)/.test(label))continue;
  const link=abs(base,decode(m[1])); if(!link||seen.has(link))continue;
  let u,b;try{u=new URL(link);b=new URL(base)}catch{continue}
  if(u.hostname.replace(/^www\./,"")!==b.hostname.replace(/^www\./,""))continue;
  seen.add(link);out.push({label,link});
  if(out.length>=6)break;
 }
 return out;
}
function genericHtmlItems(base,html,{policyOnly=false}={}){
 const out=[],seen=new Set();
 const re=/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
 for(const m of html.matchAll(re)){
  const link=abs(base,decode(m[1]));const title=decode(m[2]);
  if(!link||!title||title.length<8||title.length>180||seen.has(link))continue;
  let u;try{u=new URL(link)}catch{continue}
  let b;try{b=new URL(base)}catch{continue}
  if(u.hostname.replace(/^www\./,"")!==b.hostname.replace(/^www\./,""))continue;
  if(/^(홈|목록|이전|다음|더보기|전체보기|로그인|회원가입|사이트맵)$/i.test(title))continue;
  if(policyOnly&&!relevantPolicy(title))continue;
  const idx=m.index||0,ctx=decode(html.slice(Math.max(0,idx-220),Math.min(html.length,idx+m[0].length+220)));
  const dm=ctx.match(/(20\d{2})[.\/-]\s*(\d{1,2})[.\/-]\s*(\d{1,2})/);
  const pubDate=dm?`${dm[1]}-${String(dm[2]).padStart(2,"0")}-${String(dm[3]).padStart(2,"0")}`:"";
  seen.add(link);out.push({title,link,description:"",pubDate});
  if(out.length>=20)break;
 }
 return out;
}
function hash(x){return createHash("md5").update(x||"").digest("hex")}
async function fetchText(url,timeout=12000){
 const res=await fetch(url,{cache:"no-store",redirect:"follow",headers:{"User-Agent":"DevelopmentFocus/1.0 (+official-source-collector)"},signal:AbortSignal.timeout(timeout)});
 if(!res.ok)throw new Error("HTTP "+res.status);
 return{url:res.url||url,type:(res.headers.get("content-type")||"").toLowerCase(),text:await res.text()};
}
async function detailContent(link,fallback){
 try{
  const r=await fetchText(link,12000);
  if(r.type.includes("pdf"))return{text:fallback,detail_url:r.url,attachments:[{name:"공식 PDF",url:r.url}],content_type:r.type,detail_ok:false};
  if(!r.type.includes("html")){
   const t=decodeText(r.text).trim();
   return{text:t.length>=80?t.slice(0,120000):fallback,detail_url:r.url,attachments:[],content_type:r.type,detail_ok:t.length>=80};
  }
  const region=mainHtml(r.text),t=stripHtml(region),attachments=attachmentLinks(r.url,r.text);
  return{text:t.length>=80?t.slice(0,120000):fallback,detail_url:r.url,attachments,content_type:r.type,detail_ok:t.length>=80};
 }catch{return{text:fallback,detail_url:link,attachments:[],content_type:null,detail_ok:false}}
}

async function runCollector(req){
 try{
  const sb=await authorizedClient(req);if(!sb)return NextResponse.json({error:"NEWSROOM_AUTH_REQUIRED"},{status:401});
  const{data:sources,error}=await sb.from("df_sources").select("id,name,source_type,feed_url,base_url,region_code,collector_kind").eq("is_active",true).eq("collector_enabled",true);
  if(error)throw error;
  let discovered=0,created=0,changed=0,unchanged=0,failed=0;
  const detail=[];
  for(const source of sources||[]){
   try{
    let rows=[],mode="rss",feedError=null;
    if(source.feed_url){
      try{
       const feed=await fetchText(source.feed_url,10000);
       rows=rssItems(feed.text).slice(0,20).map(row=>({...row,link:abs(source.feed_url,row.link)||row.link}));
       if(!rows.length){
        mode="html_generic";
        rows=genericHtmlItems(feed.url,feed.text,{policyOnly:source.collector_kind==="local_government"||source.collector_kind==="local_law"||source.collector_kind==="local_auto"}).slice(0,12);
        if(!rows.length&&source.collector_kind==="local_auto"){
         const channels=discoverChannelLinks(feed.url,feed.text);
         for(const ch of channels){
          try{
           const page=await fetchText(ch.link,10000);
           const found=genericHtmlItems(page.url,page.text,{policyOnly:true}).map(x=>({...x,channel_hint:ch.label}));
           rows.push(...found);
          }catch{}
          if(rows.length>=18)break;
         }
         const uniq=new Map(rows.map(x=>[x.link,x]));rows=[...uniq.values()].slice(0,18);
        }
       }
       if(!rows.length)throw new Error("수집 항목 0건");
      }catch(e){feedError=e.message;rows=[]}
    }
    if(!rows.length){
      mode="html_fallback";
      const listUrl=FALLBACK_LISTS[source.name];
      if(!listUrl)throw new Error(feedError||"사용 가능한 수집 경로 없음");
      const list=await fetchText(listUrl,12000);
      rows=htmlListItems(source.name,list.url,list.text).slice(0,5);
      if(!rows.length)throw new Error((feedError?feedError+" / ":"")+"목록 파싱 0건");
    }
    discovered+=rows.length;
    let sCreated=0,sChanged=0,sSame=0;
    for(const row of rows){
      const published=row.pubDate&&!Number.isNaN(new Date(row.pubDate).getTime())?new Date(row.pubDate).toISOString():null;
      const{data:old}=await sb.from("df_source_documents").select("id,title,content_text,content_hash,source_url,published_at").eq("source_id",source.id).eq("external_id",row.link).maybeSingle();

      if(old&&old.title===row.title&&mode==="html_fallback"){sSame++;continue}

      const seed=(row.description||row.title).trim();
      const detailPage=await detailContent(row.link,seed);
      const body=detailPage.text;
      const h=hash(body); const channel=row.channel_hint?channelFromTitle(row.channel_hint):channelFromTitle(row.title);
      const categoryHint=channel==="보도자료"?"개발사업":"정책·고시";

      if(!old){
       const{data:newDoc,error:e}=await sb.from("df_source_documents").insert({source_id:source.id,external_id:row.link,title:row.title,source_url:row.link,published_at:published,content_text:body,content_hash:h,last_checked_at:new Date().toISOString(),raw_payload:{collector:mode,feed_url:source.feed_url||null,list_url:FALLBACK_LISTS[source.name]||null,source_type:source.source_type||null,collector_kind:source.collector_kind||null,region_code:source.region_code||null,category_hint:(source.collector_kind==="local_government"||source.collector_kind==="local_law"||source.collector_kind==="local_auto")?categoryHint:null,channel,detail_url:detailPage.detail_url,detail_ok:detailPage.detail_ok,content_type:detailPage.content_type,attachments:detailPage.attachments},verification_status:"pending"}).select("id").single();if(e)throw e;
       if(newDoc?.id)await sb.from("df_source_document_versions").insert({document_id:newDoc.id,content_hash:h,title:row.title,content_text:body,source_url:row.link,source_published_at:published});
       created++;sCreated++;
      }else if(old.content_hash!==h||old.title!==row.title){
       await sb.from("df_source_document_versions").upsert({document_id:old.id,content_hash:old.content_hash,title:old.title,content_text:old.content_text,source_url:old.source_url,source_published_at:old.published_at},{onConflict:"document_id,content_hash",ignoreDuplicates:true});
       const{error:e}=await sb.from("df_source_documents").update({title:row.title,source_url:row.link,published_at:published||old.published_at,content_text:body,content_hash:h,fetched_at:new Date().toISOString(),last_checked_at:new Date().toISOString(),raw_payload:{collector:mode,feed_url:source.feed_url||null,list_url:FALLBACK_LISTS[source.name]||null,source_type:source.source_type||null,collector_kind:source.collector_kind||null,region_code:source.region_code||null,category_hint:(source.collector_kind==="local_government"||source.collector_kind==="local_law"||source.collector_kind==="local_auto")?categoryHint:null,channel,detail_url:detailPage.detail_url,detail_ok:detailPage.detail_ok,content_type:detailPage.content_type,attachments:detailPage.attachments}}).eq("id",old.id);if(e)throw e;
       await sb.from("df_source_document_versions").upsert({document_id:old.id,content_hash:h,title:row.title,content_text:body,source_url:row.link,source_published_at:published||old.published_at},{onConflict:"document_id,content_hash",ignoreDuplicates:true});
       await sb.from("df_project_updates").insert({source_document_id:old.id,update_type:"source_changed",before_data:{title:old.title,content_hash:old.content_hash,content_text:old.content_text},after_data:{title:row.title,content_hash:h,content_text:body},diff_data:{title_changed:old.title!==row.title,content_changed:old.content_hash!==h}});
       changed++;sChanged++;
      }else{await sb.from("df_source_documents").update({last_checked_at:new Date().toISOString()}).eq("id",old.id);sSame++;}
    }
    unchanged+=sSame;await sb.from("df_sources").update({last_collected_at:new Date().toISOString()}).eq("id",source.id);
    detail.push({source:source.name,mode,feedError,found:rows.length,created:sCreated,changed:sChanged,unchanged:sSame});
   }catch(e){failed++;detail.push({source:source.name,error:e.message})}
  }
  return NextResponse.json({ok:true,discovered,created,changed,unchanged,failed,detail});
 }catch(e){return NextResponse.json({error:e.message||"공식자료 수집 실패"},{status:500})}
}

export async function POST(req){return runCollector(req)}
export async function GET(req){return runCollector(req)}
