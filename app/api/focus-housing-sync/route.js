
import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {HOUSING_KINDS,cleanHousingNotice,isoDate} from "../../../lib/df-housing.mjs";
export const dynamic="force-dynamic";
export const maxDuration=60;
const BASE="https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/";
const URL="https://svafsvyjjufbqvxzoqee.supabase.co";
const out=(o,status=200)=>NextResponse.json(o,{status,headers:{"Cache-Control":"no-store"}});
function localDate(offset){
 const now=new Date(Date.now()+9*3600000+offset*86400000);
 return now.toISOString().slice(0,10);
}
async function fromOfficial(operation,key,conditions={},page=1){
 const url=new URL(BASE+operation);
 url.searchParams.set("serviceKey",key);
 url.searchParams.set("page",String(page));
 url.searchParams.set("perPage","100");
 url.searchParams.set("returnType","JSON");
 for(const [k,v] of Object.entries(conditions))url.searchParams.set("cond["+k+"::EQ]",String(v));
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 let r;
 try{r=await fetch(url,{headers:{Accept:"application/json"},cache:"no-store",signal:controller.signal})}
 finally{clearTimeout(timer)}
 if(!r.ok)throw Error("OFFICIAL_HTTP_"+r.status);
 const json=await r.json().catch(()=>{throw Error("OFFICIAL_INVALID_JSON")});
 if(!Array.isArray(json.data))throw Error("OFFICIAL_INVALID_PAYLOAD");
 return json;
}
async function collectNotices(operation,key){
 const conditions={"RCRIT_PBLANC_DE::GTE":null}; // replaced below; no arbitrary client parameters
 delete conditions["RCRIT_PBLANC_DE::GTE"];
 const all=[],start=localDate(-120);
 for(let page=1;page<=8;page++){
  const url=new URL(BASE+operation);
  url.searchParams.set("serviceKey",key);url.searchParams.set("page",String(page));
  url.searchParams.set("perPage","100");url.searchParams.set("returnType","JSON");
  url.searchParams.set("cond[RCRIT_PBLANC_DE::GTE]",start);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
  let r;try{r=await fetch(url,{headers:{Accept:"application/json"},cache:"no-store",signal:controller.signal})}finally{clearTimeout(timer)}
  if(!r.ok)throw Error("OFFICIAL_HTTP_"+r.status);
  const payload=await r.json().catch(()=>{throw Error("OFFICIAL_INVALID_JSON")});
  if(!Array.isArray(payload.data))throw Error("OFFICIAL_INVALID_PAYLOAD");
  all.push(...payload.data);
  if(page*100>=Number(payload.matchCount||payload.totalCount||all.length)||payload.data.length<100)break;
  if(page===8)throw Error("OFFICIAL_PAGINATION_LIMIT");
 }
 return all;
}
async function processKind(kind,key){
 const [detailEndpoint,modelEndpoint]=HOUSING_KINDS[kind];
 const source=await collectNotices(detailEndpoint,key);
 const unique=[...new Map(source.map(r=>[String(r.HOUSE_MANAGE_NO)+":"+String(r.PBLANC_NO),r])).values()];
 const recent=unique.sort((a,b)=>String(b.RCRIT_PBLANC_DE||"").localeCompare(String(a.RCRIT_PBLANC_DE||""))).slice(0,220);
 const result=new Array(recent.length);
 let next=0;
 await Promise.all(Array.from({length:4},async()=>{
  while(next<recent.length){
   const i=next++,raw=recent[i];
   let models=[],modelsOk=false;
   try{
    const response=await fromOfficial(modelEndpoint,key,{HOUSE_MANAGE_NO:raw.HOUSE_MANAGE_NO,PBLANC_NO:raw.PBLANC_NO});
    models=response.data;modelsOk=true;
   }catch(e){console.warn("HOUSING_MODELS_UNAVAILABLE",kind,String(raw.HOUSE_MANAGE_NO),e.message)}
   const normalized=cleanHousingNotice(raw,kind,models);
   if(normalized){
    // Failed price retrieval must not overwrite previously verified prices/models.
    if(!modelsOk){delete normalized.models_json;delete normalized.top_price_manwon;}
    result[i]=normalized;
   }
  }
 }));
 return result.filter(Boolean);
}
export async function GET(req){
 const auth=req.headers.get("authorization")||"";
 if(!process.env.CRON_SECRET||auth!=="Bearer "+process.env.CRON_SECRET)return out({ok:false,error:"UNAUTHORIZED"},401);
 const rawKey=process.env.DATA_GO_KR_API_KEY||process.env.PUBLIC_DATA_API_KEY||"";
 const dbKey=process.env.SUPABASE_SERVICE_ROLE_KEY||"";
 if(!rawKey||!dbKey)return out({ok:false,error:"CONFIGURATION_REQUIRED",missing:[...(!rawKey?["DATA_GO_KR_API_KEY"]:[]),...(!dbKey?["SUPABASE_SERVICE_ROLE_KEY"]:[])]},503);
 let key=rawKey;
 try{key=decodeURIComponent(rawKey)}catch{}
 try{
  const db=createClient(URL,dbKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const counts={};
  for(const kind of Object.keys(HOUSING_KINDS)){
   const records=await processKind(kind,key);
   for(let i=0;i<records.length;i+=100){
    const {error}=await db.from("df_housing_offers").upsert(records.slice(i,i+100),{onConflict:"offer_key"});
    if(error)throw Error("DATABASE_UPSERT_FAILED_"+(error.code||"UNKNOWN"));
   }
   counts[kind]=records.length;
  }
  return out({ok:true,counts,syncedAt:new Date().toISOString()});
 }catch(error){console.error("HOUSING_SYNC_FAILED",error.message);return out({ok:false,error:"HOUSING_SYNC_FAILED",reason:error.message},502)}
}
