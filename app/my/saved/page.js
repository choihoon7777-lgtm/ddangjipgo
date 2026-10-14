"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFSubHeader,DFBottomNav}from"../../../components/df-shell";
import{guestSaved,guestToggleSaved}from"../../../lib/df-guest-trial";
export default function Saved(){
 const[items,setItems]=useState([]),[msg,setMsg]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState(""),[guest,setGuest]=useState(false);
 async function load(){setLoading(true);const{data:{user}}=await dfSupabase.auth.getUser();if(!user){setGuest(true);setItems(guestSaved());setLoading(false);return}const{data,error}=await dfSupabase.from("df_saved_articles").select("article_id,created_at,df_articles(id,title,category,region_code,published_at,status)").eq("profile_id",user.id).order("created_at",{ascending:false});if(error)setMsg("저장기사를 불러오지 못했습니다.");else{setMsg("");setItems((data||[]).filter(x=>["published","corrected"].includes(x.df_articles?.status)))}setLoading(false)}
 useEffect(()=>{load()},[]);
 async function remove(id){if(busy)return;setBusy(id);const{data:{user}}=await dfSupabase.auth.getUser();if(!user){try{guestToggleSaved({id,title:items.find(x=>x.article_id===id)?.df_articles?.title||""});setItems(guestSaved());}catch(e){setMsg("체험용 저장 해제 실패: "+e.message)}setBusy("");return}const{error}=await dfSupabase.from("df_saved_articles").delete().eq("profile_id",user.id).eq("article_id",id);if(error)setMsg("저장 해제에 실패했습니다.");else await load();setBusy("")}
 return <main className="focusShell dfHigh"><DFSubHeader title="저장기사" kicker="SAVED" back="/my" right={null}/><section className="focusBlock">{guest&&<p className="dfGuestNotice">로그인 없는 체험 모드 · 저장한 기사는 현재 기기에만 보관됩니다.</p>}{msg&&<p className="adminDataNote">{msg}</p>}{loading?<div className="focusEmpty"><b>저장기사를 불러오는 중입니다.</b></div>:items.length?items.map(x=>{const a=x.df_articles;return <article className="focusNews dfSavedRow" key={x.article_id}><a href={"/focus/article?id="+x.article_id}><small>{a.category}{a.region_code?" · "+a.region_code:""}</small><h3>{a.title}</h3><p>{new Date(x.created_at).toLocaleDateString("ko-KR")} 저장</p></a><button disabled={busy===x.article_id} onClick={()=>remove(x.article_id)}>{busy===x.article_id?"처리 중":"삭제"}</button></article>}):<div className="focusEmpty"><b>저장한 기사가 없습니다.</b><span>기사에서 ‘기사 저장’을 누르면 이곳에 모입니다.</span></div>}</section><DFBottomNav active="my"/></main>
}
