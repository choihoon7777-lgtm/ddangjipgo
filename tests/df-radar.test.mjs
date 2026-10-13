import test from 'node:test';
import assert from 'node:assert/strict';
import {placeMention,orderRegionalNews} from '../lib/df-radar-relevance.js';
import {readJitgoLand,landWithFailover} from '../lib/df-land-upstream.js';

test('regional articles are not marked as parcel impact',()=>{
 const addr='대전광역시 유성구 봉명동 629-1';
 const regional=placeMention({title:'대전광역시 개발계획 발표'},addr);
 const mention=placeMention({title:'봉명동 정비사업 논의'},addr);
 const exact=placeMention({title:'봉명동 629-1 공고'},addr);
 assert.equal(regional.rank,0);
 assert.equal(mention.rank,1);
 assert.equal(exact.rank,2);
 assert.match(mention.note,/확인되지 않았습니다/);
 assert.equal(orderRegionalNews([{title:'대전 뉴스'},{title:'봉명동 뉴스'}],addr)[0].title,'봉명동 뉴스');
});

test('official read-only gateway rejects invalid params without fetching',async()=>{
 let r=await readJitgoLand(new Request('https://example.com/api/land?address=ab'),'land');
 assert.equal(r.status,400);
 r=await readJitgoLand(new Request('https://example.com/api/land-transactions?pnu=not-a-pnu'),'land-transactions');
 assert.equal(r.status,400);
 r=await readJitgoLand(new Request('https://example.com/api/land-regulation?pnu=3020011100106290001&lon=9999&lat=1'),'land-regulation');
 assert.equal(r.status,400);
 r=await readJitgoLand(new Request('https://example.com/api/land', {method:'POST'}),'land');
 assert.equal(r.status,405);
});

test('healthy direct local engine remains primary',async()=>{
 const env='DF_RADAR_INTERNAL_TEST_KEY';
 const old=process.env[env];process.env[env]='configured';
 try{
  const request=new Request('https://example.com/api/land?address='+encodeURIComponent('대전광역시 유성구 봉명동 629-1'));
  const response=await landWithFailover(request,'land',()=>{},env,async()=>Response.json({ok:true,engine:'LOCAL'}));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('x-official-data-engine'),'LOCAL');
 }finally{if(old===undefined)delete process.env[env];else process.env[env]=old}
});
