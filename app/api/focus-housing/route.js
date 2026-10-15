
import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {housingKey,fetchHousingPage,koreaToday} from "../../../lib/df-housing-upstream.mjs";
import {HOUSING_KINDS,cleanHousingNotice} from "../../../lib/df-housing.mjs";
export const dynamic="force-dynamic";
export const revalidate=0;
const url="https://svafsvyjjufbqvxzoqee.supabase.co";
const key="sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud";
const reply=(payload,status=200)=>NextResponse.json(payload,{status,headers:{"Cache-Control":"public, s-maxage=120, stale-while-revalidate=300"}});
let liveCache={at:0,items:null,lastError:null};
async function liveOfficialHousing(){
 if(liveCache.items&&Date.now()-liveCache.at<3*60*1000)return liveCache.items;
 const key=housingKey();if(!key)return null;
 const recent=koreaToday(-90);
 const outcomes=await Promise.allSettled(Object.entries(HOUSING_KINDS).map(async([kind,endpoints])=>{
  const r=await fetchHousingPage(endpoints[0],key,{filters:[["RCRIT_PBLANC_DE","GTE",recent]],page:1,perPage:100,retries:0});
  return r.data.map(raw=>cleanHousingNotice(raw,kind,[])).filter(Boolean).map(({source_json,models_json,...safe})=>({...safe,models_json:[]}));
 }));
 const successful=outcomes.filter(x=>x.status==="fulfilled");
 if(!successful.length){liveCache.lastError=outcomes.filter(x=>x.status==="rejected").map(x=>String(x.reason?.code||x.reason?.message||"OFFICIAL_API_UNAVAILABLE")).slice(0,3).join(",")||"OFFICIAL_API_UNAVAILABLE";return null;}
 const dedup=new Map();for(const group of successful)for(const row of group.value)dedup.set(row.offer_key,row);
 const items=[...dedup.values()].sort((a,b)=>String(b.published_date||"").localeCompare(String(a.published_date||""))).slice(0,120);
 liveCache={at:Date.now(),items,lastError:null};return items;
}

export async function GET(request){
 const args=new URL(request.url).searchParams,id=args.get("id")||"";
 if(id&&(!/^(APT|REMAIN|OPTIONAL):\d+:\d+$/.test(id)||id.length>90))return reply({ok:false,error:"INVALID_ID"},400);
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const fields="offer_key,supply_kind,house_name,region_name,address,published_date,special_start_date,special_end_date,first_date,second_date,application_start_date,application_end_date,winner_date,contract_start_date,contract_end_date,total_households,top_price_manwon,official_url,models_json,refreshed_at";
 let q=db.from("df_housing_offers").select(fields);
 if(id)q=q.eq("offer_key",id).limit(1);
 else q=q.order("published_date",{ascending:false,nullsFirst:false}).limit(600);
 const {data,error}=await q;
 if(error){console.error("HOUSING_DATABASE_READ_FAILED",error.code||"UNKNOWN");return reply({ok:false,error:"DATABASE_READ_FAILED"},503)}
 if(!data?.length){const direct=await liveOfficialHousing();if(direct?.length){if(id){const item=direct.find(x=>x.offer_key===id)||null;return reply({ok:!!item,item,source:"official_api_live"},item?200:404)}return reply({ok:true,items:direct,updatedAt:new Date().toISOString(),stale:false,source:"official_api_live",pricingIncomplete:true})}if(!id)return reply({ok:false,error:"OFFICIAL_API_UNAVAILABLE",reason:liveCache.lastError||"NO_RECENT_OFFERS",items:[]},503)}
 if(id)return reply({ok:true,item:data?.[0]||null},data?.length?200:404);
 const items=data||[];
 if(!items.length)return reply({ok:false,error:"DATA_NOT_SYNCED",items:[]},503);
 const updatedAt=items.map(x=>x.refreshed_at).filter(Boolean).sort().at(-1)||null;
 return reply({ok:true,items,updatedAt,stale:!updatedAt||Date.now()-Date.parse(updatedAt)>72*60*60*1000,source:"official_verified_cache"});
}
