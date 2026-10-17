import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=p=>readFile(new URL(p,import.meta.url),"utf8");
const src=await read("../lib/df-article-summary.js");
const {articleSummary}=await import("data:text/javascript;base64,"+Buffer.from(src).toString("base64"));

test("Shared summary is concise and grounded in existing summary sentences",()=>{
 const raw=[
  "이번 임시주차장은 향후 복합커뮤니티센터가 들어설 예정인 부지를 공사 기간에 임시 활용해 조성했다. 관계기관 간 협의를 통해 유휴공간을 활용한다.",
  "종합건설본부는 올해 연말 주차공간을 추가 확보해 총 72면을 개방할 계획이다. 2027년 8월 지하차도 개통을 목표로 한다.",
  "이한남 본부장은 현장에서 해결책을 찾겠다고 말했다."
 ];
 const before=JSON.stringify(raw);
 const summary=articleSummary(raw,{title:"인천시, 임시주차장 47면 개방"});
 assert.match(summary,/임시주차장/);
 assert.match(summary,/72면/);
 assert.doesNotMatch(summary,/이한남 본부장/);
 assert.ok(summary.length<275);
 assert.equal(JSON.stringify(raw),before);
});

test("Boilerplate, copied article title and exact repeated points do not display",()=>{
 const p=articleSummary([
 "세부 사항은 해당 기관의 자료로 확인해야 합니다.",
 "서울시, 3만 호 착공 목표",
 "서울시는 11개 현장의 연내 착공을 목표로 한다.",
 "서울시는 11개 현장의 연내 착공을 목표로 한다.",
 "다른 확인 사항입니다."
 ],{title:"서울시, 3만 호 착공 목표"});
 assert.equal(p,"서울시는 11개 현장의 연내 착공을 목표로 한다. 다른 확인 사항입니다.");
 assert.equal(articleSummary(["공식 지자체 정책·고시"],{title:"조례 변경"}),"");
 assert.equal(articleSummary(null,{title:"조례 변경"}),"");
});

test("All newsroom channels share title, short digest and exactly one full article body",async()=>{
 const ui=await read("../app/focus/article/article-client.js");
 const css=await read("../app/globals.css");
 assert.match(ui,/articleSummary\(a.summary_3line,\{title:a.title\}\)/);
 assert.match(ui,/dfKeySummary dfUnifiedSummary/);
 assert.match(ui,/dfUnifiedSummaryText/);
 assert.match(ui,/<h2>기사 본문<\/h2>/);
 assert.equal((ui.match(/OfficialArticleText content=\{body\}/g)||[]).length,1);
 assert.doesNotMatch(ui,/dfNewsLead|dfInsightDateNotice|전문 분석|\b01<\/b>/);
 assert.match(ui,/dfInvestgoArticleFigure/);
 assert.match(ui,/dfInvestgoArticleGallery/);
 assert.match(ui,/a.original_source_published_at\|\|a.published_at/);
 assert.match(css,/\.dfNewsArticle \.dfUnifiedSummary/);
 assert.match(css,/-webkit-line-clamp:3/);
});

test("Previously deduplicated official full source is retained and no second factory key block is reintroduced",async()=>{
 const sql=await read("../supabase/migrations/20261017_df_official_article_single_body.sql");
 assert.match(sql,/v_body:=jsonb_build_array\(r.content_text\)/);
 assert.doesNotMatch(sql,/format\('■ 핵심 내용'/);
});
