import{createClient}from"@supabase/supabase-js";
import ArticleClient from"./article-client";
import{SITE_DESCRIPTION}from"../../../lib/df-site";
const sb=createClient("https://svafsvyjjufbqvxzoqee.supabase.co","sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud",{auth:{persistSession:false,autoRefreshToken:false}});
export async function generateMetadata({searchParams}){
 const p=await searchParams,id=p?.id;
 if(!id)return{title:"기사",description:SITE_DESCRIPTION};
 const{data:a}=await sb.from("df_articles").select("title,subtitle,summary_3line,category,region_code").eq("id",id).in("status",["published","corrected"]).maybeSingle();
 if(!a)return{title:"기사",description:SITE_DESCRIPTION};
 const summary=Array.isArray(a.summary_3line)?a.summary_3line.filter(Boolean).join(" "):"";
 const description=(a.subtitle||summary||a.title||SITE_DESCRIPTION).slice(0,170),canonical="/focus/article?id="+encodeURIComponent(id);
 return{title:a.title,description,alternates:{canonical},openGraph:{type:"article",title:a.title,description,url:canonical,siteName:"개발포커스",images:[{url:"/development-focus-logo.jpg",alt:"개발포커스"}]},twitter:{card:"summary_large_image",title:a.title,description,images:["/development-focus-logo.jpg"]}};
}
export default function ArticlePage(){return <ArticleClient/>}
