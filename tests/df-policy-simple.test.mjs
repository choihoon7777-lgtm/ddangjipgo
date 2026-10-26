import test from"node:test";import assert from"node:assert/strict";import{readFile}from"node:fs/promises";
const read=p=>readFile(new URL(p,import.meta.url),"utf8");

test("Policy detail is a concise Development Focus reader, not a full original mirror",async()=>{
 const s=await read("../app/focus/policy/page.js");
 assert.match(s,/핵심 내용/);
 assert.match(s,/dfPolicyKeySentences/);
 assert.match(s,/문서에서 확인된 정보/);
 assert.match(s,/공식 첨부파일/);
 assert.match(s,/detail\.key_content/);
 assert.match(s,/detail\.key_facts/);
 assert.doesNotMatch(s,/detail\.content_text/);
 assert.doesNotMatch(s,/OfficialArticleText|dfPolicyFullReader/);
});

test("Policy reader identifies the official source and links out for full detail",async()=>{
 const s=await read("../app/focus/policy/page.js");
 assert.match(s,/detail\.source_name/);
 assert.match(s,/x\.source_name/);
 assert.match(s,/detail\.official_url/);
 assert.match(s,/공식 사이트에서 자세히 보기 ↗/);
 assert.doesNotMatch(s,/detail\.source_url/);
});

test("Policy list surfaces key content before opening a document",async()=>{
 const s=await read("../app/focus/policy/page.js");
 assert.match(s,/x\.key_content/);
 assert.match(s,/dfPolicyKeyPreview/);
 assert.match(s,/원문을 열지 않아도 주요 내용을 확인할 수 있습니다/);
});
