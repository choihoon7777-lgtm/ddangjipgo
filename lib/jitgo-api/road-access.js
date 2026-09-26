const https=require('https');
const turf=require('@turf/turf');
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 if(req.method!=='GET')return res.status(405).json({ok:false,error:'METHOD_NOT_ALLOWED'});
 const key=process.env.VWORLD_API_KEY,pnu=String(req.query.pnu||'').replace(/\D/g,''),lon=Number(req.query.lon),lat=Number(req.query.lat);
 if(pnu.length!==19||!Number.isFinite(lon)||!Number.isFinite(lat))return res.status(400).json({ok:false,error:'PNU_POINT_REQUIRED'});
 if(!key)return res.status(500).json({ok:false,error:'VWORLD_API_KEY_NOT_CONFIGURED'});
 const domain=`${req.headers['x-forwarded-proto']||'https'}://${req.headers['x-forwarded-host']||req.headers.host||'localhost'}`;
 const getJson=url=>new Promise((resolve,reject)=>{const u=new URL(url),r=https.request({protocol:u.protocol,hostname:u.hostname,path:u.pathname+u.search,headers:{'User-Agent':'JITGO/1.0','Accept':'application/json','Referer':domain+'/'},timeout:8000},x=>{let t='';x.setEncoding('utf8');x.on('data',d=>t+=d);x.on('end',()=>{if(x.statusCode<200||x.statusCode>=300)return reject(new Error('HTTP_'+x.statusCode));try{resolve(JSON.parse(t))}catch(e){reject(new Error('JSON_PARSE'))}})});r.on('timeout',()=>r.destroy(new Error('TIMEOUT')));r.on('error',reject);r.end()});
 const dataFeature=async(filter,size='10')=>{const u=new URL('https://api.vworld.kr/req/data');u.search=new URLSearchParams({service:'data',request:'GetFeature',data:'LP_PA_CBND_BUBUN',key,domain,format:'json',size,page:'1',geometry:'true',attribute:'true',crs:'EPSG:4326',geomFilter:filter});const j=await getJson(u);return j?.response?.result?.featureCollection?.features||[]};
 const wfsNearby=async(bb)=>{const u=new URL('https://api.vworld.kr/req/wfs');u.search=new URLSearchParams({SERVICE:'WFS',REQUEST:'GetFeature',VERSION:'1.1.0',TYPENAME:'lp_pa_cbnd_bubun',BBOX:`${bb[0]},${bb[1]},${bb[2]},${bb[3]}`,OUTPUT:'application/json',SRSNAME:'EPSG:4326',MAXFEATURES:'500',key,domain});const j=await getJson(u);return {features:j?.features||j?.featureCollection?.features||[],total:j?.totalFeatures??j?.numberOfFeatures??null,responseType:j?.type||null}};
 const pick=(o,ks)=>{for(const k of ks)if(o&&o[k]!=null&&String(o[k]).trim())return o[k];return null};
 const jibun=f=>String(pick(f?.properties||{},['jibun','JIBUN'])||'').trim();
 const fpnu=f=>String(pick(f?.properties||{},['pnu','PNU'])||'');
 const isRoadParcel=f=>/도\s*$/.test(jibun(f));
 const direction=(parcel,road)=>{const a=turf.centroid(parcel).geometry.coordinates,b=turf.centroid(road).geometry.coordinates,dx=b[0]-a[0],dy=b[1]-a[1],ang=(Math.atan2(dx,dy)*180/Math.PI+360)%360,n=['북측','북동측','동측','남동측','남측','남서측','서측','북서측'];return n[Math.round(ang/45)%8]};
 const lineParts=f=>{const g=f?.geometry||f,out=[];if(!g)return out;const add=r=>{if(Array.isArray(r)&&r.length>1)out.push(turf.lineString(r))};if(g.type==='Polygon')for(const r of g.coordinates||[])add(r);else if(g.type==='MultiPolygon')for(const p of g.coordinates||[])for(const r of p||[])add(r);else if(g.type==='LineString')add(g.coordinates);else if(g.type==='MultiLineString')for(const r of g.coordinates||[])add(r);return out};
 const boundaryVertices=f=>{const pts=[];for(const l of lineParts(f))for(const c of l.geometry.coordinates)pts.push(turf.point(c));return pts};
 const boundaryDistanceM=(a,b)=>{const al=lineParts(a),bl=lineParts(b),ap=boundaryVertices(a),bp=boundaryVertices(b);if(!al.length||!bl.length)return {distance:null,aLines:al.length,bLines:bl.length,aVertices:ap.length,bVertices:bp.length,intersects:false};let intersects=false,min=Infinity;for(const x of al){for(const y of bl){try{if(turf.lineIntersect(x,y).features.length){intersects=true;min=0;break}}catch(e){}}if(intersects)break}if(!intersects){for(const p of ap)for(const l of bl){const d=turf.pointToLineDistance(p,l,{units:'meters',method:'planar'});if(Number.isFinite(d)&&d<min)min=d}for(const p of bp)for(const l of al){const d=turf.pointToLineDistance(p,l,{units:'meters',method:'planar'});if(Number.isFinite(d)&&d<min)min=d}}return {distance:Number.isFinite(min)?min:null,aLines:al.length,bLines:bl.length,aVertices:ap.length,bVertices:bp.length,intersects}};
 const overlapLengthM=(a,b)=>{let m=0;for(const x of lineParts(a))for(const y of lineParts(b)){try{const ov=turf.lineOverlap(x,y,{tolerance:0});m+=ov.features.reduce((s,z)=>s+turf.length(z,{units:'meters'}),0)}catch(e){}}return m};
 try{
  const targetRows=await dataFeature(`POINT(${lon} ${lat})`,'10'),rawTarget=targetRows.find(f=>fpnu(f)===pnu)||targetRows[0];
  if(!rawTarget?.geometry)return res.status(404).json({ok:false,error:'PARCEL_GEOMETRY_NOT_FOUND'});
  const target=turf.feature(rawTarget.geometry),bb=turf.bbox(target),pad=0.00035,queryBb=[bb[0]-pad,bb[1]-pad,bb[2]+pad,bb[3]+pad];
  let nearby=[],wfsMeta={total:null,responseType:null},nearbyError=null;
  try{const w=await wfsNearby(queryBb);nearby=w.features;wfsMeta={total:w.total,responseType:w.responseType}}catch(e){nearbyError=String(e.message||e)}
  const roads=nearby.filter(f=>fpnu(f)!==pnu&&isRoadParcel(f)&&f.geometry),contacts=[];
  for(const r of roads){const rf=turf.feature(r.geometry),overlapM=overlapLengthM(target,rf),diag=boundaryDistanceM(target,rf),minM=diag.distance;
   contacts.push({pnu:fpnu(r),jibun:jibun(r),direction:direction(target,rf),sharedBoundaryM:Math.round(overlapM*1000)/1000,minimumBoundaryDistanceM:minM==null?null:Math.round(minM*1000)/1000,boundaryIntersects:diag.intersects,boundaryParts:{targetLines:diag.aLines,roadLines:diag.bLines,targetVertices:diag.aVertices,roadVertices:diag.bVertices},exactBoundaryShare:overlapM>=0.05,proximityClass:minM==null?'unknown':overlapM>=0.05?'exact-boundary-share':diag.intersects?'point-touch':minM<=0.5?'sub-meter-near':'separated'});
  }
  contacts.sort((a,b)=>(a.minimumBoundaryDistanceM??1e9)-(b.minimumBoundaryDistanceM??1e9));
  const exact=contacts.filter(x=>x.exactBoundaryShare),nearest=contacts[0]||null;
  res.setHeader('Cache-Control','public, s-maxage=300, stale-while-revalidate=3600');
  return res.status(200).json({ok:true,mode:'poc-cadastral-road-parcel',pnu,parcel:{jibun:jibun(rawTarget),geometry:rawTarget.geometry,areaSqm:Math.round(turf.area(target)*10)/10},nearby:{source:'VWorld WFS lp_pa_cbnd_bubun',bboxOrder:'lon-lat',parcelCount:nearby.length,roadParcelCount:roads.length,bbox:queryBb,wfsTotal:wfsMeta.total,wfsResponseType:wfsMeta.responseType,error:nearbyError},cadastralAccess:{status:exact.length?'boundary-shared':'not-confirmed',exactRoadCount:exact.length,contacts,nearestRoadParcel:nearest},legalRoad:{status:'needs-authority-check',confirmed:false},geometryPolicy:{overlapToleranceKm:0,minimumSharedBoundaryM:0.05,metricDistanceUnits:'meters',distanceMethod:'planar',boundaryIterator:'raw GeoJSON rings',segmentIntersectionCheck:true,proximityOnly:true,note:'정확 경계공유는 tolerance 0의 공통선 길이만 인정합니다. Polygon/MultiPolygon 원시 ring을 직접 순회하고 교차와 최소거리를 별도 진단하며 point-touch/근접만으로 접도를 확정하지 않습니다.'},source:{parcelAndRoadParcels:'국토교통부 VWorld 연속지적도 LP_PA_CBND_BUBUN'},note:'지목 도(도로) 인접필지와 지적경계 공유 및 최소 경계거리를 계산한 PoC입니다. 건축법상 도로 인정 또는 건축 가능 여부를 확정하지 않습니다.'});
 }catch(e){console.error('road access',e);return res.status(502).json({ok:false,error:'ROAD_ACCESS_LOOKUP_FAILED',detail:String(e.message||e)})}
};
