import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const source=await readFile(new URL("../lib/df-editorial-format.js",import.meta.url),"utf8");
const {parseEditorialBody,getEditorialOutline,safeOriginalUrl,decodeEditorialEntities}=await import("data:text/javascript;base64,"+Buffer.from(source).toString("base64"));

test("Official headings and bullets display as structured paragraphs without dropped facts",()=>{
 const blocks=parseEditorialBody("■ 사업 개요\n실제 착공한 사업은 14곳이다.\n남은 사업은 11곳이다.\n\n① 사업일정\n② 공사비 검토\n\n※ 이 기사는 공식 자료를 기준으로 작성했다.");
 assert.equal(blocks[0].kind,"heading");
 assert.ok(blocks.some(x=>x.kind==="bullet"&&x.text.includes("사업일정")));
 assert.ok(blocks.some(x=>x.kind==="note"&&x.text.includes("공식 자료")));
 assert.match(blocks.map(x=>x.text).join(" "),/14곳이다/);
 assert.match(blocks.map(x=>x.text).join(" "),/11곳이다/);
});

test("No excerpt cap: all 28k+ characters survive formatting",()=>{
 const long=Array.from({length:1000},(_,i)=>"2026년 사업계획 세부항목 "+(i+1)+"번은 공식 검증된 조항이다.").join("\n\n");
 assert.ok(long.length>28000);
 const blocks=parseEditorialBody(long);
 assert.equal(blocks.map(x=>x.text).join("\n\n"),long);
 assert.match(blocks.at(-1).text,/1000번/);
});

test("Deduplicate only exact substantial paragraphs and preserve other passages",()=>{
 const intro="서울시는 정비사업 연내 착공을 추진하기 위해 조합과 시공사, 자치구의 협력을 강화하고 공정 지연 요소를 점검하겠다고 발표했다. 사업장별 인허가 처리와 공사비 갈등 해소 여부를 추가 점검할 예정이라고 밝혔다.";
 const blocks=parseEditorialBody("■ 핵심 내용\n"+intro+"\n\n■ 공식 문서 내용\n"+intro+"\n\n사업비 숫자 15,000호와 16,117호는 다르다.");
 assert.equal(blocks.filter(x=>x.text===intro).length,1);
 assert.ok(blocks.some(x=>x.text.includes("16,117호")));
});

test("Whitespace or legal-number differences cannot be treated as duplicate paragraphs",()=>{
 const a="사업 기간 및 인가일은 2026년 10월 14일을 기준으로 확정하지 않았으며 관계기관 협의 뒤 별도로 고시한다. 공식자료에 없는 개발호재나 지가 상승 전망은 임의로 추가하지 않는다. 해당 내용은 최종 변경고시 원문과 대조하여 확인해야 한다.";
 const b=a.replace("관계기관 협의","관계 기관 협의");
 const c=a.replace("2026년 10월 14일","2026년 10월 15일");
 const blocks=parseEditorialBody([a,b,c,a].join("\n\n"));
 assert.deepEqual(blocks.map(x=>x.text),[a,b,c]);
});

test("Long government notices expose heading links aligned to rendered section indices",()=>{
 const source="■ 사업 개요\n확인된 내용입니다.\n\n■ 구역 지정\n지정계획입니다.\n\n■ 주민 의견\n의견 제출 일정을 안내합니다.\n\n■ 첨부자료\n도면은 공식 출처에서 확인합니다.";
 const sections=parseEditorialBody(source);
 const outline=getEditorialOutline(sections);
 assert.deepEqual(outline.map(x=>x.text),["사업 개요","구역 지정","주민 의견","첨부자료"]);
 assert.ok(outline.every(x=>sections[x.index].text===x.text));
 assert.equal(getEditorialOutline(parseEditorialBody("■ 개요\n내용\n■ 일정\n내용")).length,0);
});

test("Source links accept HTTPS only",()=>{
 assert.equal(safeOriginalUrl("javascript:alert(1)"),null);
 assert.equal(safeOriginalUrl("http://notsecure.example.com"),null);
 assert.equal(safeOriginalUrl("https://www.molit.go.kr/abc"),"https://www.molit.go.kr/abc");
});

test("Public article renderer has no duplicated contents navigation and keeps real headings",async()=>{
 const component=await readFile(new URL("../components/df-official-article-text.js",import.meta.url),"utf8");
 assert.doesNotMatch(component,/dfEditorialOutline|이 글의 주요 내용|개 목차|getEditorialOutline/);
 assert.match(component,/sections\.map\(\(b,i\)=>/);
 assert.match(component,/className="dfEditorialHeading"/);
 assert.match(component,/className="dfEditorialParagraph"/);
});


test("Official articles decode HTML quotes, symbols and encoded Hangul without interpreting HTML",()=>{
 const raw="광주시는 &lsquo;도시개발&rsquo; 사업과 &#xC11C;&#50872;의 &middot; 주택 공급을 논의했다. &ldquo;수치 72면&rdquo; &amp; 추가 계획이다.";
 const result=parseEditorialBody(raw).map(x=>x.text).join(" ");
 assert.match(result,/‘도시개발’/);
 assert.match(result,/서울/);
 assert.match(result,/· 주택/);
 assert.match(result,/“수치 72면” & 추가/);
 assert.equal(decodeEditorialEntities("&lt;script&gt;alert(1)&lt;/script&gt;"),"<script>alert(1)</script>");
 assert.equal(decodeEditorialEntities("&unknown; &badname;"),"&unknown; &badname;");
 assert.equal(decodeEditorialEntities("&#0; &#xD800;"),"&#0; &#xD800;");
});

test("Repeated CRLF and blank HTML extraction rows collapse to readable paragraphs, retaining facts",()=>{
 const raw="인천시가 47면을 개방했다.\r\n \r\n  \r\n\n연말까지 72면을 개방한다.\r\n\r\n2027년 8월 개통을 목표로 한다.";
 const blocks=parseEditorialBody(raw);
 assert.equal(blocks.map(x=>x.text).join(" | "),"인천시가 47면을 개방했다. | 연말까지 72면을 개방한다. | 2027년 8월 개통을 목표로 한다.");
});
