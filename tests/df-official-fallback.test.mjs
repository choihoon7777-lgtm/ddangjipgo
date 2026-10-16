import test from "node:test";import assert from "node:assert/strict";import{readFile}from"node:fs/promises";const read=p=>readFile(new URL(p,import.meta.url),"utf8");
test("Fallback boards are explicit vetted government endpoints",async()=>{const src=await read("../supabase/functions/df-public-update/index.ts");for(const url of ["https://www.sejong.go.kr/prog/publicNotice/kor/sub02_030301/C1_1/list.do","https://gb.go.kr/page/link.do?mn=10109&pageNo=67","https://www.chungbuk.go.kr/www/selectGosiPblancList.do"])assert.ok(src.includes(url));assert.match(src,/isValidatedNoRelevantBoard/);assert.match(src,/datedDetails>=2/);assert.match(src,/officialLink\(base,a\[1\]\)/);});
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

// Next candidate government endpoints must be tested end-to-end before activation.
