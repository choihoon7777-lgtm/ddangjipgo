
import {HOUSING_KINDS,cleanHousingNotice} from "./df-housing.mjs";
const BASE="https://api.odcloud.kr/api/ApplyhomeInfoDetailSvc/v1/";
function koreaOffsetDate(days){
 return new Date(Date.now()+9*3600000+days*86400000).toISOString().slice(0,10);
}
async function callOfficial(name,key,filters={},page=1){
 const u=new URL(BASE+name);
 let token=key;try{token=decodeURIComponent(key)}catch{}
 u.searchParams.set("serviceKey",token);
 u.searchParams.set("page",String(page));
 u.searchParams.set("perPage","100");
 u.searchParams.set("returnType","JSON");
 for(const [field,op,value] of filters)u.searchParams.set("cond["+field+"::"+op+"]",String(value));
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),16000);
 try{
  const response=await fetch(u,{next:{revalidate:1800},signal:c.signal});
  if(!response.ok)throw Error("UPSTREAM_"+response.status);
  const json=await response.json().catch(()=>{throw Error("OFFICIAL_RESPONSE_NOT_JSON")});
  if(!Array.isArray(json.data))throw Error("OFFICIAL_RESPONSE_INVALID");
  return json;
 }finally{clearTimeout(timer)}
}
async function kindList(kind,key){
 const [detail,model]=HOUSING_KINDS[kind];
 const cutoff=koreaOffsetDate(-90);
 const rows=(await callOfficial(detail,key,[["RCRIT_PBLANC_DE","GTE",cutoff]])).data;
 const unique=[...new Map(rows.map(r=>[String(r.HOUSE_MANAGE_NO)+":"+String(r.PBLANC_NO),r])).values()];
 unique.sort((a,b)=>String(b.RCRIT_PBLANC_DE||"").localeCompare(String(a.RCRIT_PBLANC_DE||"")));
 const result=unique.map(r=>cleanHousingNotice(r,kind,[])).filter(Boolean);
 // Recent notices receive model/price enrichment. Older notices remain linked to source.
 const size=kind==="APT"?30:kind==="REMAIN"?20:10;
 let next=0;
 await Promise.all(Array.from({length:3},async()=>{
  while(next<Math.min(unique.length,size)){
   const idx=next++,r=unique[idx];
   try{
    const response=await callOfficial(model,key,[["HOUSE_MANAGE_NO","EQ",r.HOUSE_MANAGE_NO],["PBLANC_NO","EQ",r.PBLANC_NO]]);
    const updated=cleanHousingNotice(r,kind,response.data);
    const existing=result.findIndex(x=>x.offer_key===updated?.offer_key);
    if(existing>=0)result[existing]=updated;
   }catch(e){console.warn("HOUSING_LIVE_PRICE_PARTIAL",kind,String(r.HOUSE_MANAGE_NO),e.message)}
  }
 }));
 return result;
}
export async function readLiveOffers(key){
 const settled=await Promise.allSettled(Object.keys(HOUSING_KINDS).map(kind=>kindList(kind,key)));
 const ok=settled.filter(x=>x.status==="fulfilled");
 if(!ok.length)throw Error("OFFICIAL_ACCESS_REQUIRED");
 const items=ok.flatMap(x=>x.value).sort((a,b)=>String(b.published_date||"").localeCompare(String(a.published_date||"")));
 return items.map(({source_json,...record})=>record);
}
export async function readLiveOfferById(key,id){
 const [kind,houseManage,pblanc]=id.split(":");
 if(!HOUSING_KINDS[kind])return null;
 const [details,models]=HOUSING_KINDS[kind];
 const filters=[["HOUSE_MANAGE_NO","EQ",houseManage],["PBLANC_NO","EQ",pblanc]];
 const detail=await callOfficial(details,key,filters);
 const raw=detail.data.find(r=>String(r.HOUSE_MANAGE_NO)===houseManage&&String(r.PBLANC_NO)===pblanc);
 if(!raw)return null;
 let rows=[];try{rows=(await callOfficial(models,key,filters)).data}catch{}
 const record=cleanHousingNotice(raw,kind,rows);
 if(!record)return null;
 const {source_json,...safe}=record;
 return safe;
}
