
import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {createHash} from "node:crypto";
import {buildHousingRows,housingKey,koreaToday} from "../../../lib/df-housing-upstream.mjs";
import {HOUSING_KINDS} from "../../../lib/df-housing.mjs";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;
const DATABASE="https://svafsvyjjufbqvxzoqee.supabase.co";
const out=(data,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"private, no-store"}});
const fingerprint=row=>createHash("sha256").update(JSON.stringify({source_json:row.source_json,models_json:row.models_json||null})).digest("hex");
function changed(oldValue,newValue){
 const keys=["house_name","region_name","address","published_date","special_start_date","special_end_date","first_date","second_date","application_start_date","application_end_date","winner_date","contract_start_date","contract_end_date","total_households","top_price_manwon","models_json"];
 return keys.filter(k=>JSON.stringify(oldValue[k])!==JSON.stringify(newValue[k]));
}
function errorCode(e){const code=String(e?.code||e?.message||"SYNC_UNKNOWN");return /^[A-Z0-9_]{3,60}$/.test(code)?code:"SYNC_UNKNOWN"}
export async function GET(req){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get("authorization")!=="Bearer "+secret)return out({ok:false,error:"UNAUTHORIZED"},401);
 const key=housingKey();
 const dbKey=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key||!dbKey)return out({ok:false,error:"CONFIG_REQUIRED",missing:[...(!key?["DATA_GO_KR_SERVICE_KEY"]:[]),...(!dbKey?["SUPABASE_SERVICE_ROLE_KEY"]:[])]},503);
 const db=createClient(DATABASE,dbKey,{auth:{persistSession:false,autoRefreshToken:false}});
 const started=await db.from("df_housing_sync_runs").insert({status:"running"}).select("id").single();
 if(started.error)return out({ok:false,error:"SYNC_HISTORY_UNAVAILABLE"},503);
 const runId=started.data.id,counts={},warnings=[],issues=[];
 let partial=false;
 for(const kind of Object.keys(HOUSING_KINDS)){
  try{
   const result=await buildHousingRows(kind,key,{fromDate:koreaToday(-120),concurrency:6});
   partial=partial||result.partial;
   warnings.push(...result.warnings.map(w=>({kind,code:w.code})));
   counts[kind]={fetched:result.rows.length,changed:0,inserted:0,unchanged:0};
   for(let start=0;start<result.rows.length;start+=80){
    const rows=result.rows.slice(start,start+80);
    const {data:existing,error:lookupError}=await db.from("df_housing_offers").select("offer_key,source_hash,house_name,region_name,address,published_date,special_start_date,special_end_date,first_date,second_date,application_start_date,application_end_date,winner_date,contract_start_date,contract_end_date,total_households,top_price_manwon,models_json,source_json").in("offer_key",rows.map(x=>x.offer_key));
    if(lookupError)throw new Error("LOOKUP_FAILED");
    const oldMap=new Map((existing||[]).map(x=>[x.offer_key,x]));
    const upserts=[],versions=[];
    for(const row of rows){
     const old=oldMap.get(row.offer_key);
     if(!("models_json" in row)&&old){
      row.models_json=old.models_json;
      row.top_price_manwon=old.top_price_manwon;
     }
     const hash=fingerprint(row);
     if(old&&hash===old.source_hash){counts[kind].unchanged++;continue}
     if(old){
      const delta=changed(old,row);
      if(delta.length)versions.push({offer_key:row.offer_key,previous_hash:old.source_hash,changed_fields:delta,previous_snapshot:old});
      counts[kind].changed++;
     }else counts[kind].inserted++;
     upserts.push({...row,source_hash:hash,verified_at:new Date().toISOString()});
    }
    if(versions.length){
     const {error}=await db.from("df_housing_offer_versions").insert(versions);
     if(error)throw new Error("VERSION_SAVE_FAILED");
    }
    if(upserts.length){
     const {error}=await db.from("df_housing_offers").upsert(upserts,{onConflict:"offer_key"});
     if(error)throw new Error("OFFERS_SAVE_FAILED");
    }
   }
  }catch(e){issues.push({kind,code:errorCode(e)});}
 }
 const total=Object.values(counts).reduce((sum,v)=>sum+v.fetched,0);
 const status=issues.length?total?"partial":"error":partial||warnings.length?"partial":"success";
 const primary=issues[0]?.code||null;
 const {error:writeError}=await db.from("df_housing_sync_runs").update({finished_at:new Date().toISOString(),status,counts,error_code:primary,warning_count:warnings.length,partial_coverage:partial}).eq("id",runId);
 if(writeError)return out({ok:false,error:"SYNC_REPORT_FAILED"},503);
 return out({ok:status!=="error",status,counts,warnings:{count:warnings.length,codes:[...new Set(warnings.map(w=>w.code))]},partial,issues,checkedAt:new Date().toISOString()},status==="error"?502:200);
}
