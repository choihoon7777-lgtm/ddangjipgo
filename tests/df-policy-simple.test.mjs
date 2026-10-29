import test from"node:test";import assert from"node:assert/strict";import{readFile}from"node:fs/promises";
const read=p=>readFile(new URL(p,import.meta.url),"utf8");

test("Policy detail is a concise Citymaek evidence-first decision reader, not a full original mirror",async()=>{
 const s=await read("../app/focus/policy/page.js");
 assert.match(s,/핵심 내용/);
 assert.match(s,/dfPolicyKeySentences/);
 assert.match(s,/공식 문서에서 추출한 사업정보/);
 assert.doesNotMatch(s,/dfDecisionBrief/);
 assert.match(s,/dfDecisionChecks/);
 assert.match(s,/변경 전·후 항목과 실제 변경 범위|실무 확인사항|투자·개발 판단 전 확인/);
 assert.match(s,/공식 첨부파일/);
 assert.match(s,/detail\.key_content/);
 assert.match(s,/detail\.key_facts/);
 assert.doesNotMatch(s,/detail\.content_text/);
 assert.doesNotMatch(s,/OfficialArticleText|dfPolicyFullReader/);
});

test("Policy detail keeps a concise byline but omits the final official source block",async()=>{
 const s=await read("../app/focus/policy/page.js");
 assert.match(s,/detail\.source_name/);
 assert.match(s,/x\.source_name/);
 assert.doesNotMatch(s,/dfPolicyOfficialCta|최종 확인 \/ 공식 출처|detail\.official_url/);
});

test("Policy list surfaces key content before opening a document",async()=>{
 const s=await read("../app/focus/policy/page.js");
 assert.match(s,/x\.key_content/);
 assert.match(s,/dfPolicyKeyPreview/);
 assert.match(s,/사업정보 → 핵심 내용 → 첨부자료/);
 assert.match(s,/dfDecisionCardLabel/);
});

test("Policy can show verified cached records when the public Supabase RPC is unavailable",async()=>{
 const s=await read("../app/focus/policy/page.js");
 const snapshot=JSON.parse(await read("../lib/df-policy-snapshot.json"));
 assert.match(s,/policySnapshot/);
 assert.match(s,/result\.error/);
 assert.match(s,/setSnapshotMode\(true\)/);
 assert.match(s,/cachedPolicies\(c,t\)/);
 assert.match(s,/마지막 원문 수집 확인/);
 assert.equal(snapshot.items.length,100);
 assert.equal(Object.keys(snapshot.details).length,100);
 for(const item of snapshot.items){
  assert.ok(snapshot.details[item.id],"List and detailed cached data must match");
  assert.ok(item.key_content,"Only source-verified records should be cached");
 }
});
