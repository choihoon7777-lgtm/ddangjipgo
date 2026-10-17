import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=p=>readFile(new URL(p,import.meta.url),"utf8");

test("New official articles use one complete original source body, not duplicated key text", async()=>{
 const s=await read("../supabase/migrations/20261017_df_official_article_single_body.sql");
 assert.match(s,/v_body:=jsonb_build_array\(r\.content_text\)/);
 assert.doesNotMatch(s,/format\('■ 핵심 내용'/);
 assert.match(s,/v_publish:=r\.detail_status='complete'/);
 assert.match(s,/r\.raw_payload->>'attachments_detected'/);
 assert.match(s,/not exists\(select 1 from public\.df_articles a where a\.source_document_id=d\.id\)/);
 assert.match(s,/v_summary:=jsonb_build_array/);
 assert.match(s,/source_document_id/);
});

test("Existing official articles shed only factory-added duplicate introduction, with backup and evidence", async()=>{
 const s=await read("../supabase/migrations/20261017_df_official_article_single_body.sql");
 assert.match(s,/create table if not exists public\.df_article_duplicate_prefix_backup/);
 assert.match(s,/enable row level security/);
 assert.match(s,/revoke all on public\.df_article_duplicate_prefix_backup from public,anon,authenticated/);
 assert.match(s,/body->>0 like '%■ 핵심 내용%'|left\(a\.body->>0,length\('■ 핵심 내용'\)\)='■ 핵심 내용'/);
 assert.match(s,/■ 공식 문서 내용/);
 assert.match(s,/■ 공식자료 확인 범위/);
 assert.match(s,/substring\(body->>0 from strpos\(body->>0,delimiter\)\+length\(delimiter\)\)/);
 assert.match(s,/set body=jsonb_build_array\(e\.preserved_body\)/);
 assert.match(s,/on conflict\(article_id\) do nothing/);
 assert.doesNotMatch(s,/set published_at|set original_source_url|set source_document_id/i);
});

test("Reader retains concise summary and a single body section for non-blog official news", async()=>{
 const reader=await read("../app/focus/article/article-client.js");
 assert.match(reader,/dfKeySummary/);
 assert.match(reader,/dfOfficialNewsFullText/);
 assert.match(reader,/기사 본문/);
 assert.match(reader,/OfficialArticleText content=\{body\}/);
 assert.doesNotMatch(reader,/officialBody.*keyContent|keyContent.*officialBody/);
});
