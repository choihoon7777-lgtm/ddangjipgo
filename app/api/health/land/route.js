// Explicit live probe of the read-only JITGO fallback. It does not claim to test local keys.
export const runtime="nodejs";
export const maxDuration=30;
const ORIGIN="https://jitgo-v12-review.vercel.app";
const SAMPLE_PNU="3020011100106290001";
const SAMPLE_ADDRESS="대전광역시 유성구 봉명동 629-1";
const TTL=300000;
let cached=null,inflight=null;
async function probe(route){
 try{
  const ctl=AbortSignal.timeout(12000);
  const r=await fetch(ORIGIN+route,{cache:"no-store",redirect:"error",signal:ctl,headers:{Accept:"application/json"}});
  const d=await r.json();
  return {reachable:r.ok&&d?.ok===true,status:r.status,source:"jitgo-readonly",error:r.ok?null:String(d?.error||"UPSTREAM_REJECTED"),rulesetStale:d?.ruleset?.stale===true,decision:d?.decision?.status||null,transactionCount:Array.isArray(d?.transactions)?d.transactions.length:null};
 }catch{return{reachable:false,status:null,source:"jitgo-readonly",error:"UPSTREAM_UNAVAILABLE"}}
}
async function check(){
 const addr=encodeURIComponent(SAMPLE_ADDRESS);
 const [land,trade,envelope]=await Promise.all([
  probe("/api/land?address="+addr),
  probe("/api/land-transactions?pnu="+SAMPLE_PNU+"&months=1"),
  probe("/api/building-envelope?address="+addr)
 ]);
 return {ok:land.reachable&&trade.reachable&&envelope.reachable,checkedAt:new Date().toISOString(),probe:"public sample parcel",tests:{land,transactions:trade,buildingEnvelope:envelope},notice:"API reachable means only that official-data responses were returned, not that building permissions or parcel impact are confirmed."};
}
export async function GET(){
 try{
  if(!cached||Date.now()-cached.at>TTL){
   if(!inflight)inflight=check().then(data=>{cached={at:Date.now(),data};return data}).finally(()=>{inflight=null});
   const data=await inflight;
   return Response.json(data,{headers:{"Cache-Control":"public, s-maxage=300"}});
  }
  return Response.json({...cached.data,cached:true},{headers:{"Cache-Control":"public, s-maxage=300"}});
 }catch{return Response.json({ok:false,error:"LIVE_PROBE_FAILED"},{status:503})}
}
