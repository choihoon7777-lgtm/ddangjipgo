const https=require('https');
const turf=require('@turf/turf');
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
 const key=process.env.VWORLD_API_KEY,pnu=String(req.query.pnu||'').replace(/\D/g,''),lon=Number(req.query.lon),lat=Number(req.query.lat);
 if(pnu.length!==19)return res.status(400).json({ok:false,error:'PNU_REQUIRED'});
 if(!key)return res.status(500).json({ok:false,error:'VWORLD_API_KEY_NOT_CONFIGURED'});
 const domain='https://jitgo-v12-review.vercel.app';
 const getJson=url=>new Promise((resolve,reject)=>{const u=new URL(url);const r=https.request({protocol:u.protocol,hostname:u.hostname,path:u.pathname+u.search,headers:{'User-Agent':'JITGO/1.0','Accept':'application/json','Referer':domain+'/'},timeout:6500},x=>{let t='';x.setEncoding('utf8');x.on('data',d=>{if(t.length<2000000)t+=d});x.on('end',()=>{const ct=String(x.headers['content-type']||'').toLowerCase();if(x.statusCode<200||x.statusCode>=300)return reject(new Error('HTTP_'+x.statusCode));const body=t.trim();if(!body)return reject(new Error('EMPTY_RESPONSE'));if(!ct.includes('json')&&!/^[\[{]/.test(body))return reject(new Error('NON_JSON_RESPONSE'));try{resolve(JSON.parse(body))}catch(e){reject(new Error('INVALID_JSON_RESPONSE'))}})});r.on('timeout',()=>r.destroy(new Error('TIMEOUT')));r.on('error',reject);r.end()});
 const quiet=e=>['NON_JSON_RESPONSE','INVALID_JSON_RESPONSE','EMPTY_RESPONSE','TIMEOUT'].includes(e.message);
 const ned=async(path,extra={})=>{const u=new URL('https://api.vworld.kr/ned/data/'+path);u.search=new URLSearchParams({pnu,format:'json',key,domain,numOfRows:'1000',...extra});try{return await getJson(u)}catch(e){(quiet(e)?console.warn:console.error)('VWorld NED',path,e.message);return null}};
 const feature=async(data,filter,geometry=false,size='100')=>{try{const u=new URL('https://api.vworld.kr/req/data');u.search=new URLSearchParams({service:'data',request:'GetFeature',data,key,domain,format:'json',size,page:'1',geometry:String(geometry),attribute:'true',crs:'EPSG:4326',geomFilter:filter});return (await getJson(u))?.response?.result?.featureCollection?.features||[]}catch(e){(quiet(e)?console.warn:console.error)('VWorld feature',data,e.message);return[]}};
 const wfs=async(layer,bbox,max='300')=>{try{const u=new URL('https://api.vworld.kr/req/wfs');u.search=new URLSearchParams({SERVICE:'WFS',VERSION:'1.1.0',REQUEST:'GetFeature',TYPENAME:layer,BBOX:bbox,SRSNAME:'EPSG:4326',OUTPUT:'application/json',MAXFEATURES:max,KEY:key,DOMAIN:domain});const o=await getJson(u);return {ok:true,features:o?.features||o?.featureCollection?.features||[]}}catch(e){(quiet(e)?console.warn:console.error)('VWorld WFS',layer,e.message);return {ok:false,features:[],error:e.message}}};
 const toArray=v=>Array.isArray(v)?v:(v&&typeof v==='object'?[v]:[]);
 const useArr=o=>{for(const v of [o?.landUses?.field,o?.landUses?.landUse,o?.response?.body?.items?.item,o?.response?.body?.items]){const a=toArray(v);if(a.length)return a}return[]};
 const charArr=o=>{for(const v of [o?.landCharacteristics?.field,o?.landCharacteristics?.landCharacteristic,o?.lands?.field,o?.lands?.land,o?.response?.body?.items?.item,o?.response?.body?.items]){const a=toArray(v);if(a.length)return a}return[]};
 const pick=(o,ks)=>{for(const k of ks)if(o&&o[k]!=null&&String(o[k]).trim())return o[k];return null};
 const uniq=a=>[...new Set(a.map(v=>String(v||'').trim()).filter(Boolean))];
 const zoneName=f=>String(pick(f?.properties||{},['uname','UNAME','unm','UNM','dgm_nm','DGM_NM','name','NAME','prposAreaDstrcCodeNm'])||'').trim();
 async function zoningShares(expectedZones){
  if(!Number.isFinite(lon)||!Number.isFinite(lat))return {status:'not-checked',verified:false,items:[]};
  try{
   const parcels=await feature('LP_PA_CBND_BUBUN',`POINT(${lon} ${lat})`,true,'10');
   const parcel=parcels.find(f=>String(pick(f.properties,['pnu','PNU'])||'')===pnu)||parcels[0];
   if(!parcel?.geometry)return {status:'parcel-geometry-not-returned',verified:false,items:[]};
   const parcelFeature=turf.feature(parcel.geometry),parcelArea=turf.area(parcelFeature);
   if(!(parcelArea>0))return {status:'invalid-parcel-geometry',verified:false,items:[]};
   const b=turf.bbox(parcelFeature),bbox=`${b[1]},${b[0]},${b[3]},${b[2]}`;
   const layers=['lt_c_uq111','lt_c_uq112','lt_c_uq113','lt_c_uq114'];
   const results=await Promise.all(layers.map(layer=>wfs(layer,bbox)));
   const zoneFeatures=results.flatMap(r=>r.features),usedLayers=layers.filter((_,i)=>results[i].features.length),failedLayers=layers.filter((_,i)=>!results[i].ok);
   const sums={};
   for(const z of zoneFeatures){const name=zoneName(z);if(!name||!z.geometry)continue;try{const cut=turf.intersect(turf.featureCollection([parcelFeature,turf.feature(z.geometry)]));if(!cut)continue;const a=turf.area(cut);if(a>0.05)sums[name]=(sums[name]||0)+a}catch(e){console.warn('zoning intersect',e.message)}}
   const items=Object.entries(sums).map(([name,area])=>({name,areaSqm:Math.round(area*10)/10,ratioPct:Math.round(area/parcelArea*1000)/10})).sort((a,b)=>b.areaSqm-a.areaSqm);
   const covered=items.reduce((s,x)=>s+x.areaSqm,0),expected=uniq(expectedZones||[]),spatial=uniq(items.map(x=>x.name));
   const missing=expected.filter(n=>!spatial.includes(n)),unexpected=spatial.filter(n=>!expected.includes(n));
   const sourceMismatch=expected.length>1&&(missing.length>0||unexpected.length>0||spatial.length!==expected.length);
   const partial=failedLayers.length>0;
   return {status:sourceMismatch?'source-mismatch':(items.length?(partial?'calculated-partial':'calculated'):(zoneFeatures.length?'geometry-returned-no-intersection':(partial?'upstream-partial-failure':'not-returned'))),verified:!sourceMismatch&&!partial&&items.length>0,method:'official-wfs-parcel-polygon-intersection',axisOrder:'lat-lon',layers:usedLayers,failedLayers,parcelAreaSqm:Math.round(parcelArea*10)/10,coveredAreaSqm:Math.round(covered*10)/10,coveragePct:Math.round(covered/parcelArea*1000)/10,items,validation:{expectedZones:expected,spatialZones:spatial,missingZones:missing,unexpectedZones:unexpected},source:'국토교통부 VWorld WFS 용도지역지구도 × 연속지적도'};
  }catch(e){console.warn('zoning shares',e.message);return {status:'calculation-failed',verified:false,items:[]}}
 }
 try{
  const years=[new Date().getFullYear(),new Date().getFullYear()-1,new Date().getFullYear()-2];
  const [use,...charResponses]=await Promise.all([ned('getLandUseAttr'),...years.map(y=>ned('getLandCharacteristics',{stdrYear:String(y)}))]);
  const uses=useArr(use),chars=charResponses.flatMap(charArr);
  const names=uniq(uses.map(x=>pick(x,['prposAreaDstrcCodeNm','prposAreaDstrcNm','prposAreaDstrc','uname','unm','name'])));
  const zones=names.filter(n=>/(주거|상업|공업|녹지|관리|농림|자연환경보전)지역/.test(n)),districts=names.filter(n=>/지구/.test(n)),areas=names.filter(n=>/구역/.test(n));
  const ch=chars[0]||{},road=pick(ch,['roadSideCodeNm','roadSideNm','roadSide','도로접면']),landUse=pick(ch,['ladUseSittnNm','landUseSitCodeNm','landUseSitNm','landUse','토지이용상황']),height=pick(ch,['tpgrphHgCodeNm','tpgrphHgNm','topographyHeight','고저']),shape=pick(ch,['tpgrphFrmCodeNm','tpgrphFrmNm','topographyShape','형상']),characteristicYear=pick(ch,['stdrYear','stdrYr','기준연도'])||null;
  let roadSpatial={status:'not-checked',label:null,legalAccessConfirmed:false,source:null};
  if(!road&&Number.isFinite(lon)&&Number.isFinite(lat)){const d=0.00012,bbox=`BOX(${lon-d} ${lat-d},${lon+d} ${lat+d})`,roads=await feature('LT_L_MOCTLINK',bbox,false);roadSpatial=roads.length?{status:'nearby-road-found',label:'공간상 도로 인접 가능성 있음',legalAccessConfirmed:false,source:'국토교통부 VWorld 도로 공간정보'}:{status:'not-returned',label:'공간상 도로 인접 확인 필요',legalAccessConfirmed:false,source:'국토교통부 VWorld 도로 공간정보'}}
  const zoneShares=zones.length>1?await zoningShares(zones):{status:'single-zone-not-needed',verified:zones.length===1,items:zones.length?[{name:zones[0],ratioPct:100}]:[]};
  res.setHeader('Cache-Control','public, s-maxage=3600, stale-while-revalidate=86400');
  return res.status(200).json({ok:true,pnu,point:Number.isFinite(lon)&&Number.isFinite(lat)?{lon,lat}:null,zoning:{zones,districts,areas,all:names,shares:zoneShares},characteristics:{roadFrontage:road||null,landUse:landUse||null,terrainHeight:height||null,terrainShape:shape||null,year:characteristicYear},roadSpatial,source:{zoning:'국토교통부 VWorld 토지이용계획 속성조회',characteristics:'국토교통부 VWorld 토지특성정보'},status:{zoning:names.length?'confirmed':'not-returned',characteristics:road||landUse||height||shape?'confirmed':'not-returned',mode:'parcel-pnu'},note:zoneShares.status==='source-mismatch'?'토지이용계획 속성과 WFS 공간도형의 용도지역 결과가 일치하지 않아 편입면적을 확정값으로 사용하지 않습니다. 복수 용도지역은 원천 일치 확인이 필요합니다.':zoneShares.failedLayers?.length?'일부 공간정보 원천이 응답하지 않아 반환된 공식 데이터만 표시합니다. 누락 항목은 추가 확인이 필요합니다.':'복수 용도지역은 VWorld 공식 WFS 용도지역지구도와 연속지적도 필지 도형의 실제 교차면적으로 계산합니다. 공간도형이 반환되지 않으면 비율을 추정하지 않습니다. 최신 고시 반영 시차가 있을 수 있으므로 인허가 확정값이 아닙니다.'});
 }catch(e){console.error('land regulation failed',e);return res.status(502).json({ok:false,error:'LAND_REGULATION_LOOKUP_FAILED',detail:String(e.message||e)})}
};