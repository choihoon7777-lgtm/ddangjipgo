"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFSubHeader,DFBottomNav}from"../../../components/df-shell";
export default function Saved(){
 const[items,setItems]=useState([]),[msg,setMsg]=useState("");
 async function load(){const{data:{user}}=await dfSupabase.auth.getUser();if(!user){location.replace("/login?next=/my/saved");return}const{data,error}=await dfSupabase.from("df_saved_articles").select("article_id,created_at,df_articles(id,title,category,region_code,published_at,status)").eq("profile_id",user.id).order("created_at",{ascending:false});if(error)setMsg(error.message);else setItems((data||[]).filter(x=>["published","corrected"].includes(x.df_articles?.status)))}
 useEffect(()=>{load()},[]);
 async function remove(id){const{data:{user}}=await dfSupabase.auth.getUser();const{error}=await dfSupabase.from("df_saved_articles").delete().eq("profile_id",user.id).eq("article_id",id);if(error)setMsg(error.message);else load()}
 return <main className="focusShell dfHigh"><DFSubHeader title="저장기사" kicker="SAVED" back="/my" right={null}/><section className="focusBlock">{msg&&<p className="adminDataNote">{msg}</p>}{items.length?items.map(x=>{const a=x.df_articles;return <article className="focusNews dfSavedRow" key={x.article_id}><a href={"/focus/article?id="+x.article_id}><small>{a.category}{a.region_code?" · "+a.region_code:""}</small><h3>{a.title}</h3><p>{new Date(x.created_at).toLocaleDateString("ko-KR")} 저장</p></a><button onClick={()=>remove(x.article_id)}>삭제</button></article>}):<div className="focusEmpty"><b>저장한 기사가 없습니다.</b><span>기사에서 ‘기사 저장’을 누르면 이곳에 모입니다.</span></div>}</section><DFBottomNav active="my"/></main>
}