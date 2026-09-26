const https=require('https');

const RULESET={
 version:'2026-09-01-ko-planning-v2',verifiedAt:'2026-09-01',reviewBy:'2026-09-30',
 national:{
  '제1종전용주거지역':{bcr:[0,50],far:[50,100]},'제2종전용주거지역':{bcr:[0,50],far:[50,150]},
  '제1종일반주거지역':{bcr:[0,60],far:[100,200]},'제2종일반주거지역':{bcr:[0,60],far:[100,250]},'제3종일반주거지역':{bcr:[0,50],far:[100,300]},
  '준주거지역':{bcr:[0,70],far:[200,500]},'중심상업지역':{bcr:[0,90],far:[200,1500]},'일반상업지역':{bcr:[0,80],far:[200,1300]},'근린상업지역':{bcr:[0,70],far:[200,900]},'유통상업지역':{bcr:[0,80],far:[200,1100]},
  '전용공업지역':{bcr:[0,70],far:[150,300]},'일반공업지역':{bcr:[0,70],far:[150,350]},'준공업지역':{bcr:[0,70],far:[150,400]},
  '보전녹지지역':{bcr:[0,20],far:[50,80]},'생산녹지지역':{bcr:[0,20],far:[50,100]},'자연녹지지역':{bcr:[0,20],far:[50,100]},
  '보전관리지역':{bcr:[0,20],far:[50,80]},'생산관리지역':{bcr:[0,20],far:[50,80]},'계획관리지역':{bcr:[0,40],far:[50,100]},'농림지역':{bcr:[0,20],far:[50,80]},'자연환경보전지역':{bcr:[0,20],far:[50,80]}
 },
 daejeon:{
  '제1종전용주거지역':[50,100],'제2종전용주거지역':[40,120],'제1종일반주거지역':[60,150],'제2종일반주거지역':[60,200],'제3종일반주거지역':[50,250],
  '준주거지역':[60,400],'중심상업지역':[80,1300],'일반상업지역':[70,1100],'근린상업지역':[60,700],'유통상업지역':[70,900],
  '전용공업지역':[70,300],'일반공업지역':[70,350],'준공업지역':[70,400],'보전녹지지역':[20,60],'생산녹지지역':[20,70],'자연녹지지역':[20,80],
  '보전관리지역':[20,60],'생산관리지역':[20,70],'계획관리지역':[40,80],'농림지역':[20,70],'자연환경보전지역':[20,60]
 },
 sources:{
  nationalBcr:{title:'국토의 계획 및 이용에 관한 법률 시행령 제84조',url:'https://www.law.go.kr/법령/국토의계획및이용에관한법률시행령/제84조'},
  nationalFar:{title:'국토의 계획 및 이용에 관한 법률 시행령 제85조',url:'https://www.law.go.kr/법령/국토의계획및이용에관한법률시행령/제85조'},
  daejeon:{title:'대전광역시 도시계획 조례 제45조·제50조',url:'https://www.law.go.kr/ordinInfoP.do?ordinSeq=2110261'}
 }
};
const OVERLAY_PATTERNS=[
 ['districtUnit',/지구단위계획/],['growthManagement',/성장관리계획/],['researchSpecial',/연구개발특구/],['industrialComplex',/산업단지/],['urbanDevelopment',/도시개발구역/],['maintenance',/정비구역|재정비촉진/],['greenbelt',/개발제한구역/],['developmentRestriction',/개발행위허가제한지역/],['freeEconomic',/경제자유구역/],['innovation',/도시혁신구역|복합용도구역/],['planningFacility',/도시계획시설/],['heritage',/역사문화환경보존지역/]
];
const NON_BLOCKING=/^(도시지역|가축사육제한구역|중점경관관리구역)$/;
const get=(url,accept='application/json,text/plain,*/*')=>new Promise((resolve,reject)=>{const u=new URL(url),r=https.request({protocol:u.protocol,hostname:u.hostname,path:u.pathname+u.search,headers:{'User-Agent':'JITGO/1.0','Accept':accept,'Referer':'https://jitgo-v12-review.vercel.app/'},timeout:8000},x=>{let t='';x.setEncoding('utf8');x.on('data',d=>t+=d);x.on('end',()=>x.statusCode>=200&&x.statusCode<300?resolve(t):reject(new Error('HTTP_'+x.statusCode)))});r.on('timeout',()=>r.destroy(new Error('TIMEOUT')));r.on('error',reject);r.end()});
const json=async u=>JSON.parse(await get(u));
const pick=(o,ks)=>{for(const k of ks)if(o&&o[k]!=null&&String(o[k]).trim())return o[k];return null};
const tag=(x,n)=>{const m=x&&x.match(new RegExp(`<${n}>([\\s\\S]*?)<\\/${n}>`,'i'));return m?m[1].trim():null};
const arr=o=>{for(const v of [o?.landUses?.field,o?.landUses?.landUse,o?.response?.body?.items?.item,o?.response?.body?.items]){if(Array.isArray(v))return v;if(v&&typeof v==='object')return[v]}return[]};
const uniq=a=>[...new Set(a.map(x=>String(x||'').trim()).filter(Boolean))];
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
 const key=process.env.VWORLD_API_KEY,address=String(req.query.address||'').trim().replace(/\s+/g,' ');
 if(!key)return res.status(500).json({ok:false,error:'VWORLD_API_KEY_NOT_CONFIGURED'});if(address.length<5)return res.status(400).json({ok:false,error:'ADDRESS_REQUIRED'});
 try{
  const g=new URL('https://api.vworld.kr/req/address');g.search=new URLSearchParams({service:'address',request:'getcoord',version:'2.0',crs:'EPSG:4326',address,refine:'true',simple:'false',format:'json',type:'PARCEL',key,domain:'https://jitgo-v12-review.vercel.app'});
  const pt=(await json(g))?.response?.result?.point;if(!pt)return res.status(404).json({ok:false,error:'ADDRESS_NOT_FOUND'});const lon=Number(pt.x),lat=Number(pt.y);
  const purl=new URL('https://api.vworld.kr/req/data');purl.search=new URLSearchParams({service:'data',request:'GetFeature',data:'LP_PA_CBND_BUBUN',key,domain:'https://jitgo-v12-review.vercel.app',format:'json',size:'10',page:'1',geometry:'true',attribute:'true',crs:'EPSG:4326',geomFilter:`POINT(${lon} ${lat})`});
  const fs=(await json(purl))?.response?.result?.featureCollection?.features||[],f=fs[0];if(!f)return res.status(404).json({ok:false,error:'PARCEL_NOT_FOUND'});const pnu=String(pick(f.properties,['pnu','PNU'])||'');if(pnu.length!==19)return res.status(502).json({ok:false,error:'PNU_NOT_RETURNED'});
  const lu=new URL('https://api.vworld.kr/ned/data/getLandUseAttr');lu.search=new URLSearchParams({pnu,format:'json',key,domain:'https://jitgo-v12-review.vercel.app',numOfRows:'1000'});const uses=arr(await json(lu)),all=uniq(uses.map(x=>pick(x,['prposAreaDstrcCodeNm','prposAreaDstrcNm','prposAreaDstrc','uname','unm','name'])));const zones=all.filter(n=>/(주거|상업|공업|녹지|관리|농림|자연환경보전)지역/.test(n));
  let ledger={};try{const u=new URL('https://api.vworld.kr/ned/data/ladfrlList');u.search=new URLSearchParams({key,pnu,format:'xml',numOfRows:'10',pageNo:'1',domain:'https://jitgo-v12-review.vercel.app'});const x=await get(u,'application/xml,text/xml,*/*');ledger={type:tag(x,'lndcgrCodeNm'),area:Number(tag(x,'lndpclAr'))||null,updated:tag(x,'lastUpdtDt')}}catch(e){}
  const zone=zones.length===1?zones[0]:null,national=zone?RULESET.national[zone]||null:null,isDaejeon=/^대전광역시\s/.test(address)||pnu.startsWith('30'),local=zone&&isDaejeon?RULESET.daejeon[zone]||null:null;const overlays=OVERLAY_PATTERNS.flatMap(([type,re])=>all.filter(n=>re.test(n)).map(name=>({type,name}))).filter((x,i,a)=>a.findIndex(y=>y.type===x.type&&y.name===x.name)===i);const stale=Date.now()>Date.parse(RULESET.reviewBy+'T23:59:59+09:00');const blockers=[];
  if(zones.length!==1)blockers.push({code:'MULTI_OR_UNKNOWN_ZONE',reason:zones.length>1?'복수 용도지역의 필지별 편입면적 및 적용방식 검토가 필요합니다.':'용도지역을 하나로 확정하지 못했습니다.'});if(!local)blockers.push({code:'LOCAL_ORDINANCE_UNVERIFIED',reason:isDaejeon?'해당 용도지역의 대전광역시 조례값을 확인하지 못했습니다.':'현재 자동확정 규칙셋은 대전광역시 조례만 검증되어 있습니다.'});if(stale)blockers.push({code:'RULESET_REVIEW_DUE',reason:'법령·조례 규칙셋 재검증 기한이 지나 최신성 확인이 필요합니다.'});
  for(const o of overlays)blockers.push({code:'OVERLAY_REVIEW_REQUIRED',overlay:o.name,reason:`${o.name}의 개별 계획·특례·고시를 확인해야 최종값을 확정할 수 있습니다.`});
  const recognized=new Set([zone,'도시지역','가축사육제한구역','중점경관관리구역',...overlays.map(x=>x.name)].filter(Boolean));const unmodeled=all.filter(n=>!recognized.has(n)&&!NON_BLOCKING.test(n));if(unmodeled.length)blockers.push({code:'UNMODELED_CONSTRAINTS',items:unmodeled,reason:'아직 규제 결정규칙에 반영되지 않은 용도지구·구역·시설이 있어 자동확정을 중지합니다.'});
  const finalConfirmed=!!(zone&&national&&local&&!blockers.length),bcr=finalConfirmed?local[0]:null,far=finalConfirmed?local[1]:null,area=ledger.area;const sqmToPyeong=v=>v==null?null:Math.round(v/3.305785*10)/10;
  return res.status(200).json({ok:true,engine:'JITGO_BUILDING_ENVELOPE_V2',ruleset:{version:RULESET.version,verifiedAt:RULESET.verifiedAt,reviewBy:RULESET.reviewBy,stale},parcel:{address,pnu,point:{lon,lat},jibun:pick(f.properties,['jibun','JIBUN']),landCategory:ledger.type||null,areaSqm:area,areaPyeong:sqmToPyeong(area),ledgerUpdated:ledger.updated||null},regulation:{zones,all,overlays,unmodeled},basis:{national:national?{zone,bcrMaxPct:national.bcr[1],farRangePct:national.far,sourceBcr:RULESET.sources.nationalBcr,sourceFar:RULESET.sources.nationalFar}:null,ordinance:local?{jurisdiction:'대전광역시',zone,bcrMaxPct:local[0],farMaxPct:local[1],source:RULESET.sources.daejeon}:null},decision:{status:finalConfirmed?'confirmed':'needs-review',label:finalConfirmed?'🟢 기본 검토 가능':'🟡 추가 확인 필요',confidence:finalConfirmed?'높음':'확인 필요',buildingCoverageRatioPct:bcr,floorAreaRatioPct:far,blockers},scale:{maxBuildingAreaSqm:bcr&&area?Math.round(area*bcr)/100:null,maxBuildingAreaPyeong:bcr&&area?sqmToPyeong(area*bcr/100):null,maxFarFloorAreaSqm:far&&area?Math.round(area*far)/100:null,maxFarFloorAreaPyeong:far&&area?sqmToPyeong(area*far/100):null,note:'법정 최대 규모는 실제 설계 가능 규모와 다릅니다.'},source:{parcel:'국토교통부 VWorld 연속지적도',landLedger:'국토교통부 VWorld 토지임야대장',landUse:'국토교통부 VWorld 토지이용계획 속성조회'},note:'Fail-closed: 지구단위계획·특별법·개별계획뿐 아니라 아직 모델링되지 않은 용도지구·구역·시설이 있으면 자동확정을 중지합니다.'});
 }catch(e){console.error('building envelope',e);return res.status(502).json({ok:false,error:'BUILDING_ENVELOPE_LOOKUP_FAILED',detail:String(e.message||e)})}
};
