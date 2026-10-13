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

import {officialSnapshot,compareSnapshots,distanceMeters,spatialEvidence} from '../lib/df-radar-engine.js';

test('official zoning radar ignores order and rejects incomplete measurements',()=>{
 const pnu='3020011100106290001';
 assert.equal(officialSnapshot({ok:true,pnu,zoning:{zones:[],districts:[],areas:[]}},pnu),null);
 assert.equal(officialSnapshot({ok:true,pnu:'3020011100106290002',zoning:{zones:['상업'],districts:[],areas:[]}},pnu),null);
 const a=officialSnapshot({ok:true,pnu,zoning:{zones:['일반상업지역'],districts:['지구단위계획구역'],areas:[]}},pnu);
 const b=officialSnapshot({ok:true,pnu,zoning:{zones:['일반상업지역'],districts:['지구단위계획구역','온천원보호지구'],areas:[]}},pnu);
 assert.equal(compareSnapshots(a,a).status,'unchanged');
 const diff=compareSnapshots(a,b);
 assert.equal(diff.status,'changed');
 assert.deepEqual(diff.changes.map(x=>x.value),['온천원보호지구']);
});

test('geographic claims require verified source coordinates',()=>{
 const parcel={lat:36.35,lon:127.35,radius_m:1000};
 assert.equal(distanceMeters(parcel,{lat:36.35,lon:127.35}),0);
 assert.equal(spatialEvidence(parcel,{point:{lat:36.3504,lon:127.3504}}).status,'unverified');
 const record={point:{lat:36.3504,lon:127.3504},verificationStatus:'verified',locationSource:'official parcel coordinate',sourceUrl:'https://www.daejeon.go.kr/'};
 const x=spatialEvidence(parcel,record);
 assert.equal(x.status,'within-radius');
 assert.ok(x.distanceMeters<100);
});

import {locateWatch,sourceMention,previewEvidence,compareDocumentVersions} from '../lib/df-radar-official.js';

test('official evidence requires verified, official source and does not assert distance or legal impact',()=>{
 const watch={address:'대전광역시 유성구 원촌동 112-4',pnu:'3020011100101120004'};
 const doc={id:'doc1',title:'원촌동 112-4 개발계획 열람공고',content_text:'원촌동 112-4에 관한 의견수렴',source_url:'https://www.daejeon.go.kr/notice/1',verification_status:'verified',published_at:'2026-10-10'};
 assert.equal(locateWatch(watch.address,watch.pnu).lot,'112-4');
 assert.equal(sourceMention(doc,watch).level,'address-mention');
 assert.equal(sourceMention({...doc,verification_status:'pending'},watch).score,0);
 assert.equal(sourceMention({...doc,source_url:'https://example.org/a'},watch).score,0);
 const result=previewEvidence([doc],watch);
 assert.equal(result.length,1);
 assert.equal(result[0].distanceMeters,null);
 assert.equal(result[0].impactConfirmed,false);
 assert.equal(result[0].changeConfirmed,false);
 const withPnu={...doc,content_text:doc.content_text+' PNU:3020011100101120004'};
 assert.equal(sourceMention(withPnu,watch).level,'parcel-mention');
});

test('document changes require two distinct source-version snapshots',()=>{
 const only=[{content_hash:'a',captured_at:'2026-10-01T00:00:00Z'}];
 assert.equal(compareDocumentVersions(only).changed,false);
 assert.equal(compareDocumentVersions([...only,{content_hash:'a',captured_at:'2026-10-02T00:00:00Z'}]).changed,false);
 const comparison=compareDocumentVersions([...only,{content_hash:'b',captured_at:'2026-10-02T00:00:00Z'}]);
 assert.equal(comparison.changed,true);
 assert.equal(comparison.hasHistory,true);
});

import {REGION_NAMES,OFFICIAL_CHANNELS,officialRegion,officialChannel,filteredOfficial} from '../lib/df-region-official.js';

test('official policy documents are grouped by metadata and trusted government publisher',()=>{
 const seoul={id:'a',region_code:'서울',source_name:'서울특별시 고시·공고',channel:'고시공고',title:'지구단위계획 결정 고시',published_at:'2026-10-13'};
 const daejeon={id:'b',region_code:'대전',source_name:'대전광역시 자동수집',channel:'보도자료',published_at:'2026-10-12'};
 const incheon={id:'c',region_code:null,source_name:'인천광역시 고시·공고',channel:'입법예고',published_at:'2026-10-11'};
 const national={id:'d',region_code:null,source_name:'국토교통부',title:'서울 도로 발표',channel:'보도자료',published_at:'2026-10-10'};
 assert.equal(officialRegion(seoul),'서울');
 assert.equal(officialRegion(incheon),'인천');
 assert.equal(officialRegion(national),null);
 assert.equal(officialChannel(seoul),'고시·공고');
 assert.deepEqual(filteredOfficial([seoul,daejeon,incheon,national],'서울').map(x=>x.id),['a']);
 assert.deepEqual(filteredOfficial([seoul,daejeon,incheon,national],'전국','입법예고').map(x=>x.id),['c']);
 assert.equal(REGION_NAMES.length,18);
 assert.ok(OFFICIAL_CHANNELS.includes('보도자료'));
});
