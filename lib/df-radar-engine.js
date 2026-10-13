// Conservative parcel radar: every alert requires two valid official snapshots.
// Differences are observations, not legal confirmation of plan changes.
const fieldMap={zones:"용도지역",districts:"용도지구",areas:"용도구역"};
const clean=x=>String(x??"").trim().replace(/\s+/g," ");
const unique=x=>[...new Set((Array.isArray(x)?x:[]).map(clean).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ko"));
export function validParcelPoint(p){
 const lat=Number(p?.lat??p?.latitude),lon=Number(p?.lon??p?.longitude);
 return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=33&&lat<=39.5&&lon>=124&&lon<=132?{lat,lon}:null;
}
export function officialSnapshot(data,pnu){
 if(!data?.ok||String(data.pnu)!==String(pnu)||!/^[0-9]{19}$/.test(String(pnu)))return null;
 const z=data.zoning||{};
 if(!Array.isArray(z.zones)||!z.zones.length||!Array.isArray(z.districts)||!Array.isArray(z.areas))return null;
 return {version:1,pnu:String(pnu),source:String(data.source?.zoning||"VWorld 토지이용계획"),checkedAt:new Date().toISOString(),
  zones:unique(z.zones),districts:unique(z.districts),areas:unique(z.areas)};
}
export function compareSnapshots(previous,current){
 if(!previous||!current||previous.pnu!==current.pnu)return {status:"unavailable",changes:[]};
 const changes=[];
 for(const [field,label] of Object.entries(fieldMap)){
  const before=unique(previous[field]),after=unique(current[field]);
  for(const x of after.filter(v=>!before.includes(v)))changes.push({field,label,kind:"added",value:x});
  for(const x of before.filter(v=>!after.includes(v)))changes.push({field,label,kind:"removed",value:x});
 }
 return {status:changes.length?"changed":"unchanged",changes,previousAt:previous.checkedAt,currentAt:current.checkedAt};
}
export function distanceMeters(a,b){
 const x=validParcelPoint(a),y=validParcelPoint(b);
 if(!x||!y)return null;
 const rad=t=>t*Math.PI/180,R=6371008.8,dlat=rad(y.lat-x.lat),dlon=rad(y.lon-x.lon);
 const h=Math.sin(dlat/2)**2+Math.cos(rad(x.lat))*Math.cos(rad(y.lat))*Math.sin(dlon/2)**2;
 return Math.round(2*R*Math.asin(Math.sqrt(Math.min(1,h))));
}
export function spatialEvidence(parcel,record){
 const distance=(record?.verificationStatus==="verified"&&record?.locationSource&&record?.sourceUrl)?distanceMeters(parcel,record?.point):null;
 if(distance===null)return {status:"unverified",distanceMeters:null};
 const radius=Math.min(Math.max(Number(parcel?.radius_m)||1000,100),5000);
 return {status:distance<=radius?"within-radius":"outside-radius",distanceMeters:distance,radiusMeters:radius};
}
