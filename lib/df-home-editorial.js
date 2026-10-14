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
export function articleSourceLabel(story){
 const channel=story?.source_channel;
 if(channel==="보도자료")return "공식 보도자료";
 if(channel==="고시공고")return "공식 고시·공고";
 if(channel==="입법예고")return "공식 입법예고";
 if(channel==="조례규칙")return "공식 조례·규칙";
 if(channel==="investgo")return "전문 분석";
 if(channel==="기사")return "자체 기사";
 return channel?"발행 기사":"자료 출처 확인";
}
