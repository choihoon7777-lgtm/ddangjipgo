"use client";
import{Suspense,useEffect,useMemo,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFBrandHeader,DFBottomNav,DFLiveNotice,DFLiveAd}from"../../../components/df-shell";
import OfficialArticleText from "../../../components/df-official-article-text";
import{decodeEditorialEntities}from"../../../lib/df-editorial-format";
import{getCachedInvestgoArticle}from"../../../lib/df-investgo-fallback";
import{guestIsSaved,guestToggleSaved,guestRecordRecent}from"../../../lib/df-guest-trial";

function normalizeBody(body){
 if(Array.isArray(body))return body.map(x=>typeof x==="string"?x:(x?.text||"")).filter(Boolean).join("\n\n");
 if(body&&typeof body==="object")return body.text||body.content||"";
 return typeof body==="string"?body:"";
}
function ArticleInner(){
 const[a,setA]=useState(null),[history,setHistory]=useState([]),[loading,setLoading]=useState(true),[saved,setSaved]=useState(false),[user,setUser]=useState(null),[saveMsg,setSaveMsg]=useState(""),[saveBusy,setSaveBusy]=useState(false),[shareMsg,setShareMsg]=useState(""),[archiveUsed,setArchiveUsed]=useState(false);
 useEffect(()=>{
  const id=new URLSearchParams(location.search).get("id");
  if(!id){setLoading(false);return;}
  let active=true;
  (async()=>{
   try{
    const [articleResult,historyResult,userResult]=await Promise.allSettled([
     dfSupabase.from("df_articles").select("id,title,subtitle,body,category,region_code,published_at,updated_at,risk_level,status,source_channel,original_source_url,original_source_label,original_source_published_at,hero_image_url,body_image_urls").eq("id",id).in("status",["published","corrected"]).single(),
     dfSupabase.rpc("df_public_article_history",{p_article_id:id}),
     dfSupabase.auth.getUser()
    ]);
    const response=articleResult.status==="fulfilled"?articleResult.value:null;
    let story=response?.data||null,usedArchive=false;
    if(!story){
     try{story=await getCachedInvestgoArticle(id);usedArchive=!!story;}catch(e){story=null;}
    }
    const history=historyResult.status==="fulfilled"?historyResult.value?.data||[]:[];
    const u=userResult.status==="fulfilled"?userResult.value?.data?.user||null:null;
    if(!active)return;
    setA(story);setHistory(history);setUser(u);setArchiveUsed(usedArchive);
    if(story){
     if(!usedArchive)dfSupabase.rpc("df_record_article_view",{p_article_id:id});
     if(u){
      if(!usedArchive)await dfSupabase.rpc("df_record_recent_article",{p_article_id:id});
      const{data:s}=await dfSupabase.from("df_saved_articles").select("article_id").eq("profile_id",u.id).eq("article_id",id).maybeSingle();
      if(active)setSaved(!!s);
     }else{
      try{guestRecordRecent(story);if(active)setSaved(guestIsSaved(id))}
      catch(e){if(active)setSaveMsg("체험 저장기록을 사용할 수 없습니다. 기기 저장소 설정을 확인하세요.")}
     }
    }
   }finally{if(active)setLoading(false)}
  })();
  return()=>{active=false};
 },[]);
 async function toggleSave(){
  if(!a||saveBusy)return;
  if(!user){try{const isSaved=guestToggleSaved(a);setSaved(isSaved);setSaveMsg(isSaved?"이 기기에 기사를 저장했습니다.":"이 기기의 저장을 해제했습니다.")}catch(e){setSaveMsg(e.message||"체험 기기 저장에 실패했습니다.")}return}
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
  const url=location.href,payload={title:decodeEditorialEntities(a.title),text:a.subtitle||"도시맥 기사",url};
  try{
   if(navigator.share){await navigator.share(payload);setShareMsg("공유했습니다.");}
   else if(navigator.clipboard){await navigator.clipboard.writeText(url);setShareMsg("기사 링크를 복사했습니다.");}
   else setShareMsg("브라우저 주소를 복사해 공유해 주세요.");
  }catch(e){if(e?.name!=="AbortError")setShareMsg("공유를 완료하지 못했습니다.")}
 }
 const body=useMemo(()=>normalizeBody(a?.body),[a]);
 if(loading)return <main className="focusShell dfHigh"><DFBrandHeader/><div className="dfArticleState">기사를 불러오는 중입니다.</div></main>;
 if(!a)return <main className="focusShell dfHigh"><DFBrandHeader/><div className="dfArticleState"><b>공개된 기사를 찾을 수 없습니다.</b><a href="/focus">메인으로 돌아가기 →</a></div></main>;
 const isBlog=a.source_channel==="investgo";
 const ownedImage=u=>typeof u==="string"&&/^https:\/\/svafsvyjjufbqvxzoqee\.supabase\.co\/storage\/v1\/object\/public\/df-investgo-images\//.test(u);
 const gallery=isBlog&&Array.isArray(a.body_image_urls)?a.body_image_urls.filter(u=>ownedImage(u)&&u!==a.hero_image_url).slice(0,9):[];
 const modified=!isBlog&&a.updated_at&&a.published_at&&new Date(a.updated_at).getTime()>new Date(a.published_at).getTime()+1000;
 return <main className="focusShell dfHigh">
  <DFBrandHeader/>
  {archiveUsed&&<p className="dfInvestgoArchiveNotice" role="status">투자GO 발행 글의 저장본입니다. 현재 실시간 연결이 제한되어 이후 수정사항은 반영되지 않을 수 있습니다.</p>}
  <div className="dfArticleCrumb"><a href={isBlog?"/focus/live?category=인사이트":"/focus/live"}>← {isBlog?"인사이트":"최신뉴스"}</a><span>도시맥</span></div>
  <DFLiveNotice placement="article" region={a.region_code}/>
  <article className="dfNewsArticle">
   <div className="dfArticleMeta"><span>{isBlog?"인사이트":a.category||"최신뉴스"}</span>{a.region_code&&<em>{a.region_code}</em>}{a.status==="corrected"&&<em>정정</em>}</div>
   <h1>{decodeEditorialEntities(a.title)}</h1>
   <p className="dfTime">발행 {new Date(a.original_source_published_at||a.published_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}{modified&&<> · <b>수정 {new Date(a.updated_at).toLocaleString("ko-KR")}</b></>}</p>
   <div className="dfArticleActions"><button disabled={saveBusy} aria-pressed={saved} onClick={toggleSave}>{saveBusy?"처리 중…":saved?"★ 저장됨":"☆ 기사 저장"}</button><button onClick={shareArticle}>공유</button><a href={"/focus/correction?id="+a.id}>정정 요청</a></div>
   {(saveMsg||shareMsg)&&<p className="dfArticleActionMsg">{saveMsg||shareMsg}</p>}
   {isBlog&&/^https:\/\/svafsvyjjufbqvxzoqee\.supabase\.co\/storage\/v1\/object\/public\/df-investgo-images\//.test(a.hero_image_url||"")&&<figure className="dfInvestgoArticleFigure"><img className="dfInvestgoArticleImage" src={a.hero_image_url} alt={a.title+" 관련 이미지"} decoding="async" loading="eager" onError={e=>{e.currentTarget.parentElement.style.display="none"}}/><figcaption>기사 관련 이미지</figcaption></figure>}
   {body?<section className="dfOfficialNewsFullText dfUnifiedArticleText"><h2>기사 본문</h2><OfficialArticleText content={body} kind={isBlog?"insight":"article"}/></section>:<p className="dfOfficialEmpty">기사 본문이 준비되지 않았습니다.</p>}
   {gallery.length>0&&<section className="dfInvestgoArticleGallery" aria-label="네이버 원본 기사 추가 이미지"><h2>기사 관련 사진</h2>{gallery.map((src,i)=><figure key={src}><img src={src} alt={a.title+" 관련 원본 사진 "+(i+2)} decoding="async" loading="lazy" onError={e=>{e.currentTarget.parentElement.style.display="none"}}/><figcaption>네이버 투자GO 원본 사진 {i+2}</figcaption></figure>)}</section>}
   <DFLiveAd placement="article" region={a.region_code}/>
   {history.length>0&&<section className="dfCorrectionHistory"><small>CORRECTION HISTORY</small><h2>수정 이력</h2>{history.map(v=><div key={v.version_no}><b>v{v.version_no}</b><span>{v.change_note||"기사 내용 수정"}</span><em>{new Date(v.created_at).toLocaleString("ko-KR")}</em></div>)}</section>}

  </article><DFBottomNav active="news"/>
 </main>
}
export default function ArticleClient(){return <Suspense fallback={<main className="focusShell dfHigh"><div className="dfArticleState">기사를 불러오는 중입니다.</div></main>}><ArticleInner/></Suspense>}
