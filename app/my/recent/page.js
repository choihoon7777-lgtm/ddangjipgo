"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFSubHeader,DFBottomNav}from"../../../components/df-shell";
export default function Recent(){
 const[items,setItems]=useState([]),[msg,setMsg]=useState("");
 useEffect(()=>{(async()=>{const{data:{user}}=await dfSupabase.auth.getUser();if(!user){location.replace("/login?next=/my/recent");return}const{data,error}=await dfSupabase.from("df_recent_articles").select("article_id,last_viewed_at,view_count,df_articles(id,title,category,region_code,status)").eq("profile_id",user.id).order("last_viewed_at",{ascending:false}).limit(50);if(error)setMsg(error.message);else setItems((data||[]).filter(x=>["published","corrected"].includes(x.df_articles?.status)))})()},[]);
 return <main className="focusShell dfHigh"><DFSubHeader title="최근 본 기사" kicker="HISTORY" back="/my" right={null}/><section className="focusBlock">{msg&&<p className="adminDataNote">{msg}</p>}{items.length?items.map(x=>{const a=x.df_articles;return <a className="focusNews" href={"/focus/article?id="+x.article_id} key={x.article_id}><div><small>{a.category}{a.region_code?" · "+a.region_code:""}</small><h3>{a.title}</h3><p>{new Date(x.last_viewed_at).toLocaleString("ko-KR")}</p></div><span className="newsArrow">→</span></a>}):<div className="focusEmpty"><b>최근 본 기사가 없습니다.</b><span>로그인 상태에서 읽은 기사가 자동으로 기록됩니다.</span></div>}</section><DFBottomNav active="my"/></main>
}