
import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export const dynamic="force-dynamic";
const db=createClient("https://svafsvyjjufbqvxzoqee.supabase.co","sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud",{auth:{persistSession:false,autoRefreshToken:false}});
export async function GET(){
 const [offers,prices]=await Promise.all([
  db.from("df_housing_offers").select("refreshed_at",{count:"exact"}).order("refreshed_at",{ascending:false}).limit(1),
  db.from("df_housing_offers").select("offer_key",{count:"exact",head:true}).not("top_price_manwon","is",null)
 ]);
 if(offers.error||prices.error)return NextResponse.json({ok:false,error:"HEALTH_READ_UNAVAILABLE"},{status:503,headers:{"Cache-Control":"no-store"}});
 const lastUpdated=offers.data?.[0]?.refreshed_at||null;
 return NextResponse.json({ok:true,counts:{notices:offers.count||0,priced:prices.count||0},lastUpdated,stale:!lastUpdated||Date.now()-Date.parse(lastUpdated)>72*3600000,pipelineConfigured:!!(process.env.CRON_SECRET&&process.env.SUPABASE_SERVICE_ROLE_KEY),officialKeyConfigured:!!(process.env.DATA_GO_KR_API_KEY||process.env.DATA_GO_KR_SERVICE_KEY||process.env.PUBLIC_DATA_API_KEY)},{headers:{"Cache-Control":"no-store"}});
}
