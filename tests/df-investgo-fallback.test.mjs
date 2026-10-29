import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL(path,import.meta.url),"utf8");

test("The public INVESTGO recovery snapshot contains all 43 originally published articles",async()=>{
 const backup=JSON.parse(await read("../public/investgo-verified-articles.json"));
 assert.equal(backup.source,"investgo");
 assert.equal(backup.articles.length,43);
 assert.equal(new Set(backup.articles.map(a=>a.id)).size,43);
 for(const a of backup.articles){
  assert.equal(a.source_channel,"investgo");
  assert.ok(["published","corrected"].includes(a.status));
  assert.ok(a.title&&a.body,"Full published article is required");
  assert.match(a.original_source_url||"",/^https:\/\/blog\.naver\.com\//);
 }
});
test("INVESTGO homepage and live newsroom use backup only if Supabase query fails",async()=>{
 const home=await read("../app/focus/page.js");
 const live=await read("../app/focus/live/page.js");
 assert.match(home,/getCachedInvestgoList\(5\)/);
 assert.match(live,/getCachedInvestgoList\(50\)/);
 assert.match(live,/if\(queryError\)throw queryError/);
 assert.match(home,/setArchiveUsed\(usingArchive\)/);
});
test("Individual INVESTGO article is readable from backup when live data unavailable",async()=>{
 const article=await read("../app/focus/article/article-client.js");
 const metadata=await read("../app/focus/article/page.js");
 assert.match(article,/getCachedInvestgoArticle\(id\)/);
 assert.match(article,/setA\(story\)/);
 assert.match(article,/OfficialArticleText content=\{body\}/);
 assert.match(metadata,/investgoSnapshot\.articles\.find/);
 assert.match(article,/발행 기사 저장본 표시 중/);
});
