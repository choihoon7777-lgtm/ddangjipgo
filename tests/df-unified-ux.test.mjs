import test from"node:test";import assert from"node:assert/strict";import{readFile}from"node:fs/promises";const read=p=>readFile(new URL(p,import.meta.url),"utf8");
test("Home errors can be retried",async()=>{const s=await read("../app/focus/page.js");assert.match(s,/role="alert"/);assert.match(s,/setReload\(x=>x\+1\)/);assert.match(s,/top\.error/);});
test("Policy has a visible older documents control",async()=>{const s=await read("../app/focus/policy/page.js");assert.match(s,/visibleCount/);assert.match(s,/items\.slice\(0,visibleCount\)/);assert.match(s,/이전 자료 더 보기/);});
test("Article retains headings but no table of contents",async()=>{const s=await read("../components/df-official-article-text.js");assert.doesNotMatch(s,/dfEditorialOutline/);assert.match(s,/dfEditorialHeading/);});
