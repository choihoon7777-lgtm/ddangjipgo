import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL(path,import.meta.url),"utf8");

test("Premium editorial design loads after legacy styles and remains scoped",async()=>{
 const [layout,css]=await Promise.all([read("../app/layout.js"),read("../app/editorial-v2.css")]);
 assert.ok(layout.indexOf('import "./globals.css";')<layout.indexOf('import "./editorial-v2.css";'));
 for(const name of [".dfPremiumHome",".dfEditorialListingPage",".dfEditorialArticlePage",".dfEditorialPolicyPage"]){
  assert.ok(css.includes(name),name);
 }
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/safe-area-inset-bottom/);
 assert.match(css,/focus-visible/);
});

test("Home leads with real news and editorial hierarchy before property tools",async()=>{
 const home=await read("../app/focus/page.js");
 assert.match(home,/getCachedOfficialNewsList\(14\)/);
 assert.match(home,/getCachedInvestgoList\(5\)/);
 assert.match(home,/THE LEAD/);
 assert.match(home,/dfStoryIndex/);
 assert.match(home,/투자GO 시장 분석/);
 assert.ok(home.indexOf("dfPremiumDirectory")<home.indexOf("dfLandCompact"));
 assert.doesNotMatch(home,/className="dfHomeTrust"/);
 assert.match(home,/dfReaderStatus/);
});

test("News category and policy discovery use accessible active states",async()=>{
 const [news,policy]=await Promise.all([
  read("../app/focus/live/page.js"),
  read("../app/focus/policy/page.js")
 ]);
 assert.match(news,/dfEditorialListingPage/);
 assert.match(news,/dfEditorialNewsCard/);
 assert.match(news,/dfEditorialListingCount/);
 assert.match(news,/aria-current=\{x===category\?"page":undefined\}/);
 assert.match(news,/dfEditorialEmpty/);
 assert.match(policy,/dfEditorialPolicyPage/);
 assert.match(policy,/dfEditorialPolicyOverview/);
 assert.match(policy,/aria-current=\{channel===x\?"page":undefined\}/);
 assert.doesNotMatch(policy,/실무판단요약|최종 확인 \/ 공식 출처|dfPolicyOfficialCta/);
});

test("Article has functional font controls, reading progress and related already-published stories",async()=>{
 const reader=await read("../app/focus/article/article-client.js");
 assert.match(reader,/dfEditorialArticlePage/);
 assert.match(reader,/dfReadingProgress/);
 assert.match(reader,/window\.addEventListener\("scroll",onRead,\{passive:true\}\)/);
 assert.match(reader,/aria-valuenow=\{readingProgress\}/);
 assert.match(reader,/setReadingSize\("large"\)/);
 assert.match(reader,/aria-pressed=\{readingSize==="large"\}/);
 assert.match(reader,/getCachedOfficialNewsList\(33\)/);
 assert.match(reader,/getCachedInvestgoList\(43\)/);
 assert.match(reader,/dfEditorialRelated/);
 assert.match(reader,/OfficialArticleText content=\{body\}/);
});

test("Shared navigation closes on outside tap and restores keyboard focus",async()=>{
 const nav=await read("../components/df-shell.js");
 assert.match(nav,/menuButtonRef=useRef/);
 assert.match(nav,/document\.addEventListener\("pointerdown",pointer\)/);
 assert.match(nav,/menuButtonRef\.current\?\.focus\(\)/);
 assert.match(nav,/navRef\.current\.scrollLeft/);
 assert.match(nav,/aria-current=\{activeFor\(x\)\?"page":undefined\}/);
 assert.match(nav,/시장 분석/);
});


test("Source freshness is explicitly disclosed even for reachable stale content",async()=>{
 const [home,news]=await Promise.all([read("../app/focus/page.js"),read("../app/focus/live/page.js")]);
 assert.match(home,/newsStale/);
 assert.match(home,/newestOfficial/);
 assert.match(home,/신규 자료 갱신 여부 확인 필요/);
 assert.match(news,/newsStale/);
 assert.match(news,/신규 자료 갱신 여부 확인 필요/);
});

test("Thin official article includes source verification warning and original link",async()=>{
 const reader=await read("../app/focus/article/article-client.js");
 assert.match(reader,/needsSourceReview/);
 assert.match(reader,/기사 본문이 짧아 공식 원문과 대조가 필요합니다/);
 assert.match(reader,/noopener noreferrer/);
});

test("Mobile refresh stylesheet overrides editorial defaults and keeps map as separate destination",async()=>{
 const [layout,css,home]=await Promise.all([read("../app/layout.js"),read("../app/dosimaek-mobile-refresh.css"),read("../app/focus/page.js")]);
 assert.ok(layout.indexOf('import "./editorial-v2.css";')<layout.indexOf('import "./dosimaek-mobile-refresh.css";'));
 assert.match(css,/\.dfPremiumHome \.dfRefreshMapLink\{padding:12px 14px/);
 assert.match(home,/href="\/focus\/projects"/);
});
