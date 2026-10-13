import GuestUpdates from "../../../components/df-updates-guest";

export const dynamic="force-dynamic";
export const revalidate=0;

const SUPABASE="https://svafsvyjjufbqvxzoqee.supabase.co";
const PUBLIC_KEY="sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud";

// Render the real public data on the server first. An iOS client-side auth,
// CORS or hydration problem must never turn the whole management screen blank.
async function publicData(url,options={},timeoutMs=9500){
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const response=await fetch(url,{...options,cache:"no-store",signal:controller.signal});
  if(!response.ok)throw new Error("PUBLIC_DATA_UNAVAILABLE");
  return await response.json();
 }finally{clearTimeout(timer)}
}
export default async function PublicOfficialUpdatesPage(){
 const [health,documents]=await Promise.allSettled([
  publicData(SUPABASE+"/functions/v1/df-public-update",{},9000),
  publicData(SUPABASE+"/rest/v1/rpc/df_public_development_policy",{
   method:"POST",
   headers:{"Content-Type":"application/json",apikey:PUBLIC_KEY,Authorization:"Bearer "+PUBLIC_KEY},
   body:JSON.stringify({p_channel:null,p_topic:null,p_limit:100,p_offset:0})
  },9000)
 ]);
 const initialStatus=health.status==="fulfilled"&&health.value&&typeof health.value==="object"?health.value:null;
 const initialRecords=documents.status==="fulfilled"&&Array.isArray(documents.value)?documents.value:[];
 return <GuestUpdates initialStatus={initialStatus} initialRecords={initialRecords}/>;
}
