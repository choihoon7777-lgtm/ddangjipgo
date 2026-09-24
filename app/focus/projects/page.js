"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFBrandHeader,DFBottomNav,DFSectionTitle}from"../../../components/df-shell";
export default function Projects(){
 const[items,setItems]=useState([]),[loading,setLoading]=useState(true),[q,setQ]=useState("");
 useEffect(()=>{(async()=>{let query=dfSupabase.from("df_articles").select("id,title,subtitle,category,region_code,published_at,updated_at").in("status",["published","corrected"]).eq("category","개발사업").order("published_at",{ascending:false}).limit(30);const{data}=await query;setItems(data||[]);setLoading(false)})()},[]);
 const filtered=items.filter(x=>!q||[x.title,x.subtitle,x.region_code].filter(Boolean).join(" ").includes(q));
 return <main className="focusShell dfHigh"><DFBrandHeader/>
 <section className="dfProjectHero"><small>PROJECT INTELLIGENCE</small><h1>사업별로 변화가 쌓이는<br/>개발 데이터베이스</h1><p>기사 한 건으로 끝내지 않고 같은 사업의 고시·변경·일정을 계속 연결합니다.</p></section>
 <section className="focusBlock"><DFSectionTitle eyebrow="SEARCH" title="개발사업 찾기"/><input className="dfProjectSearchInput" value={q} onChange={e=>setQ(e.target.value)} placeholder="사업명 · 지역 검색"/></section>
 <section className="focusBlock"><DFSectionTitle eyebrow="LATEST" title="최근 개발사업 기사" href="/focus/live?category=%EA%B0%9C%EB%B0%9C%EC%82%AC%EC%97%85"/>
 {loading?<div className="focusEmpty"><b>개발사업 정보를 불러오는 중입니다.</b></div>:filtered.length?filtered.map((a,i)=><a className={"focusNews "+(i===0?"leadNews":"")} href={"/focus/article?id="+a.id} key={a.id}><div><small>{a.region_code||"전국"} · 개발사업</small><h3>{a.title}</h3>{a.subtitle&&i===0&&<p className="dfNewsSubtitle">{a.subtitle}</p>}<p>{a.updated_at&&a.updated_at!==a.published_at?"수정기사 · ":""}공식자료 기반</p></div><span className="newsArrow">→</span></a>):<div className="focusEmpty"><b>현재 공개된 개발사업 기사가 없습니다.</b><span>검증·승인된 데이터만 표시됩니다.</span></div>}
 </section><DFBottomNav active="news"/></main>
}