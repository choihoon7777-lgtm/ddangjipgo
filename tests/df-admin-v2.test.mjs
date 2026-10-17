import test from"node:test";
import assert from"node:assert/strict";
import{readFile}from"node:fs/promises";
const read=p=>readFile(new URL(p,import.meta.url),"utf8");
test("Admin dashboard separates today's published articles from cumulative and keeps guest in read-only",async()=>{
 const s=await read("../app/focus-admin/page.js");
 assert.match(s,/published_at",today/);
 assert.match(s,/오늘 발행/);assert.match(s,/전체 발행/);
 assert.match(s,/role\.error\|\|!role\.data/);
 assert.match(s,/guest===true/);assert.match(s,/읽기 전용 검수/);
 assert.match(s,/dfV2Priority/);assert.match(s,/dfV2StatGrid/);
});
test("Editorial review shows blockers but never bypasses protected publication gates",async()=>{
 const s=await read("../app/focus-admin/publish/page.js");
 for(const x of ["queueFilter","visibleItems","legalWait","blocked","df_publish_article_one_click","df_admin_publish_preflight","legal_check_status","미확인:"])assert.ok(s.includes(x),x);
 assert.match(s,/x\.legal_check_status==="passed"/);
 assert.match(s,/p_article_id:x.article_id,p_dry_run:false/);
 assert.match(s,/result\?\.published/);
 assert.doesNotMatch(s,/\.update\(\{legal_check_status:"passed",fact_check_passed:true/);
});
test("Source status can show failures only without altering official data",async()=>{
 const s=await read("../components/df-updates-guest.js");
 assert.match(s,/issuesOnly/);assert.match(s,/badAgencies/);assert.match(s,/오류 기관만 보기/);
 assert.match(s,/displayAgencies\.map/);
 assert.match(s,/DFAdminBottomNav active="updates"/);
});
test("Property panel distinguishes API errors, sync auth and no notices without exposing keys",async()=>{
 const s=await read("../app/focus-admin/housing/page.js");
 for(const t of ["focus-housing-health","/api/focus-housing","officialKeyConfigured","pipelineConfigured","dfV2HousingProblem","개발레이더"] )assert.ok(s.includes(t));
 assert.doesNotMatch(s,/process\.env\.|SUPABASE_SERVICE_ROLE_KEY/);
 assert.match(s,/DFAdminBottomNav active="housing"/);
});
test("Admin menu has five navigable tabs and theme has mobile/focus styles",async()=>{
 const shell=await read("../components/df-shell.js"),css=await read("../app/globals.css");
 for(const u of ["/focus-admin","/focus-admin/publish","/focus-admin/updates","/focus-admin/housing","/focus-admin/system"])assert.ok(shell.includes(u));
 assert.match(shell,/aria-current=\{active===id/);
 for(const c of [".dfV2StatGrid",".dfV2ActionGrid",".dfV2EditorFilters",".dfV2AgencyTriage",".dfV2HousingMetrics",":focus-visible","@media(max-width:350px)"])assert.ok(css.includes(c),c);
});
