import {createClient} from "npm:@supabase/supabase-js@2.57.0";

const BASE=Deno.env.get("SUPABASE_URL")||"";
const KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const storage=createClient(BASE,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const BUCKET="df-investgo-images";
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"content-type","Cache-Control":"no-store"}});
const matchesSource=(u:URL)=>u.protocol==="https:"&&/^(?:[a-z0-9-]+\.)*pstatic\.net$/i.test(u.hostname)&&!u.username&&!u.password&&!u.port;
function options(url:string){
 let parsed:URL;
 try{parsed=new URL(url)}catch{return[]}
 if(!matchesSource(parsed))return[];
 const out:string[]=[];
 for(const variant of ["w966","w800","w500"]){
  const u=new URL(parsed.href);u.searchParams.set("type",variant);out.push(u.href);
 }
 return [...new Set(out)];
}
function detect(bytes:Uint8Array){
 if(bytes.length<12000||bytes.length>10485760)throw Error("INVALID_IMAGE_SIZE");
 if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return {mime:"image/jpeg",ext:"jpg"};
 if(bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47)return {mime:"image/png",ext:"png"};
 if(String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP")return {mime:"image/webp",ext:"webp"};
 if(String.fromCharCode(...bytes.slice(0,3))==="GIF")return {mime:"image/gif",ext:"gif"};
 throw Error("UNKNOWN_IMAGE_FORMAT");
}
function dimensions(bytes:Uint8Array,kind:string){
 if(kind==="image/png"&&bytes.length>24){const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);return [d.getUint32(16),d.getUint32(20)]}
 if(kind==="image/gif"&&bytes.length>10)return [bytes[6]|(bytes[7]<<8),bytes[8]|(bytes[9]<<8)];
 if(kind==="image/jpeg"){
  let p=2;while(p+9<bytes.length){
   if(bytes[p]!==0xff){p++;continue}
   let marker=bytes[p+1];p+=2;
   while(marker===0xff&&p<bytes.length)marker=bytes[p++];
   if(marker===0xd9||marker===0xda)break;
   if([0x01,0xd0,0xd1,0xd2,0xd3,0xd4,0xd5,0xd6,0xd7].includes(marker))continue;
   if(p+2>bytes.length)break;
   const n=(bytes[p]<<8)|bytes[p+1];if(n<2||p+n>bytes.length)break;
   if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker))return [(bytes[p+5]<<8)|bytes[p+6],(bytes[p+3]<<8)|bytes[p+4]];
   p+=n;
  }
 }
 return [0,0];
}
async function getImage(url:string){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),11000);
 try{
  const response=await fetch(url,{signal:controller.signal,redirect:"manual",headers:{"Accept":"image/jpeg,image/png,image/webp,image/gif","User-Agent":"Mozilla/5.0"}});
  if(!response.ok)throw Error("IMAGE_HTTP_"+response.status);
  if(response.status>=300&&response.status<400)throw Error("REDIRECT_NOT_ALLOWED");
  const length=Number(response.headers.get("content-length")||0);
  if(length>10485760)throw Error("OVERSIZED_IMAGE");
  const bytes=new Uint8Array(await response.arrayBuffer());
  const type=detect(bytes);
  const [width,height]=dimensions(bytes,type.mime);
  if((width&&width<350)||(height&&height<180))throw Error("LOW_RES_IMAGE_"+width+"x"+height);
  return {bytes,...type,width,height};
 }finally{clearTimeout(timer)}
}
async function copyImage(post:any){
 const urls=Array.isArray(post.original_image_urls)?post.original_image_urls.filter(x=>typeof x==="string"):[];
 // The original RSS image is only a fallback; prefer the full-size original SmartEditor media.
 const candidates=urls.flatMap(options);
 if(post.rss_thumbnail_url)candidates.push(...options(post.rss_thumbnail_url));
 if(!candidates.length)return {id:post.source_post_id,status:"no_image_in_original"};
 let failure="NO_ACCESSIBLE_HIGH_RES_IMAGE";
 for(const source of [...new Set(candidates)]){
  try{
   const image=await getImage(source);
   const location=post.source_post_id+"/lead."+image.ext;
   const {error}=await storage.storage.from(BUCKET).upload(location,image.bytes,{contentType:image.mime,upsert:true,cacheControl:"31536000"});
   if(error)throw Error("STORAGE_"+error.message);
   const publicURL=BASE+"/storage/v1/object/public/"+BUCKET+"/"+location;
   const {error:updateError}=await storage.from("df_articles").update({hero_image_url:publicURL}).eq("id",post.migrated_article_id).eq("source_channel","investgo");
   if(updateError)throw updateError;
   return {id:post.source_post_id,status:"copied",width:image.width,height:image.height,bytes:image.bytes.length,stored:location};
  }catch(e){failure=String(e instanceof Error?e.message:e).slice(0,130)}
 }
 return {id:post.source_post_id,status:"failed",error:failure};
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return json({ok:true});
 if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
 if(!BASE||!KEY)return json({error:"SERVER_NOT_READY"},503);
 const data=await req.json().catch(()=>null);
 if(!data||Object.keys(data).length!==1||!Number.isInteger(data.batch)||data.batch<0||data.batch>6)return json({error:"INVALID_FIXED_BATCH"},400);
 try{
  const {data:posts,error}=await storage.from("df_blog_import_posts")
   .select("source_post_id,rss_thumbnail_url,original_image_urls,migrated_article_id,df_articles!df_blog_import_posts_migrated_article_id_fkey(hero_image_url)")
   .eq("source_blog_id","devel10-01").eq("eligibility","candidate").not("migrated_article_id","is",null)
   .order("original_published_at",{ascending:false}).range(data.batch*5,data.batch*5+4);
  if(error)throw error;
  const results=[];
  for(const post of posts||[]){
   const hero=(post.df_articles as any)?.hero_image_url;
   if(typeof hero==="string"&&hero.includes("/storage/v1/object/public/"+BUCKET+"/")){results.push({id:post.source_post_id,status:"already_stored"});continue}
   results.push(await copyImage(post));
  }
  return json({ok:true,batch:data.batch,processed:results.length,copied:results.filter(x=>x.status==="copied"||x.status==="already_stored").length,missing:results.filter(x=>x.status==="no_image_in_original").length,failed:results.filter(x=>x.status==="failed").length,results});
 }catch(e){return json({error:String(e instanceof Error?e.message:e)},500)}
});