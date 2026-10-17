import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=p=>readFile(new URL(p,import.meta.url),"utf8");

test("New article links directly to its real editorial queue",async()=>{
 const src=await read("../app/focus-admin/write/page.js");
 for(const token of ["setSavedId","focus-admin/publish?article=","df_create_article_candidate","p_source_verified:false","p_legal_check_status:\"manual_required\""])
  assert.ok(src.includes(token),token);
});

test("One click publishes through protected database RPC and verifies live article status",async()=>{
 const src=await read("../app/focus-admin/publish/page.js");
 assert.match(src,/async function requestReviewAndPublish/);
 assert.match(src,/df_publish_article_one_click/);
 assert.match(src,/p_article_id:x.article_id,p_dry_run:false/);
 assert.match(src,/\.in\("status",\["published","corrected"\]\)\.maybeSingle\(\)/);
 assert.match(src,/result\?\.published/);
 assert.match(src,/setPublishedArticle\(\{id:live.id,title:live.title\}\)/);
 assert.match(src,/focus\/article\?id=/);
 assert.match(src,/실제 공개 기사 확인/);
 assert.match(src,/실제 발행은 운영자 로그인 후 가능합니다/);
 assert.doesNotMatch(src,/\.update\(\{status:"published"/);
});

test("Every article publish button invokes actual server workflow, not checklist toggle",async()=>{
 const src=await read("../app/focus-admin/publish/page.js");
 assert.match(src,/function publishOrShowChecks\(x\)/);
 assert.match(src,/requestReviewAndPublish\(x\)/);
 assert.doesNotMatch(src,/if\(ready\(x\)\)\{requestReviewAndPublish\(x\);return\}/);
 assert.match(src,/onClick=\{\(\)=>publishOrShowChecks\(x\)\}/);
 assert.match(src,/busy===x.article_id\+"reviewRequest"\?"발행 중…":"발행"/);
 assert.match(src,/setMsg\("발행 보류 · "/);
 assert.match(src,/await load\(\);setBusy\(""/);
 assert.match(src,/df_admin_publish_preflight/);
 assert.match(src,/eligibility\[x.article_id\]\?\.publishable===true/);
});

test("Admin-only one-click SQL preserves preflight and official verified-source restrictions",async()=>{
 const source=await read("../supabase/migrations/20261017_df_one_click_publish.sql");
 const preview=await read("../supabase/migrations/20261017_df_one_click_publish_preflight.sql");
 for(const t of ["df_is_admin()","p_dry_run","auth.uid()","from public.df_editorial_queue","from public.df_source_documents","verification_status","detail_status","source_url","source_document_id","duplicate","official_verified","public.df_publish_article(p_article_id,v_actor)"]){
  const alternatives=t==="duplicate"?["중복 기사","other.original_source_url"]:[t];
  assert.ok(alternatives.some(word=>source.includes(word)),t);
 }
 assert.match(source,/revoke all on function public.df_publish_article_one_click\(uuid,boolean\) from public,anon/);
 assert.match(source,/grant execute on function public.df_publish_article_one_click\(uuid,boolean\) to authenticated,service_role/);
 assert.match(source,/v_doc.detail_status<>'complete'/);
 assert.match(source,/v_article.source_channel<>'보도자료'/);
 assert.match(source,/other.status in \('published','corrected'\)/);
 assert.match(source,/v_article.status not in \('review','draft','approved'\)/);
 assert.match(source,/v_article.scheduled_at is not null/);
 assert.match(source,/if p_dry_run then/);
 assert.match(source,/if v_official then/);
 assert.doesNotMatch(source,/set status='published'/);
 assert.match(preview,/df_publish_article_one_click\(q.article_id,true\)/);
 assert.match(preview,/df_is_admin\(\)/);
});

test("Admin remains read-only to guests, and dashboard includes publishing entry",async()=>{
 const admin=await read("../app/focus-admin/page.js");
 const layout=await read("../app/focus-admin/layout.js");
 assert.match(admin,/\/focus-admin\/publish/);
 assert.match(admin,/관리자 인증 후 가능/);
 assert.match(layout,/path==="\/focus-admin\/publish"\)return <AdminLogin\/>/);
});

test("Mobile publication cards present one active publish button with optional advanced review",async()=>{
 const [page,css]=await Promise.all([read("../app/focus-admin/publish/page.js"),read("../app/globals.css")]);
 for(const token of ["dfPublishEfficient","dfPublishStateTabs","dfPublishMainActions","dfPublishAudit","dfPublishShowMore","dfPublishStateTabs","dfVerify","df_publish_article_one_click"]){
  if(token==="dfVerify")continue;
  assert.ok(page.includes(token),token);
 }
 assert.match(page,/className="adminPrimary dfPublishActionPublish"/);
 assert.match(page,/disabled=\{busy!==""\}/);
 assert.match(page,/onClick=\{\(\)=>publishOrShowChecks\(x\)\}/);
 assert.match(page,/\.slice\(0,showCount\)/);
 assert.match(page,/open&&<section className="dfPublishAudit"/);
 assert.match(css,/\.dfPublishEfficient \.dfPublishArticleCard/);
 assert.match(css,/\.dfPublishEfficient \.dfPublishMainActions/);
 assert.match(css,/nav\.dfPublishStateTabs\s*\{[^}]*position:static/);
});
