/**
 * Read-only continuity archive of articles that were already public before
 * the upstream Supabase API became unavailable.
 * Only published government press releases / official notices are included.
 */
let pending;
export async function getOfficialNewsArchive(){
 if(!pending){
  pending=fetch("/df-verified-news-archive.json",{cache:"force-cache"})
   .then(async r=>{
    if(!r.ok)throw new Error("Published official news archive unavailable");
    const data=await r.json();
    if(!Array.isArray(data.articles))throw new Error("Published official news archive malformed");
    return {date:data.snapshot_at,articles:data.articles.filter(a=>
     a?.id&&a?.title&&["published","corrected"].includes(a.status)&&
     ["보도자료","고시공고"].includes(a.source_channel)
    )};
   }).catch(e=>{pending=null;throw e;});
 }
 return pending;
}
export async function getCachedOfficialNewsList(limit=50){
 const {articles}=await getOfficialNewsArchive();
 return articles.slice(0,limit);
}
export async function getCachedOfficialNewsArticle(id){
 if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id||""))return null;
 const {articles}=await getOfficialNewsArchive();
 return articles.find(a=>a.id===id)||null;
}
