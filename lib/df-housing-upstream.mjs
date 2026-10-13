
import {HOUSING_KINDS,cleanHousingNotice} from "./df-housing.mjs";
const ROOT="https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/";
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export function housingKey(env=process.env){
 return env.DATA_GO_KR_API_KEY||env.DATA_GO_KR_SERVICE_KEY||env.PUBLIC_DATA_API_KEY||"";
}
export class HousingProviderError extends Error {
 constructor(code){super(code);this.name="HousingProviderError";this.code=code;}
}
export function normalizeServiceKey(input){
 const key=String(input||"").trim();
 if(!key)throw new HousingProviderError("API_KEY_MISSING");
 try{return decodeURIComponent(key)}catch{return key}
}
export async function fetchHousingPage(endpoint,key,{filters=[],page=1,perPage=100,fetcher=fetch,retries=1}={}){
 if(!Object.values(HOUSING_KINDS).some(x=>x[0]===endpoint||x[1]===endpoint))throw new HousingProviderError("ENDPOINT_NOT_ALLOWED");
 if(page<1||perPage<1||perPage>100)throw new HousingProviderError("INVALID_PAGE");
 const url=new URL(ROOT+endpoint);
 url.searchParams.set("serviceKey",normalizeServiceKey(key));
 url.searchParams.set("page",String(page));
 url.searchParams.set("perPage",String(perPage));
 url.searchParams.set("returnType","JSON");
 for(const [field,op,value] of filters){
  if(!["HOUSE_MANAGE_NO","PBLANC_NO","RCRIT_PBLANC_DE"].includes(field)||!["EQ","GTE","LTE"].includes(op))throw new HousingProviderError("FILTER_NOT_ALLOWED");
  url.searchParams.set("cond["+field+"::"+op+"]",String(value));
 }
 for(let attempt=0;attempt<=retries;attempt++){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
   const response=await fetcher(url.toString(),{headers:{Accept:"application/json"},signal:controller.signal,cache:"no-store"});
   if(!response.ok){
    if((response.status===429||response.status>=500)&&attempt<retries){await wait(400*(attempt+1));continue}
    throw new HousingProviderError(response.status===401||response.status===403?"API_AUTH_FAILED":response.status===429?"API_RATE_LIMIT":"API_HTTP_"+response.status);
   }
   const json=await response.json().catch(()=>{throw new HousingProviderError("API_INVALID_JSON")});
   if(!Array.isArray(json?.data)){
    const errorString=String(json?.message||json?.msg||json?.error||"");
    if(/SERVICE_KEY|PERMISSION_DENIED|ACCESS_DENIED|인증키|권한/i.test(errorString))throw new HousingProviderError("API_AUTH_FAILED");
    throw new HousingProviderError("API_INVALID_RESPONSE");
   }
   return {data:json.data,matchCount:Number(json.matchCount??json.totalCount??0)||null};
  }catch(e){
   if(e?.name==="AbortError")throw new HousingProviderError("API_TIMEOUT");
   if(e instanceof HousingProviderError)throw e;
   if(attempt===retries)throw new HousingProviderError("API_NETWORK_ERROR");
   await wait(400);
  }finally{clearTimeout(timer)}
 }
 throw new HousingProviderError("API_UNAVAILABLE");
}
export async function fetchHousingNotices(kind,key,{fromDate,pageLimit=6,fetcher=fetch}={}){
 const endpoint=HOUSING_KINDS[kind]?.[0];
 if(!endpoint)throw new HousingProviderError("UNKNOWN_KIND");
 if(!/^\d{4}-\d{2}-\d{2}$/.test(fromDate||""))throw new HousingProviderError("INVALID_DATE");
 const all=[],perPage=100;
 for(let page=1;page<=pageLimit;page++){
  const response=await fetchHousingPage(endpoint,key,{filters:[["RCRIT_PBLANC_DE","GTE",fromDate]],page,perPage,fetcher});
  all.push(...response.data);
  if(response.data.length<perPage||response.matchCount!==null&&all.length>=response.matchCount){
   return {rows:[...new Map(all.map(r=>[String(r.HOUSE_MANAGE_NO)+":"+String(r.PBLANC_NO),r])).values()],partial:false};
  }
 }
 return {rows:[...new Map(all.map(r=>[String(r.HOUSE_MANAGE_NO)+":"+String(r.PBLANC_NO),r])).values()],partial:true};
}
export async function fetchHousingModels(kind,key,raw,{fetcher=fetch}={}){
 const endpoint=HOUSING_KINDS[kind]?.[1];
 if(!endpoint)throw new HousingProviderError("UNKNOWN_KIND");
 const f=[["HOUSE_MANAGE_NO","EQ",raw.HOUSE_MANAGE_NO],["PBLANC_NO","EQ",raw.PBLANC_NO]];
 const rows=[],perPage=100;
 for(let page=1;page<=4;page++){
  const result=await fetchHousingPage(endpoint,key,{filters:f,page,perPage,fetcher});
  rows.push(...result.data);
  if(result.data.length<perPage||result.matchCount!==null&&rows.length>=result.matchCount)return rows;
 }
 throw new HousingProviderError("MODEL_PAGINATION_LIMIT");
}
export function koreaToday(daysOffset=0,now=new Date()){
 return new Date(now.getTime()+9*3600000+daysOffset*86400000).toISOString().slice(0,10);
}
export async function buildHousingRows(kind,key,{fromDate=koreaToday(-120),fetcher=fetch,concurrency=6}={}){
 const notices=await fetchHousingNotices(kind,key,{fromDate,fetcher});
 const raws=notices.rows.filter(r=>cleanHousingNotice(r,kind,[]));
 const results=new Array(raws.length);
 const warnings=[];
 let next=0;
 await Promise.all(Array.from({length:Math.min(concurrency,raws.length)},async()=>{
  while(next<raws.length){
   const idx=next++,raw=raws[idx];
   let models=null;
   try{models=await fetchHousingModels(kind,key,raw,{fetcher})}
   catch(e){warnings.push({offerKey:kind+":"+raw.HOUSE_MANAGE_NO+":"+raw.PBLANC_NO,code:e.code||"MODEL_FAILED"})}
   const result=cleanHousingNotice(raw,kind,models||[]);
   if(result){
    if(models===null){delete result.models_json;delete result.top_price_manwon}
    results[idx]=result;
   }
  }
 }));
 return {rows:results.filter(Boolean),warnings,partial:notices.partial};
}
