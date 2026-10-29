/**
 * Public, read-only emergency copy of published INVESTGO stories.
 * Loaded only when Supabase data requests fail; not a replacement for live publishing.
 */
let cachedRequest;
export async function getInvestgoArchive(){
 if(!cachedRequest){
  cachedRequest=fetch("/investgo-verified-articles.json",{cache:"force-cache"})
   .then(async response=>{
    if(!response.ok)throw new Error("INVESTGO archive unavailable");
    const payload=await response.json();
    if(!Array.isArray(payload.articles))throw new Error("INVESTGO archive invalid");
    return {date:payload.snapshot_at||null,articles:payload.articles.filter(a=>
     a?.id&&a?.title&&a.source_channel==="investgo"&&["published","corrected"].includes(a.status)
    )};
   })
   .catch(error=>{cachedRequest=null;throw error;});
 }
 return cachedRequest;
}
export async function getCachedInvestgoList(limit=50){
 const {articles}=await getInvestgoArchive();
 return articles.slice(0,limit);
}
export async function getCachedInvestgoArticle(id){
 if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id||""))return null;
 const {articles}=await getInvestgoArchive();
 return articles.find(a=>a.id===id)||null;
}
