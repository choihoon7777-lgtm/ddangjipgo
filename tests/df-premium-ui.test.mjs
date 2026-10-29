import test from"node:test";import assert from"node:assert/strict";import{readFile}from"node:fs/promises";
const read=p=>readFile(new URL(p,import.meta.url),"utf8");
test("Homepage retains published data, ad, regional navigation, and guest property features",async()=>{
const s=await read("../app/focus/page.js");for(const x of ['DFLiveNotice placement="home"','DFLiveAd placement="home"','dfHomeLeadCard','dfLatestRow','dfInvestgoHome','dfLandCompact','dfPremiumDirectory','/my/properties','/search','/alerts','/focus/policy','/focus/housing','/focus/projects','/focus/region'])assert.ok(s.includes(x),x);
assert.ok(s.indexOf('{latest.length>0&&')<s.indexOf('<section className="focusHero dfLandCompact">'));
assert.ok(s.indexOf('{insights.length>0&&')<s.indexOf('<section className="focusHero dfLandCompact">'),"Recovered INVESTGO stories appear before property tools");});
test("Menus have distinct destinations and keep full discovery access",async()=>{
const s=await read("../components/df-shell.js");assert.match(s,/const categories=\["최신 뉴스","정책·고시","시장 분석","분양·청약","지역별 정보"\]/);
for(const u of ['/focus/live','/focus/policy','/my/properties','/my','/focus/region','/focus/search','/alerts'])assert.ok(s.includes(u),u);
assert.match(s,/aria-label="도시맥 뉴스 카테고리"/);});
test("Policy tab and accessible touch areas are styled",async()=>{const s=await read("../app/focus/policy/page.js"),css=await read("../app/globals.css");assert.match(s,/DFBottomNav active="policy"/);assert.match(css,/\.focusHeaderWrap \.focusTabs>a\{/);assert.match(css,/\.dfPremiumBottom>a\{/);});

test("Editor-picked articles lead, remaining articles stay in order without duplicates",async()=>{
 const source=await read("../lib/df-home-editorial.js");
 const {mergeHomeStories}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
 const a={id:"a",is_top_focus:false},b={id:"b",is_top_focus:true},c={id:"c"};
 assert.deepEqual(mergeHomeStories([b],[a,b,c]).map(x=>x.id),["b","a","c"]);
 assert.deepEqual(mergeHomeStories([],[a,c]).map(x=>x.id),["a","c"]);
 assert.deepEqual(mergeHomeStories([{id:"invalid",is_top_focus:false}],[a]).map(x=>x.id),["a"]);
});
test("Representatives are shown only for verifiable public image storage",async()=>{
 const source=await read("../lib/df-home-editorial.js");
 const {safeEditorialCover,articleSourceLabel}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));
 const trusted="https://svafsvyjjufbqvxzoqee.supabase.co/storage/v1/object/public/df-news-images/cover.jpg";
 assert.equal(safeEditorialCover(trusted),trusted);
 for(const unsafe of ["javascript:alert(1)","http://svafsvyjjufbqvxzoqee.supabase.co/storage/v1/object/public/df-news-images/cover.jpg","https://other.example.com/cover.jpg","https://svafsvyjjufbqvxzoqee.supabase.co/storage/v1/object/private/df-news-images/cover.jpg"])assert.equal(safeEditorialCover(unsafe),null);
 assert.equal(articleSourceLabel({source_channel:"보도자료"}),"");
 assert.equal(articleSourceLabel({source_channel:null}),"");
});
test("Bottom-nav active destinations stay in sync with property and region pages",async()=>{
 const prop=await read("../app/my/properties/page.js"),region=await read("../app/focus/region/page.js"),home=await read("../app/focus/page.js");
 assert.match(prop,/DFBottomNav active="land"/);
 assert.match(region,/DFBottomNav active="news"/);
 assert.doesNotMatch(home,/dfRegionHome/);
 assert.match(home,/safeEditorialCover\(lead\.hero_image_url\)/);
 assert.match(home,/is_top_focus/);
});


test("Naver InvestGO original cover and supplementary images stay in owned storage",async()=>{
 const [article,imageWorker,css,migration]=await Promise.all([
  read("../app/focus/article/article-client.js"),
  read("../supabase/functions/df-investgo-images/index.ts"),
  read("../app/globals.css"),
  read("../supabase/migrations/20261016_df_investgo_article_gallery.sql")
 ]);
 assert.match(article,/hero_image_url,body_image_urls/);
 assert.match(article,/const gallery=isBlog/);
 assert.match(article,/dfInvestgoArticleGallery/);
 assert.match(article,/dfInvestgoArticleFigure/);
 assert.match(imageWorker,/body_image_urls:gallery/);
 assert.match(imageWorker,/storage\.from\(BUCKET\)\.upload/);
 assert.match(imageWorker,/migrated_article_id/);
 assert.match(imageWorker,/matchesSource/);
 assert.match(imageWorker,/post\.source_post_id/);
 assert.match(css,/\.dfInvestgoArticleGallery/);
 assert.match(migration,/add column if not exists body_image_urls jsonb/);
});
