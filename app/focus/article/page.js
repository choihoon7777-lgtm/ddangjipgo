"use client";
import{Suspense,useEffect,useMemo,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFSubHeader,DFBottomNav,DFLiveNotice,DFLiveAd}from"../../../components/df-shell";

function normalizeBody(body){
 if(Array.isArray(body))return body.map(x=>typeof x==="string"?x:(x?.text||"")).filter(Boolean).join("\n\n");
 if(body&&typeof body==="object")return body.text||body.content||"";
 return typeof body==="string"?body:"";
}
function ArticleInner(){
 const[a,setA]=useState(null),[sources,setSources]=useState([]),[loading,setLoading]=useState(true),[saved,setSaved]=useState(false),[user,setUser]=useState(null),[saveMsg,setSaveMsg]=useState("");
 useEffect(()=>{const id=new URLSearchParams(location.search).get("id");if(!id){setLoading(false);return}(async()=>{
   const[{data},{data:src},{data:{user:u}}]=await Promise.all([
    dfSupabase.from("df_articles").select("id,title,subtitle,summary_3line,body,category,region_code,published_at,updated_at,risk_level,status").eq("id",id).in("status",["published","corrected"]).single(),
    dfSupabase.rpc("df_public_article_sources",{p_article_id:id}),
    dfSupabase.auth.getUser()
   ]);
   setA(data||null);setSources(src||[]);setUser(u||null);setLoading(false);
   if(data){
    dfSupabase.rpc("df_record_article_view",{p_article_id:id});
    if(u){
      await dfSupabase.from("df_recent_articles").upsert({profile_id:u.id,article_id:id,last_viewed_at:new Date().toISOString(),view_count:1},{onConflict:"profile_id,article_id"});
      const{data:s}=await dfSupabase.from("df_saved_articles").select("article_id").eq("profile_id",u.id).eq("article_id",id).maybeSingle();
      setSaved(!!s);
    }
   }
 })()},[]);
 async function toggleSave(){
  if(!a)return;
  if(!user){location.href="/login?next="+encodeURIComponent(location.pathname+location.search);return}
  setSaveMsg("");
  if(saved){
   const{error}=await dfSupabase.from("df_saved_articles").delete().eq("profile_id",user.id).eq("article_id",a.id);
   if(error)setSaveMsg(error.message);else setSaved(false);
  }else{
   const{error}=await dfSupabase.from("df_saved_articles").insert({profile_id:user.id,article_id:a.id});
   if(error)setSaveMsg(error.message);else setSaved(true);
  }
 }
 const body=useMemo(()=>normalizeBody(a?.body),[a]);
 if(loading)return <main className="focusShell dfHigh"><div className="dfArticleState">기사를 불러오는 중입니다.</div></main>;
 if(!a)return <main className="focusShell dfHigh"><header className="dfArticleTop"><a href="/focus">←</a><b>개발포커스</b><span></span></header><div className="dfArticleState"><b>공개된 기사를 찾을 수 없습니다.</b><a href="/focus">메인으로 돌아가기 →</a></div></main>;
 const summaries=Array.isArray(a.summary_3line)?a.summary_3line.filter(Boolean):[];
 const modified=a.updated_at&&a.published_at&&new Date(a.updated_at).getTime()>new Date(a.published_at).getTime()+1000;
 return <main className="focusShell dfHigh">
  <DFSubHeader title="개발포커스" kicker="ARTICLE"/>
  <DFLiveNotice placement="article" region={a.region_code}/>
  <article className="dfNewsArticle">
   <div className="dfArticleMeta"><span>{a.category||"최신뉴스"}</span>{a.region_code&&<em>{a.region_code}</em>}{a.status==="corrected"&&<em>정정</em>}</div>
   <h1>{a.title}</h1>
   {a.subtitle&&<p className="dfNewsLead">{a.subtitle}</p>}
   <p className="dfTime">입력 {new Date(a.published_at).toLocaleString("ko-KR")}{modified&&<> · <b>수정 {new Date(a.updated_at).toLocaleString("ko-KR")}</b></>}</p>
   <div className="dfArticleActions"><button onClick={toggleSave}>{saved?"★ 저장됨":"☆ 기사 저장"}</button><a href={"/focus/correction?id="+a.id}>정정 요청</a></div>
   {saveMsg&&<p className="adminDataNote">{saveMsg}</p>}
   {summaries.length>0&&<section className="dfKeySummary"><small>KEY POINTS</small>{summaries.map((x,i)=><p key={i}><b>{String(i+1).padStart(2,"0")}</b><span>{x}</span></p>)}</section>}
   <div className="dfStoryBody">{body||"기사 본문이 준비되지 않았습니다."}</div>
   <DFLiveAd placement="article" region={a.region_code}/>
   <section className="dfArticleTrust"><b>DEVELOPMENT FOCUS</b><span>공식자료를 기준으로 사실·숫자·날짜를 검증해 전달합니다.</span></section>
   {sources.length>0&&<section className="dfPublicSources"><small>OFFICIAL SOURCES</small><h2>공식 출처</h2>{sources.map(s=><a key={s.document_id} href={s.source_url||"#"} target={s.source_url?"_blank":undefined} rel="noreferrer"><div><b>{s.source_name||s.document_title}</b><span>{s.document_title}</span>{s.source_published_at&&<em>{new Date(s.source_published_at).toLocaleString("ko-KR")}</em>}</div><strong>{s.source_url?"↗":"·"}</strong></a>)}</section>}
  </article><DFBottomNav active="news"/>
 </main>
}
export default function Article(){return <Suspense fallback={<main className="focusShell dfHigh"><div className="dfArticleState">기사를 불러오는 중입니다.</div></main>}><ArticleInner/></Suspense>}
