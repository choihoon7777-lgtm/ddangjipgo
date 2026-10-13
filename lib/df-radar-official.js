// Official-source evidence selection. A mention is not proof of distance, zoning change or parcel inclusion.
const norm=x=>String(x??'').normalize('NFKC').replace(/\s+/g,' ').trim();
const officialURL=x=>{try{const u=new URL(x);return u.protocol==='https:'&&(/(^|\.)go\.kr$/.test(u.hostname)||/(^|\.)re\.kr$/.test(u.hostname)||['korea.kr','www.korea.kr'].includes(u.hostname));}catch{return false;}};
export function locateWatch(address,pnu){
 const text=norm(address);
 const region=[...text.matchAll(/(?:^|\s)([가-힣0-9]{1,18}(?:동|읍|면|리))(?=\s|$)/g)].map(x=>x[1]);
 const lots=[...text.matchAll(/(?:^|\s)(산\s*)?(\d{1,5}(?:-\d{1,4})?)(?=\s|$)/g)];
 const lot=lots.length?(lots[lots.length-1][1]?'산 ':'')+lots[lots.length-1][2]:'';
 return {address:text,dong:region.at(-1)||'',lot,pnu:/^\d{19}$/.test(String(pnu||''))?String(pnu):null};
}
export function sourceMention(doc,watch){
 const target=locateWatch(watch?.address||watch?.address_text||'',watch?.pnu||watch?.parcel_key);
 const verified=doc?.verification_status==='verified'||doc?.verification_status==='confirmed';
 const sourceUrl=doc?.detail_url||doc?.source_url||'';
 if(!verified||!officialURL(sourceUrl))return {level:'unverified',score:0,reason:'공식 원문 검증 또는 공식 출처 확인 필요'};
 const body=norm(doc?.content_text||doc?.key_content||'').slice(0,80000),title=norm(doc?.title);
 const full=title+' '+body;
 const hasPnu=target.pnu&&new RegExp('(?:^|\\D)'+target.pnu+'(?:\\D|$)').test(full);
 // Keep administrative place and lot close to avoid unrelated parcel-list collisions.
 const lotPattern=target.lot.replace(/\s+/g,'\\s*');
 const near=Boolean(target.dong&&lotPattern&&new RegExp(target.dong+'[\\s\\S]{0,80}'+lotPattern+'(?!\\d)').test(full));
 if(hasPnu)return {level:'parcel-mention',score:3,reason:'검증된 공식 원문에 동일 19자리 필지번호(PNU) 기재',sourceUrl,documentId:doc.id};
 if(near)return {level:'address-mention',score:2,reason:'검증된 공식 원문에 동일 행정동·지번이 근접 기재',sourceUrl,documentId:doc.id};
 if(target.dong&&full.includes(target.dong))return {level:'district-mention',score:1,reason:'검증된 공식 원문에 동일 행정동만 기재',sourceUrl,documentId:doc.id};
 return {level:'unrelated',score:0,reason:'동일 행정동·필지 근거 없음',sourceUrl,documentId:doc.id};
}
export function previewEvidence(docs,watch,{minScore=1,limit=30}={}){
 const dedupe=new Set();
 return (Array.isArray(docs)?docs:[]).map(doc=>({doc,evidence:sourceMention(doc,watch)}))
 .filter(x=>x.evidence.score>=minScore)
 .sort((a,b)=>b.evidence.score-a.evidence.score||new Date(b.doc.published_at||0)-new Date(a.doc.published_at||0))
 .filter(x=>{const key=x.doc.canonical_key||x.doc.source_url||x.doc.id;if(dedupe.has(key))return false;dedupe.add(key);return true;})
 .slice(0,limit).map(({doc,evidence})=>({
  documentId:doc.id,title:doc.title,publishedAt:doc.published_at,sourceUrl:evidence.sourceUrl,
  publicationType:doc.key_facts?.['자료구분']||null,noticeNumber:doc.key_facts?.['고시·공고번호']||doc.key_facts?.['공고번호']||null,
  evidenceLevel:evidence.level,reason:evidence.reason,
  reviewStatus:'candidate-only',distanceMeters:null,impactConfirmed:false,changeConfirmed:false
 }));
}
export function compareDocumentVersions(versions){
 const valid=(Array.isArray(versions)?versions:[]).filter(x=>x?.content_hash&&x?.captured_at).sort((a,b)=>new Date(a.captured_at)-new Date(b.captured_at));
 const hashes=[...new Set(valid.map(x=>x.content_hash))];
 return {hasHistory:valid.length>=2,changed:hashes.length>=2,distinctVersions:hashes.length,latestAt:valid.at(-1)?.captured_at||null};
}
