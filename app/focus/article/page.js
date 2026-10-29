import{createClient}from"@supabase/supabase-js";
import ArticleClient from"./article-client";
import{SITE_DESCRIPTION}from"../../../lib/df-site";
import investgoSnapshot from "../../../public/investgo-verified-articles.json";
import officialNewsSnapshot from "../../../public/df-verified-news-archive.json";
const sb=createClient("https://svafsvyjjufbqvxzoqee.supabase.co","sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud",{auth:{persistSession:false,autoRefreshToken:false}});
export async function generateMetadata({searchParams}){
 const p=await searchParams,id=p?.id;
 if(!id)return{title:"기사",description:SITE_DESCRIPTION};
 const{data}=await sb.from("df_articles").select("title,subtitle,summary_3line,category,region_code,source_channel,original_source_url").eq("id",id).in("status",["published","corrected"]).maybeSingle();
 const a=data||officialNewsSnapshot.articles.find(x=>x.id===id)||investgoSnapshot.articles.find(x=>x.id===id);
 if(!a)return{title:"기사",description:SITE_DESCRIPTION};
 const summary=Array.isArray(a.summary_3line)?a.summary_3line.filter(Boolean).join(" "):"";
 const description=(a.subtitle||summary||a.title||SITE_DESCRIPTION).slice(0,170),canonical="/focus/article?id="+encodeURIComponent(id);
 return{title:a.title,description,alternates:{canonical:a.source_channel==="investgo"&&a.original_source_url?a.original_source_url:canonical},openGraph:{type:"article",title:a.title,description,url:canonical,siteName:"도시맥",images:[{url:"/dosimaek-og.png",alt:"도시맥"}]},twitter:{card:"summary_large_image",title:a.title,description,images:["/dosimaek-og.png"]}};
}
export default function ArticlePage(){return <ArticleClient/>}
