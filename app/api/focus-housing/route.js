
import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const dynamic="force-dynamic";
export const revalidate=0;
const url="https://svafsvyjjufbqvxzoqee.supabase.co";
const key="sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud";
const reply=(payload,status=200)=>NextResponse.json(payload,{status,headers:{"Cache-Control":"public, s-maxage=120, stale-while-revalidate=300"}});
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
 if(id)return reply({ok:true,item:data?.[0]||null},data?.length?200:404);
 const items=data||[];
 if(!items.length)return reply({ok:false,error:"DATA_NOT_SYNCED",items:[]},503);
 const updatedAt=items.map(x=>x.refreshed_at).filter(Boolean).sort().at(-1)||null;
 return reply({ok:true,items,updatedAt,stale:!updatedAt||Date.now()-Date.parse(updatedAt)>72*60*60*1000,source:"official_verified_cache"});
}
