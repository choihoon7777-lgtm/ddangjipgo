// Development Focus -> JITGO official-data read-only gateway.
// No secret copied to this repository. Production database remains untouched.
const ORIGIN='https://jitgo-v12-review.vercel.app';
const ROUTES=Object.freeze({
  land:['address'],
  'land-transactions':['pnu','months'],
  'building-envelope':['address'],
  'land-regulation':['pnu','lon','lat'],
  'road-access':['pnu','lon','lat']
});
const WINDOW_MS=60000,MAX_REQUESTS=90;
const perClient=globalThis.__dfLandReadOnlyLimits||(globalThis.__dfLandReadOnlyLimits=new Map());
const err=(error,status)=>Response.json({ok:false,error},{status,headers:{'Cache-Control':'no-store'}});
function validateQuery(url,name){
  const fields=ROUTES[name];if(!fields)return {error:'GATEWAY_ROUTE_NOT_ALLOWED'};
  const upstream=new URL('/api/'+name,ORIGIN);
  for(const key of fields){
    const v=url.searchParams.get(key);
    if(v!==null){if(v.length>200)return {error:'INVALID_QUERY_LENGTH'};upstream.searchParams.set(key,v);}
  }
  if(['land','building-envelope'].includes(name)){
    const address=upstream.searchParams.get('address')||'';
    if(address.trim().length<5)return {error:'ADDRESS_REQUIRED'};
  }else{
    const pnu=upstream.searchParams.get('pnu')||'';
    if(!/^\d{19}$/.test(pnu))return {error:'PNU_REQUIRED'};
  }
  if(name==='land-transactions'){
    const months=upstream.searchParams.get('months');
    if(months!==null&&(!/^\d{1,2}$/.test(months)||Number(months)<1||Number(months)>36))return {error:'MONTHS_INVALID'};
  }
  if(['road-access','land-regulation'].includes(name)){
    for(const [key,bound] of [['lon',180],['lat',90]]){
      const value=upstream.searchParams.get(key);
      if(value===null||!value.trim()||!Number.isFinite(Number(value))||Math.abs(Number(value))>bound)return {error:'COORDINATES_REQUIRED'};
    }
  }
  return {upstream};
}
function permitRequest(request){
  const forwarded=request.headers.get('x-forwarded-for');
  const ip=(forwarded?.split(',')[0]||request.headers.get('x-real-ip')||'unknown').trim().slice(0,100);
  const now=Date.now();
  if(perClient.size>1500)for(const [k,v] of perClient)if(now-v.first>WINDOW_MS)perClient.delete(k);
  const record=perClient.get(ip);
  if(!record||now-record.first>WINDOW_MS){perClient.set(ip,{first:now,count:1});return true}
  if(record.count>=MAX_REQUESTS)return false;
  record.count++;return true;
}
export async function readJitgoLand(request,name){
  if(request.method!=='GET')return err('METHOD_NOT_ALLOWED',405);
  const parsed=validateQuery(new URL(request.url),name);
  if(parsed.error)return err(parsed.error,parsed.error==='GATEWAY_ROUTE_NOT_ALLOWED'?404:400);
  if(!permitRequest(request))return err('OFFICIAL_DATA_RATE_LIMITED',429);
  try{
    const response=await fetch(parsed.upstream.href,{
      method:'GET',headers:{Accept:'application/json'},cache:'no-store',redirect:'error',
      signal:AbortSignal.timeout(16000)
    });
    const type=response.headers.get('content-type')||'';
    if(!type.toLowerCase().includes('json'))throw new Error('INVALID_SOURCE_CONTENT_TYPE');
    const advertised=Number(response.headers.get('content-length')||0);
    if(advertised>3200000)throw new Error('SOURCE_RESPONSE_TOO_LARGE');
    const body=await response.text();
    if(body.length>3200000)throw new Error('SOURCE_RESPONSE_TOO_LARGE');
    JSON.parse(body);
    return new Response(body,{status:response.status,headers:{
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':response.ok?'public, s-maxage=120, stale-while-revalidate=300':'no-store',
      'X-Official-Data-Engine':'JITGO',
      'X-Official-Data-Mode':'read-only-upstream'
    }});
  }catch(e){
    console.warn('development-focus upstream error',{route:name,kind:e?.name||'unknown'});
    return err(e?.name==='TimeoutError'?'OFFICIAL_DATA_TIMEOUT':'OFFICIAL_DATA_UPSTREAM_UNAVAILABLE',502);
  }
}
export async function landWithFailover(request,name,handler,secretName,adapt){
  if(!process.env[secretName])return readJitgoLand(request,name);
  try{
    const local=await adapt(handler,request);
    if(local.status<500){local.headers.set('X-Official-Data-Engine','LOCAL');return local}
    const fallback=await readJitgoLand(request,name);
    if(fallback.ok)return fallback;
    local.headers.set('X-Official-Data-Engine','LOCAL');
    return local;
  }catch(e){
    console.warn('development-focus official local engine failed',{route:name,kind:e?.name||'unknown'});
    return readJitgoLand(request,name);
  }
}
