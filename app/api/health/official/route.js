import{sourceHealth,REGIONS}from"../../../../lib/df-source-health";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=25;
const HOST="https://svafsvyjjufbqvxzoqee.supabase.co";
const KEY="sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud";
const output=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"public, s-maxage=120, stale-while-revalidate=180"}});
async function jsonFrom(url,headers){
 const r=await fetch(url,{headers,cache:"no-store",redirect:"error",signal:AbortSignal.timeout(11000)});
 if(!r.ok)throw Error("OFFICIAL_HEALTH_UNAVAILABLE");
 const result=await r.json();
 if(!result||typeof result!=="object")throw Error("OFFICIAL_HEALTH_UNAVAILABLE");
 return result;
}
export async function GET(req){
 const params=new URL(req.url).searchParams,region=params.get("region")||"전국";
 if(region!=="전국"&&!REGIONS.includes(region))return output({ok:false,error:"INVALID_REGION"},400);
 const [r,f]=await Promise.allSettled([
  jsonFrom(HOST+"/functions/v1/df-public-update",{Accept:"application/json"}),
  jsonFrom(HOST+"/rest/v1/df_official_factory_health?select=*",{apikey:KEY,Authorization:"Bearer "+KEY})
 ]);
 if(r.status==="rejected")return output({ok:false,error:"OFFICIAL_COLLECTION_STATUS_UNAVAILABLE"},503);
 const raw=r.value;
 if(!raw.ok||!Array.isArray(raw.sources))return output({ok:false,error:"OFFICIAL_COLLECTION_STATUS_INVALID"},503);
 const regional=sourceHealth(raw.sources,region);
 const national=sourceHealth(raw.sources,"전국");
 const factory=f.status==="fulfilled"&&Array.isArray(f.value)?f.value[0]||null:null;
 return output({ok:true,checkedAt:new Date().toISOString(),regional,national,
  factory:factory?{
    lastRunAt:factory.last_factory_at||null,processedDocuments:raw.total??null,readyDocuments:raw.ready??null,
    published:factory.published_articles??null,review:factory.review_articles??null,
    pending:factory.pending_documents??null
  }:null,
  notice:"수집 스케줄 정상 실행과 기관별 최신 자료 확보는 별개입니다. 수집 실패 시 누락될 수 있습니다.",
  automationMode:"existing-supabase-cron-readonly"
 });
}
