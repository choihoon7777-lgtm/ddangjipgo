
import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {readLiveOffers,readLiveOfferById} from "../../../lib/df-housing-live.mjs";
export const dynamic="force-dynamic";
export const maxDuration=60;
const url="https://svafsvyjjufbqvxzoqee.supabase.co";
const key="sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud";
const reply=(payload,status=200)=>NextResponse.json(payload,{status,headers:{"Cache-Control":"public, s-maxage=300, stale-while-revalidate=600"}});
export async function GET(request){
 const args=new URL(request.url).searchParams;
 const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const id=args.get("id")||"";
 if(id&&(!/^(APT|REMAIN|OPTIONAL):\d+:\d+$/.test(id)||id.length>90))return reply({ok:false,error:"INVALID_ID"},400);
 let q=db.from("df_housing_offers").select("offer_key,supply_kind,house_name,region_name,address,published_date,special_start_date,special_end_date,first_date,second_date,application_start_date,application_end_date,winner_date,contract_start_date,contract_end_date,total_households,top_price_manwon,official_url,models_json,refreshed_at");
 if(id)q=q.eq("offer_key",id).limit(1);
 else {
  const region=(args.get("region")||"").slice(0,20),term=(args.get("q")||"").trim().slice(0,60);
  const kind=args.get("kind")||"";
  if(region)q=q.ilike("region_name",region.replace(/[%_,]/g,"")+"%");
  if(term)q=q.ilike("house_name","%"+term.replace(/[%_,]/g,"")+"%");
  if(["APT","REMAIN","OPTIONAL"].includes(kind))q=q.eq("supply_kind",kind);
  q=q.order("published_date",{ascending:false,nullsFirst:false}).limit(400);
 }
 const {data,error}=await q;
 const liveKey=process.env.DATA_GO_KR_API_KEY||process.env.DATA_GO_KR_SERVICE_KEY||process.env.PUBLIC_DATA_API_KEY;
 if((error||(!id&&!(data||[]).length))&&liveKey){
  try{
   if(id)return reply({ok:true,item:await readLiveOfferById(liveKey,id),source:"official_live"});
   let items=await readLiveOffers(liveKey);
   const region=(args.get("region")||"").trim(),term=(args.get("q")||"").trim().toLowerCase(),kind=args.get("kind")||"";
   items=items.filter(r=>(!region||String(r.region_name||r.address||"").startsWith(region))&&(!kind||r.supply_kind===kind)&&(!term||[r.house_name,r.address,r.region_name].filter(Boolean).join(" ").toLowerCase().includes(term)));
   return reply({ok:true,items,updatedAt:new Date().toISOString(),source:"official_live"});
  }catch(e){console.error("HOUSING_LIVE_UNAVAILABLE",e.message)}
 }
 if(error){
  console.error("HOUSING_READ_FAILED",error.code||"UNKNOWN");
  return reply({ok:false,error:"HOUSING_DATA_UNAVAILABLE",items:[]},503);
 }
 if(id)return reply({ok:true,item:data?.[0]||null});
 const items=data||[];
 return reply({ok:true,items,updatedAt:items.map(x=>x.refreshed_at).filter(Boolean).sort().at(-1)||null});
}
