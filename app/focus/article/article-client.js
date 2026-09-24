"use client";
import{Suspense,useEffect,useMemo,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFBrandHeader,DFBottomNav,DFLiveNotice,DFLiveAd}from"../../../components/df-shell";

function normalizeBody(body){
 if(Array.isArray(body))return body.map(x=>typeof x==="string"?x:(x?.text||"")).filter(Boolean).join("\n\n");
 if(body&&typeof body==="object")return body.text||body.content||"";
 return typeof body==="string"?body:"";
}
function ArticleInner(){
 const[a,setA]=useState(null),[sources,setSources]=useState([]),[history,setHistory]=useState([]),[loading,setLoading]=useState(true),[saved,setSaved]=useState(false),[user,setUser]=useState(null),[saveMsg,setSaveMsg]=useState(""),[saveBusy,setSaveBusy]=useState(false),[shareMsg,setShareMsg]=useState("");
 useEffect(()=>{const id=new URLSearchParams(location.search).get("id");if(!id){setLoading(false);return}(async()=>{
   const[{data},{data:src},{data:hist},{data:{user:u}}]=await Promise.all([
    dfSupabase.from("df_articles").select("id,title,subtitle,summary_3line,body,category,region_code,published_at,updated_at,risk_level,status").eq("id",id).in("status",["published","corrected"]).single(),
    dfSupabase.rpc("df_public_article_sources",{p_article_id:id}),
    dfSupabase.rpc("df_public_article_history",{p_article_id:id}),
    dfSupabase.auth.getUser()
   ]);
   setA(data||null);setSources(src||[]);setHistory(hist||[]);setUser(u||null);setLoading(false);
   if(data){
    dfSupabase.rpc("df_record_article_view",{p_article_id:id});
    if(u){
      await dfSupabase.rpc("df_record_recent_article",{p_article_id:id});
      const{data:s}=await dfSupabase.from("df_saved_articles").select("article_id").eq("profile_id",u.id).eq("article_id",id).maybeSingle();
      setSaved(!!s);
    }
   }
 })()},[]);
 async function toggleSave(){
  if(!a||saveBusy)return;
  if(!user){location.href="/login?next="+encodeURIComponent(location.pathname+location.search);return}
  setSaveBusy(true);setSaveMsg("");
  try{
   if(saved){
    const{error}=await dfSupabase.from("df_saved_articles").delete().eq("profile_id",user.id).eq("article_id",a.id);
    if(error)throw error;setSaved(false);setSaveMsg("저장을 해제했습니다.");
   }else{
    const{error}=await dfSupabase.from("df_saved_articles").upsert({profile_id:user.id,article_id:a.id},{onConflict:"profile_id,article_id",ignoreDuplicates:true});
    if(error)throw error;setSaved(true);setSaveMsg("저장기사에 추가했습니다.");
   }
  }catch(e){setSaveMsg("저장 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.")}finally{setSaveBusy(false)}
 }
 async function shareArticle(){
  if(!a)return;setShareMsg("");
  const url=location.href,payload={title:a.title,text:a.subtitle||"개발포커스 기사",url};
  try{
   if(navigator.share){await navigator.share(payload);setShareMsg("공유했습니다.");}
   else if(navigator.clipboard){await navigator.clipboard.writeText(url);setShareMsg("기사 링크를 복사했습니다.");}
   else setShareMsg("브라우저 주소를 복사해 공유해 주세요.");
  }catch(e){if(e?.name!=="AbortError")setShareMsg("공유를 완료하지 못했습니다.")}
 }
 const body=useMemo(()=>normalizeBody(a?.body),[a]);
 if(loading)return <main className="focusShell dfHigh"><DFBrandHeader/><div className="dfArticleState">기사를 불러오는 중입니다.</div></main>;
 if(!a)return <main className="focusShell dfHigh"><DFBrandHeader/><div className="dfArticleState"><b>공개된 기사를 찾을 수 없습니다.</b><a href="/focus">메인으로 돌아가기 →</a></div></main>;
 const summaries=Array.isArray(a.summary_3line)?a.summary_3line.filter(Boolean):[];
 const modified=a.updated_at&&a.published_at&&new Date(a.updated_at).getTime()>new Date(a.published_at).getTime()+1000;
 return <main className="focusShell dfHigh">
  <DFBrandHeader/>
  <div className="dfArticleCrumb"><a href="/focus/live">← 최신뉴스</a><span>VERIFIED ARTICLE</span></div>
  <DFLiveNotice placement="article" region={a.region_code}/>
  <article className="dfNewsArticle">
   <div className="dfArticleMeta"><span>{a.category||"최신뉴스"}</span>{a.region_code&&<em>{a.region_code}</em>}{a.status==="corrected"&&<em>정정</em>}</div>
   <h1>{a.title}</h1>
   {a.subtitle&&<p className="dfNewsLead">{a.subtitle}</p>}
   <p className="dfTime">입력 {new Date(a.published_at).toLocaleString("ko-KR")}{modified&&<> · <b>수정 {new Date(a.updated_at).toLocaleString("ko-KR")}</b></>}</p>
   <div className="dfArticleActions"><button disabled={saveBusy} aria-pressed={saved} onClick={toggleSave}>{saveBusy?"처리 중…":saved?"★ 저장됨":"☆ 기사 저장"}</button><button onClick={shareArticle}>공유</button><a href={"/focus/correction?id="+a.id}>정정 요청</a></div>
   {(saveMsg||shareMsg)&&<p className="dfArticleActionMsg">{saveMsg||shareMsg}</p>}
   {summaries.length>0&&<section className="dfKeySummary"><small>KEY POINTS</small>{summaries.map((x,i)=><p key={i}><b>{String(i+1).padStart(2,"0")}</b><span>{x}</span></p>)}</section>}
   <div className="dfStoryBody">{body||"기사 본문이 준비되지 않았습니다."}</div>
   <DFLiveAd placement="article" region={a.region_code}/>
   {history.length>0&&<section className="dfCorrectionHistory"><small>CORRECTION HISTORY</small><h2>수정 이력</h2>{history.map(v=><div key={v.version_no}><b>v{v.version_no}</b><span>{v.change_note||"기사 내용 수정"}</span><em>{new Date(v.created_at).toLocaleString("ko-KR")}</em></div>)}</section>}
   <section className="dfArticleTrust"><b>DEVELOPMENT FOCUS</b><span>공식자료를 기준으로 사실·숫자·날짜를 검증해 전달합니다.</span></section>
   {sources.length>0&&<section className="dfPublicSources"><small>OFFICIAL SOURCES</small><h2>공식 출처</h2>{sources.map(s=>{const content=<><div><b>{s.source_name||s.document_title}</b><span>{s.document_title}</span>{s.source_published_at&&<em>{new Date(s.source_published_at).toLocaleString("ko-KR")}</em>}</div><strong>{s.source_url?"↗":"확인"}</strong></>;return s.source_url?<a key={s.document_id} href={s.source_url} target="_blank" rel="noreferrer">{content}</a>:<div className="dfPublicSourceStatic" key={s.document_id}>{content}</div>})}</section>}
  </article><DFBottomNav active="news"/>
 </main>
}
export default function ArticleClient(){return <Suspense fallback={<main className="focusShell dfHigh"><div className="dfArticleState">기사를 불러오는 중입니다.</div></main>}><ArticleInner/></Suspense>}
