import test from "node:test";import assert from "node:assert/strict";import{readFile}from "node:fs/promises";const read=p=>readFile(new URL(p,import.meta.url),"utf8");
test("Public article never renders original links, sources, or branding trust footer",async()=>{const x=await read("../app/focus/article/article-client.js");for(const token of ["dfPublicSources","ORIGINAL SOURCES","원문·출처 확인","투자GO 원문","원래 게시물 보기","dfArticleTrust","df_public_article_sources","safeOriginalUrl"])assert.equal(x.includes(token),false,token);assert.match(x,/OfficialArticleText content=\{body\}/);assert.match(x,/dfCorrectionHistory/);});
test("Official policy view hides original link while keeping core sentences and metadata",async()=>{const x=await read("../app/focus/policy/page.js");assert.doesNotMatch(x,/dfPolicySimpleOriginal|원문 보기 ↗/);assert.match(x,/dfPolicyKeySentences/);assert.match(x,/detail\.published_at/);});


test("Newsroom front page and news list omit technical acquisition labels",async()=>{
 const [home,live,labels]=await Promise.all([
  read("../app/focus/page.js"),
  read("../app/focus/live/page.js"),
  read("../lib/df-home-editorial.js")
 ]);
 assert.doesNotMatch(home,/articleSourceLabel/);
 assert.doesNotMatch(live,/공식자료 기반 · 발행/);
 assert.doesNotMatch(home,/원문 출처 확인|자동수집 · 공식 보도자료/);
 assert.match(home,/dateLabel\(a.published_at\)/);
 assert.match(live,/publicationDate\(a.published_at\)/);
 const {articleSourceLabel}=await import("data:text/javascript;base64,"+Buffer.from(labels).toString("base64"));
 for(const channel of ["보도자료","고시공고","입법예고","조례규칙","investgo",null]){
  assert.equal(articleSourceLabel({source_channel:channel}),"");
 }
});

test("Old generated source subtitles are removed but original agency evidence is preserved",async()=>{
 const sql=await read("../supabase/migrations/20261017_df_hide_internal_source_labels.sql");
 assert.match(sql,/df_article_auto_subtitle_backup/);
 assert.match(sql,/set subtitle = null/);
 assert.match(sql,/null::text,v_summary,v_body/);
 assert.match(sql,/r.source_url,v_source_name,r.published_at,r.id/);
 assert.match(sql,/a.source_channel is null and a.subtitle='공식 지자체 정책·고시'/);
 assert.match(sql,/alter table public.df_article_auto_subtitle_backup enable row level security/);
 assert.doesNotMatch(sql,/set original_source_label\s*=/);
 assert.doesNotMatch(sql,/set body\s*=/);
});
