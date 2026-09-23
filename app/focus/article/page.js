"use client";
import{Suspense,useEffect,useMemo,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";

function normalizeBody(body){
 if(Array.isArray(body))return body.map(x=>typeof x==="string"?x:(x?.text||"")).filter(Boolean).join("\n\n");
 if(body&&typeof body==="object")return body.text||body.content||"";
 return typeof body==="string"?body:"";
}
function ArticleInner(){
 const[a,setA]=useState(null),[loading,setLoading]=useState(true);
 useEffect(()=>{const id=new URLSearchParams(location.search).get("id");if(!id){setLoading(false);return}(async()=>{const{data}=await dfSupabase.from("df_articles").select("id,title,subtitle,summary_3line,body,category,region_code,published_at,updated_at,risk_level").eq("id",id).eq("status","published").single();setA(data||null);setLoading(false)})()},[]);
 const body=useMemo(()=>normalizeBody(a?.body),[a]);
 if(loading)return <main className="focusShell dfHigh"><div className="dfArticleState">기사를 불러오는 중입니다.</div></main>;
 if(!a)return <main className="focusShell dfHigh"><header className="dfArticleTop"><a href="/focus">←</a><b>개발포커스</b><span></span></header><div className="dfArticleState"><b>공개된 기사를 찾을 수 없습니다.</b><a href="/focus">메인으로 돌아가기 →</a></div></main>;
 const summaries=Array.isArray(a.summary_3line)?a.summary_3line.filter(Boolean):[];
 const modified=a.updated_at&&a.published_at&&new Date(a.updated_at).getTime()>new Date(a.published_at).getTime()+1000;
 return <main className="focusShell dfHigh">
  <header className="dfArticleTop"><a href="/focus">←</a><b>개발포커스</b><a href="/search">⌕</a></header>
  <article className="dfNewsArticle">
   <div className="dfArticleMeta"><span>{a.category||"최신뉴스"}</span>{a.region_code&&<em>{a.region_code}</em>}</div>
   <h1>{a.title}</h1>
   {a.subtitle&&<p className="dfNewsLead">{a.subtitle}</p>}
   <p className="dfTime">입력 {new Date(a.published_at).toLocaleString("ko-KR")}{modified&&<> · <b>수정 {new Date(a.updated_at).toLocaleString("ko-KR")}</b></>}</p>
   {summaries.length>0&&<section className="dfKeySummary"><small>KEY POINTS</small>{summaries.map((x,i)=><p key={i}><b>{String(i+1).padStart(2,"0")}</b><span>{x}</span></p>)}</section>}
   <div className="dfStoryBody">{body||"기사 본문이 준비되지 않았습니다."}</div>
   <section className="dfArticleTrust"><b>DEVELOPMENT FOCUS</b><span>공식자료를 기준으로 사실·숫자·날짜를 검증해 전달합니다.</span></section>
  </article>
 </main>
}
export default function Article(){return <Suspense fallback={<main className="focusShell dfHigh"><div className="dfArticleState">기사를 불러오는 중입니다.</div></main>}><ArticleInner/></Suspense>}