import test from"node:test";import assert from"node:assert/strict";import{readFile}from"node:fs/promises";const read=p=>readFile(new URL(p,import.meta.url),"utf8");
test("New article links straight to exact editorial queue",async()=>{const s=await read("../app/focus-admin/write/page.js");assert.match(s,/setSavedId/);assert.match(s,/focus-admin\/publish\?article=/);assert.match(s,/df_create_article_candidate/);assert.match(s,/p_source_verified:false/);assert.match(s,/p_legal_check_status:"manual_required"/)});
test("Publishing retains protected RPC and offers verified live article link",async()=>{const s=await read("../app/focus-admin/publish/page.js");assert.match(s,/df_publish_article/);assert.match(s,/setPublishedArticle/);assert.match(s,/focus\/article\?id=/);assert.match(s,/!focusId\|\|x.article_id===focusId/);assert.match(s,/legal_check_status==="passed"/);assert.match(s,/x\.df_articles/)});
test("Admin dashboard exposes short publishing flow without bypass",async()=>{const s=await read("../app/focus-admin/page.js");assert.match(s,/dfV2ActionGrid/);for(const p of ["/focus-admin/write","/focus-admin/publish","/focus/live"])assert.ok(s.includes(p));assert.match(s,/관리자 인증 후 가능/)});

test("One-tap review request publishes only after verified backend gates",async()=>{const s=await read("../app/focus-admin/publish/page.js");assert.match(s,/async function requestReviewAndPublish/);assert.match(s,/df_editorial_queue/);assert.match(s,/legal_check_status!=="passed"/);assert.match(s,/risk_level!=="green"/);assert.match(s,/df_publish_article/);assert.match(s,/실제 발행은 운영자 로그인 후 가능/);assert.match(s,/function publishOrShowChecks\(x\)/);assert.match(s,/if\(ready\(x\)\)\{requestReviewAndPublish\(x\);return\}/);assert.match(s,/setPublishedArticle/)});

test("Official policy documents stay separate from editorial review buttons",async()=>{const policy=await read("../app/focus/policy/page.js"),admin=await read("../app/focus-admin/page.js");assert.match(policy,/전국 정책·고시/);assert.match(policy,/핵심 내용 한눈에/);assert.match(admin,/dfV2Priority/);assert.match(admin,/공식기관 업데이트/);assert.match(admin,/검토부터 발행/)});

test("Publishing entry shows real administrator access instead of a demo",async()=>{const s=await read("../app/focus-admin/layout.js");assert.match(s,/path==="\/focus-admin\/publish"\)return <AdminLogin/);const p=await read("../app/focus-admin/publish/page.js");assert.doesNotMatch(p,/async function doPublish/);assert.match(p,/loadError/);assert.match(p,/verifyError\|\|!live/)});


test("Compact mobile publishing keeps action-first cards without changing protected gates",async()=>{
 const [page,css]=await Promise.all([read("../app/focus-admin/publish/page.js"),read("../app/globals.css")]);
 for(const text of ["dfPublishEfficient","dfPublishStateTabs","dfPublishMainActions","dfPublishAudit","shownItems=visibleItems.slice","toggleArticle","dfPublishShowMore","df_publish_article","df_verify_article_sources","notReady","legal_check_status!==\"passed\""]){
  assert.ok(page.includes(text.replaceAll('\\"','"')),text);
 }
 assert.match(page,/const ready=x=>!blocked\(x\)&&!scheduled\(x\)/);
 assert.match(page,/setExpandedArticle/);
 assert.match(page,/aria-expanded=\{open\}/);
 assert.match(page,/open&&<section className="dfPublishAudit"/);
 assert.doesNotMatch(page,/아래 확인 항목을 완료하세요/);
 assert.match(css,/\.dfPublishEfficient \.dfPublishArticleCard/);
 assert.match(css,/\.dfPublishEfficient \.dfPublishMainActions/);
 assert.match(css,/@media\(max-width:365px\)/);
});


test("Mobile publish controls remain in-flow, show locked publish until verified, and never bypass gates",async()=>{
 const [page,css]=await Promise.all([read("../app/focus-admin/publish/page.js"),read("../app/globals.css")]);
 assert.match(css,/nav\.dfPublishStateTabs\s*\{[^}]*position:static/);
 assert.match(css,/nav\.dfPublishStateTabs\s*\{[^}]*transform:none/);
 assert.match(page,/className="adminPrimary dfPublishActionPublish"/);
 assert.match(page,/disabled=\{busy!==""\}/);assert.doesNotMatch(page,/disabled=\{busy!==""\|\|!passed\}/);
 assert.match(page,/onClick=\{\(\)=>publishOrShowChecks\(x\)\}/);
 assert.match(page,/발행 전 확인 필요/);assert.match(page,/예약·보류 등 추가 설정/);
 assert.match(page,/missing\.length\?"미확인: "\+missing\.length/);
 assert.match(page,/df_publish_article/);
 assert.match(page,/legal_check_status!=="passed"/);
 assert.match(page,/risk_level!=="green"/);
});

test("All article cards use exactly one active publish control, without bypassing review gates",async()=>{
 const [page,css]=await Promise.all([read("../app/focus-admin/publish/page.js"),read("../app/globals.css")]);
 assert.match(page,/function publishOrShowChecks\(x\)/);
 assert.match(page,/if\(ready\(x\)\)\{requestReviewAndPublish\(x\);return\}/);
 assert.match(page,/setExpandedArticle\(x\.article_id\)/);
 assert.match(page,/onClick=\{\(\)=>publishOrShowChecks\(x\)\}/);
 assert.match(page,/>발행<\/button>/);
 assert.doesNotMatch(page,/발행 대기<\/button>/);
 assert.match(page,/df_publish_article/);
 assert.match(page,/notReady\.length/);
 assert.match(css,/\.dfPublishEfficient \.dfPublishMainActions\.dfPublishSingleAction/);
 assert.match(css,/nav\.dfPublishStateTabs\s*\{[^}]*position:static/);
});
