"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFSubHeader,DFBottomNav}from"../../../components/df-shell";
export default function Saved(){
 const[items,setItems]=useState([]),[msg,setMsg]=useState(""),[loading,setLoading]=useState(true),[busy,setBusy]=useState("");
 async function load(){setLoading(true);const{data:{user}}=await dfSupabase.auth.getUser();if(!user){location.replace("/login?next=/my/saved");return}const{data,error}=await dfSupabase.from("df_saved_articles").select("article_id,created_at,df_articles(id,title,category,region_code,published_at,status)").eq("profile_id",user.id).order("created_at",{ascending:false});if(error)setMsg("저장기사를 불러오지 못했습니다.");else{setMsg("");setItems((data||[]).filter(x=>["published","corrected"].includes(x.df_articles?.status)))}setLoading(false)}
 useEffect(()=>{load()},[]);
 async function remove(id){if(busy)return;setBusy(id);const{data:{user}}=await dfSupabase.auth.getUser();if(!user){location.replace("/login?next=/my/saved");return}const{error}=await dfSupabase.from("df_saved_articles").delete().eq("profile_id",user.id).eq("article_id",id);if(error)setMsg("저장 해제에 실패했습니다.");else await load();setBusy("")}
 return <main className="focusShell dfHigh"><DFSubHeader title="저장기사" kicker="SAVED" back="/my" right={null}/><section className="focusBlock">{msg&&<p className="adminDataNote">{msg}</p>}{loading?<div className="focusEmpty"><b>저장기사를 불러오는 중입니다.</b></div>:items.length?items.map(x=>{const a=x.df_articles;return <article className="focusNews dfSavedRow" key={x.article_id}><a href={"/focus/article?id="+x.article_id}><small>{a.category}{a.region_code?" · "+a.region_code:""}</small><h3>{a.title}</h3><p>{new Date(x.created_at).toLocaleDateString("ko-KR")} 저장</p></a><button disabled={busy===x.article_id} onClick={()=>remove(x.article_id)}>{busy===x.article_id?"처리 중":"삭제"}</button></article>}):<div className="focusEmpty"><b>저장한 기사가 없습니다.</b><span>기사에서 ‘기사 저장’을 누르면 이곳에 모입니다.</span></div>}</section><DFBottomNav active="my"/></main>
}
