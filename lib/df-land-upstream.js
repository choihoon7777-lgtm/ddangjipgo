// Development Focus read-only gateway to the existing JITGO official land APIs.
// No API credential is stored in this repository or returned to the browser.
const ORIGIN='https://jitgo-v12-review.vercel.app';
const ROUTES={
  land:['address'],
  'land-transactions':['pnu','months'],
  'building-envelope':['address'],
  'land-regulation':['pnu','lon','lat'],
  'road-access':['pnu','lon','lat']
};
export async function readJitgoLand(request,name){
  if(request.method!=='GET')return Response.json({ok:false,error:'METHOD_NOT_ALLOWED'},{status:405});
  const allow=ROUTES[name];
  if(!allow)return Response.json({ok:false,error:'GATEWAY_ROUTE_NOT_ALLOWED'},{status:404});
  const input=new URL(request.url);
  const upstream=new URL('/api/'+name,ORIGIN);
  for(const key of allow){
    const value=input.searchParams.get(key);
    if(value!==null){
      if(value.length>250)return Response.json({ok:false,error:'INVALID_QUERY_LENGTH'},{status:400});
      upstream.searchParams.set(key,value);
    }
  }
  try{
    const response=await fetch(upstream.href,{method:'GET',headers:{Accept:'application/json'},cache:'no-store',redirect:'error',signal:AbortSignal.timeout(18000)});
    const type=response.headers.get('content-type')||'';
    if(!type.toLowerCase().includes('application/json'))throw new Error('BAD_UPSTREAM_CONTENT_TYPE');
    const body=await response.text();
    if(body.length>3200000)throw new Error('UPSTREAM_BODY_LIMIT');
    JSON.parse(body);
    return new Response(body,{status:response.status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':response.ok?'public, s-maxage=120, stale-while-revalidate=300':'no-store','X-Official-Data-Engine':'JITGO', 'X-Official-Data-Mode':'read-only-upstream'}});
  }catch(err){
    console.warn('development-focus land upstream unavailable',name,err?.name||'error');
    return Response.json({ok:false,error:err?.name==='TimeoutError'?'OFFICIAL_DATA_TIMEOUT':'OFFICIAL_DATA_UPSTREAM_UNAVAILABLE',source:'JITGO official data engine'},{status:502,headers:{'Cache-Control':'no-store'}});
  }
}
