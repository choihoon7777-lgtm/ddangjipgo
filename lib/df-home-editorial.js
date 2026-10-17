// Explicit editorial curation takes priority. Unselected stories remain chronological.
// Never infer economic impact, report unverified images, or change article facts.
export function mergeHomeStories(selected=[],recent=[],limit=12){
 const result=[],ids=new Set();
 for(const story of [...selected.filter(x=>x?.is_top_focus===true),...recent]){
  if(!story?.id||ids.has(story.id))continue;
  ids.add(story.id);result.push(story);
  if(result.length>=limit)break;
 }
 return result;
}
export function safeEditorialCover(value){
 try{
  if(typeof value!=="string")return null;
  const u=new URL(value);
  if(u.protocol!=="https:"||u.hostname!=="svafsvyjjufbqvxzoqee.supabase.co")return null;
  if(!u.pathname.startsWith("/storage/v1/object/public/df-")||!u.pathname.match(/\.(?:jpg|jpeg|png|webp)$/i))return null;
  return u.href;
 }catch{return null}
}
// Internal acquisition channel names belong in the private audit metadata,
// not as repetitive reader-facing labels on newsroom cards.
export function articleSourceLabel(_story){
 return "";
}
