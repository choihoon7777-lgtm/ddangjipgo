import test from"node:test";import assert from"node:assert/strict";import{readFile}from"node:fs/promises";
const read=p=>readFile(new URL(p,import.meta.url),"utf8");
test("Homepage retains published data, ad, regional navigation, and guest property features",async()=>{
const s=await read("../app/focus/page.js");for(const x of ['DFLiveNotice placement="home"','DFLiveAd placement="home"','dfHomeLeadCard','dfLatestRow','dfInvestgoHome','dfLandCompact','dfRegionHome','/my/properties','/search','/alerts','/focus/policy','/focus/housing','/focus/projects','/focus/region'])assert.ok(s.includes(x),x);
assert.ok(s.indexOf('{latest.length>0&&')<s.indexOf('<section className="focusHero dfLandCompact">'));
assert.ok(s.indexOf('<section className="focusHero dfLandCompact">')<s.indexOf('{insights.length>0&&'));});
test("Menus have distinct destinations and keep full discovery access",async()=>{
const s=await read("../components/df-shell.js");assert.match(s,/const categories=\["최신뉴스","개발정책","분양·청약","지역 FOCUS"\]/);
for(const u of ['/focus/live','/focus/policy','/my/properties','/my','/focus/region','/focus/search','/alerts'])assert.ok(s.includes(u),u);
assert.match(s,/aria-label="개발포커스 뉴스 카테고리"/);});
test("Policy tab and accessible touch areas are styled",async()=>{const s=await read("../app/focus/policy/page.js"),css=await read("../app/globals.css");assert.match(s,/DFBottomNav active="policy"/);assert.match(css,/\.focusHeaderWrap \.focusTabs>a\{/);assert.match(css,/\.dfPremiumBottom>a\{/);});
