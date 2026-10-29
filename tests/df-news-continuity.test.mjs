import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=p=>readFile(new URL(p,import.meta.url),"utf8");

test("The public official-news recovery archive contains 33 previously published articles with real bodies",async()=>{
 const archive=JSON.parse(await read("../public/df-verified-news-archive.json"));
 assert.equal(archive.source,"published_official_news");
 assert.equal(archive.articles.length,33);
 assert.equal(new Set(archive.articles.map(a=>a.id)).size,33);
 for(const article of archive.articles){
  assert.ok(article.id&&article.title&&article.body);
  assert.ok(["published","corrected"].includes(article.status));
  assert.ok(["보도자료","고시공고"].includes(article.source_channel));
  assert.ok(article.published_at,"Preserve actual original release dates");
 }
});

test("Homepage always shows backed-up published headlines ahead of brand filler when Supabase fails",async()=>{
 const s=await read("../app/focus/page.js");
 assert.match(s,/getCachedOfficialNewsList\(14\)/);
 assert.match(s,/setNewsArchiveUsed\(usingNewsArchive\)/);
 assert.match(s,/dfReaderStatus/);
 assert.doesNotMatch(s,/className="dfHomeError"/);
 assert.match(s,/const cover=lead\?safeEditorialCover/);
 assert.match(s,/\{cover&&<div className="dfHomeLeadVisual">/);
 assert.match(s,/insights\.length\?null:<section className="dfHomeIntro"/);
 assert.ok(s.indexOf('dfHomeLeadCard')<s.indexOf('dfInvestgoHome'));
});

test("All public article routes fall back to published copies, not unapproved review rows",async()=>{
 const live=await read("../app/focus/live/page.js");
 const article=await read("../app/focus/article/article-client.js");
 const metadata=await read("../app/focus/article/page.js");
 const helper=await read("../lib/df-official-news-fallback.js");
 assert.match(live,/getCachedOfficialNewsList\(50\)/);
 assert.match(article,/getCachedOfficialNewsArticle\(id\)/);
 assert.match(metadata,/officialNewsSnapshot\.articles\.find/);
 assert.match(helper,/\["published","corrected"\]/);
 assert.match(helper,/\["보도자료","고시공고"\]/);
});

test("Mobile navigation has a direct market-analysis entry and reserves space for the floating bottom nav",async()=>{
 const nav=await read("../components/df-shell.js");
 const css=await read("../app/globals.css");
 assert.match(nav,/x==="시장 분석"\?"/);
 assert.match(nav,/market analysis|시장 분석 · 투자GO/);
 assert.match(css,/env\(safe-area-inset-bottom/);
 assert.match(css,/\.dfReaderStatus/);
});
