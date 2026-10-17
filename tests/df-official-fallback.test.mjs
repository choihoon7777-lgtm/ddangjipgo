import test from "node:test";import assert from "node:assert/strict";import{readFile}from"node:fs/promises";const read=p=>readFile(new URL(p,import.meta.url),"utf8");
test("Fallback boards are explicit vetted government endpoints",async()=>{const src=await read("../supabase/functions/df-public-update/index.ts");for(const url of ["https://www.sejong.go.kr/prog/publicNotice/kor/sub02_030301/C1_1/list.do","https://www.gb.go.kr/Main/open_contents/section/ftc/page.do?mnu_uid=6789","https://sido.chungbuk.go.kr/citynet/jsp/sap/SAPGosiBizProcess.do"])assert.ok(src.includes(url));assert.match(src,/isValidatedNoRelevantBoard/);assert.match(src,/datedDetails>=2/);assert.match(src,/officialLink\(base,a\[1\]\)/);});
test("Filtered official list cannot be mistaken for a source homepage or disable security",async()=>{const src=await read("../supabase/functions/df-public-update/index.ts");assert.match(src,/\.protocol==="https:"/);assert.match(src,/isValidatedNoRelevantBoard\(current.url,current.raw\)/);assert.match(src,/last_result:"failed"/);assert.doesNotMatch(src,/rejectUnauthorized\s*:\s*false/);});

test("Official board preferred over homepage and failed board still retries original",async()=>{const s=await read("../supabase/functions/df-public-update/index.ts");assert.match(s,/const primary=source\.collector_kind==="local_auto"&&fallback\[source.name\]/);assert.match(s,/try\{current=await download\(alternate,11000\)\}/)});

test("Daegu official newsroom uses dated true detail links instead of homepage menu",async()=>{const s=await read("../supabase/functions/df-public-update/index.ts");assert.match(s,/info\.daegu\.go\.kr\/newshome\/mtnmain\.php\?mtnkey=todaylist/);assert.match(s,/mtnkey=articleview/);assert.match(s,/head=block\.match/);assert.match(s,/date=block\.match/);});

test("Regional verified official lists have dedicated dated item parsers",async()=>{
 const s=await read("../supabase/functions/df-public-update/index.ts");
 for(const segment of [
  "www.chungnam.go.kr","cnapcPress/list.do","cnapcPress/view.do",
  "www.gwangju.go.kr","BD_0000000027","boardView",
  "www.gb.go.kr","boardList.view","boardMngNo=71",
  'v?.act==="index"','Array.isArray(v.gosis)',
  '"철도"','"GTX"'
 ])assert.ok(s.includes(segment),segment);
 assert.match(s,/if\(!relevant\(title\)\|\|title\.length<9\|\|!link\|\|!published/);
 assert.match(s,/const link=officialLink/);
 assert.match(s,/last_result:"failed"/);
 assert.doesNotMatch(s,/rejectUnauthorized\s*:\s*false/);
});

test("Gyeonggi official newsroom parser strips session IDs and only uses dated first-party releases",async()=>{
 const s=await read("../supabase/functions/df-public-update/index.ts");
 for(const term of ["gnews.gg.go.kr","brief_gongbo.do","brief_gongbo_view","postBody","jsessionid","const pagingHost","pageIndex","Date"])assert.ok(s.includes(term),term);
 assert.match(s,/source\.collector_kind==="local_auto"&&fallback\[source\.name\]/);
 assert.match(s,/found:0/);
});


test("Chungbuk citynet and Gyeongbuk modern notice pages use dated official records",async()=>{
 const src=await read("../supabase/functions/df-public-update/index.ts");
 assert.match(src,/"sido\.chungbuk\.go\.kr"/);
 assert.match(src,/hostname==="www\.gb\.go\.kr"/);
 assert.match(src,/url\.searchParams\.set\("sno",m\[1\]\)/);
 assert.match(src,/dateText=\/\^\\d\\d/);
 assert.match(src,/detail\.searchParams\.get\("BD_CODE"\)!=="gosi_notice"/);
 assert.match(src,/hasAttachments:true/);
 assert.doesNotMatch(src,/rejectUnauthorized\s*:\s*false/);
});

test("MOLIT fallback uses attributed first-party Korean government press releases",async()=>{
 const s=await read("../supabase/functions/df-public-update/index.ts");
 assert.match(s,/https:\/\/www\.korea\.kr\/briefing\/pressReleaseList\.do/);
 assert.match(s,/hostname==="www\.korea\.kr"/);
 assert.match(s,/국토교통부/);
 assert.match(s,/hasAttachments:true/);
 assert.match(s,/usedFeedBody/);
 assert.match(s,/!usedFeedBody&&!hasAttachment/);
});

test("Official board TLS fallback only reads fresh first-party cached pages",async()=>{
 const src=await read("../supabase/functions/df-public-update/index.ts");
 const sql=await read("../supabase/migrations/20261017_df_official_verified_http_cache.sql");
 for(const x of ['"sido.busan.go.kr"','"sido.chungbuk.go.kr"','"www.gb.go.kr"','"ulsan.go.kr"','df_official_feed_cache','directDownload(value,timeout)'])assert.ok(src.includes(x),x);
 assert.match(src,/80\*60\*1000/);
 assert.match(src,/\.eq\("url",url\.href\)/);
 assert.match(src,/!allowed\(url\)/);
 assert.match(sql,/enable row level security/);
 assert.match(sql,/revoke all.*anon,authenticated/i);
 assert.match(sql,/net\._http_response/);
 assert.match(sql,/df-official-feed-cache-fetch/);
 assert.match(sql,/df-official-feed-cache-store/);
 assert.doesNotMatch(src,/rejectUnauthorized\s*:\s*false/);
});


test("Government article extraction retains facts and explicitly quarantines navigation/control text",async()=>{
 const s=await read("../supabase/functions/df-public-update/index.ts");
 assert.match(s,/const namedEntities/);
 assert.match(s,/lsquo:"‘",rsquo:"’",ldquo:"“",rdquo:"”"/);
 assert.match(s,/String\.fromCodePoint\(char\)/);
 assert.match(s,/const containsPageChrome=/);
 assert.match(s,/경기뉴스룸/);
 assert.match(s,/PAGE_LAYOUT_REQUIRES_REVIEW/);
 assert.match(s,/manual_review_required:needsLayoutReview/);
 assert.match(s,/detail_status:verified\?\(hasAttachment\|\|usedFeedBody\|\|needsLayoutReview/);
 assert.match(s,/detail_status:hasAttachment\|\|usedFeedBody\|\|needsLayoutReview/);
 assert.match(s,/detail_ok:verified&&!usedFeedBody&&!hasAttachment&&!needsLayoutReview/);
 assert.doesNotMatch(s,/rejectUnauthorized\s*:\s*false/);
});
