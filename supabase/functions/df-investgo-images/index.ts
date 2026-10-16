import {createClient} from "npm:@supabase/supabase-js@2.57.0";

const BASE=Deno.env.get("SUPABASE_URL")||"";
const KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
const db=createClient(BASE,KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const BUCKET="df-investgo-images";
const MAX_GALLERY=10;
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json; charset=utf-8","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST,OPTIONS","Access-Control-Allow-Headers":"content-type,authorization,apikey","Cache-Control":"no-store"}});
const matchesSource=(u:URL)=>u.protocol==="https:"&&/^(?:[a-z0-9-]+\.)*pstatic\.net$/i.test(u.hostname)&&!u.username&&!u.password&&!u.port;
const isOwned=(value:unknown)=>typeof value==="string"&&value.startsWith(BASE+"/storage/v1/object/public/"+BUCKET+"/");
function options(raw:string){
 let parsed:URL;
 try{parsed=new URL(raw)}catch{return[]}
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
 if(!/^[0-9]{9,15}$/.test(post.source_post_id))return {id:post.source_post_id,status:"invalid_post"};
 const urls=Array.isArray(post.original_image_urls)?post.original_image_urls.filter((x:unknown)=>typeof x==="string"&&options(x).length>0).slice(0,MAX_GALLERY):[];
 if(!urls.length&&post.rss_thumbnail_url&&options(post.rss_thumbnail_url).length)urls.push(post.rss_thumbnail_url);
 if(!urls.length)return {id:post.source_post_id,status:"no_image_in_original"};
 const current=post.df_articles as any;
 const alreadyHero=isOwned(current?.hero_image_url);
 const existingGallery=Array.isArray(current?.body_image_urls)?current.body_image_urls.filter(isOwned):[];
 const copied:string[]=[];
 const failures:string[]=[];
 // The first original picture is the article's hero. Additional pictures belong in the gallery.
 if(alreadyHero)copied.push(current.hero_image_url);
 for(let i=alreadyHero?1:0;i<urls.length;i++){
  let done=false;
  for(const candidate of options(urls[i])){
   try{
    const image=await getImage(candidate);
    const location=post.source_post_id+"/"+(i===0?"lead":"body-"+String(i).padStart(2,"0"))+"."+image.ext;
    const {error}=await db.storage.from(BUCKET).upload(location,image.bytes,{contentType:image.mime,upsert:true,cacheControl:"31536000"});
    if(error)throw Error("STORAGE_"+error.message);
    copied.push(BASE+"/storage/v1/object/public/"+BUCKET+"/"+location);
    done=true;
    break;
   }catch(e){failures[i]=String(e instanceof Error?e.message:e).slice(0,120)}
  }
  if(!done&&i===0)break; // Never use a secondary picture as a misleading cover.
 }
 if(!copied.length)return {id:post.source_post_id,status:"failed",error:failures.filter(Boolean).join("; ").slice(0,200)};
 const hero=copied[0];
 const gallery=[...new Set([...existingGallery,...copied.slice(1)])].slice(0,MAX_GALLERY-1);
 const {error}=await db.from("df_articles").update({hero_image_url:hero,body_image_urls:gallery}).eq("id",post.migrated_article_id).eq("source_channel","investgo").eq("status","published");
 if(error)return {id:post.source_post_id,status:"failed",error:"DB_UPDATE_"+error.message.slice(0,120)};
 return {id:post.source_post_id,status:failures.filter(Boolean).length?"partial":"copied",total_images:copied.length,body_images:gallery.length,failed_sources:failures.filter(Boolean).length,hero};
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return json({ok:true});
 if(req.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
 if(!BASE||!KEY)return json({error:"SERVER_NOT_READY"},503);
 const input=await req.json().catch(()=>null);
 if(!input||Object.keys(input).length!==1||!Number.isInteger(input.batch)||input.batch<0||input.batch>8)return json({error:"INVALID_FIXED_BATCH"},400);
 try{
  const {data:posts,error}=await db.from("df_blog_import_posts")
   .select("source_post_id,rss_thumbnail_url,original_image_urls,migrated_article_id,df_articles!df_blog_import_posts_migrated_article_id_fkey(hero_image_url,body_image_urls,status)")
   .eq("source_blog_id","devel10-01").eq("eligibility","candidate").eq("import_status","published")
   .not("migrated_article_id","is",null).order("original_published_at",{ascending:false}).range(input.batch*5,input.batch*5+4);
  if(error)throw error;
  const results=[];
  for(const post of posts||[]){
   const article=post.df_articles as any;
   if(article?.status!=="published"){results.push({id:post.source_post_id,status:"not_published"});continue}
   const images=Array.isArray(post.original_image_urls)?post.original_image_urls.filter((u:string)=>options(u).length>0):[];
   const cover=article?.hero_image_url;
   const gallery=Array.isArray(article?.body_image_urls)?article.body_image_urls:[];
   if(isOwned(cover)&&gallery.length>=Math.max(0,images.length-1)){results.push({id:post.source_post_id,status:"already_stored"});continue}
   results.push(await copyImage(post));
  }
  return json({ok:true,batch:input.batch,processed:results.length,copied:results.filter(x=>["copied","already_stored"].includes(x.status)).length,
   missing:results.filter(x=>x.status==="no_image_in_original").length,
   partial:results.filter(x=>x.status==="partial").length,
   failed:results.filter(x=>x.status==="failed").length,results});
 }catch(e){return json({error:String(e instanceof Error?e.message:e)},500)}
});