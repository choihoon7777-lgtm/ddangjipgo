import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {parseOfficialDetail,extractAttachments,extractOfficialFacts,extractOfficialKeyContent} from '../lib/focus-policy-parsers.js';
import {officialUrl,extractHwpx} from '../lib/focus-official-fetch.js';
test('navigation-only pages cannot become official body',()=>{
 assert.equal(parseOfficialDetail('https://example.go.kr','<body>로그인 사이트맵 '+ '도시개발 사업 공고 '.repeat(40)+'</body>').complete,false);
});
test('Incheon short body and HWPX filename survive extraction',()=>{
 const body='공원 면적을 변경하고 지형도면을 고시합니다. 관계도서는 도시관리과에서 열람할 수 있습니다.';
 const parsed=parseOfficialDetail('https://announce.incheon.go.kr','<td wrap="VIRTUAL">'+body+'</td><a href="/download.jsp?fid=1">고시.hwpx</a>');
 assert.equal(parsed.text,body);assert.equal(parsed.complete,true);assert.equal(parsed.attachments.length,1);
 assert.equal(extractAttachments('https://example.go.kr','<a href="javascript:alert(1)">첨부파일</a>').length,0);
});
test('facts do not spill across fields or choose ambiguous old area',()=>{
 assert.deepEqual(extractOfficialFacts('담당부서: 도로과\n등록일: 2026-09-28\n면적: 100㎡\n면적: 120㎡'),{'담당부서':'도로과','등록일':'2026-09-28'});
 assert.equal(extractOfficialKeyContent('로그인\n개인정보처리방침\n사업 제목','사업 제목'),'');
});
test('HWPX reads visible text, excluding field instructions and controls',()=>{
 const z=zipSync({'Contents/section0.xml':strToU8('<hp:p><hp:fieldBegin>SECRET FORMULA</hp:fieldBegin><hp:t>면적: 100<hp:fwSpace/>㎡</hp:t></hp:p>')});
 assert.equal(extractHwpx(z),'면적: 100 ㎡');
});
test('official fetch rejects non-official targets and credentials',()=>{
 for(const url of ['https://example.com','http://127.0.0.1','https://foo.go.kr.evil.com','https://name:pass@foo.go.kr'])assert.throws(()=>officialUrl(url));
 assert.equal(officialUrl('https://www.korea.kr/common/download.do').hostname,'www.korea.kr');
});
