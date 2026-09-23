"use client";
import{useEffect,useMemo,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFSubHeader,DFBottomNav}from"../../../components/df-shell";
export default function FocusSearch(){
 const[q,setQ]=useState(""),[items,setItems]=useState([]),[loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{const{data}=await dfSupabase.from("df_articles").select("id,title,subtitle,category,region_code,published_at,updated_at").eq("status","published").order("published_at",{ascending:false}).limit(100);setItems(data||[]);setLoading(false)})()},[]);
 const results=useMemo(()=>{const k=q.trim().toLowerCase();if(!k)return[];return items.filter(a=>[a.title,a.subtitle,a.category,a.region_code].filter(Boolean).join(" ").toLowerCase().includes(k))},[q,items]);
 return <main className="focusShell dfHigh"><DFSubHeader title="통합검색" kicker="SEARCH" right={null}/>
 <section className="dfSearchHero"><small>DEVELOPMENT FOCUS SEARCH</small><h1>기사·지역·개발정보를<br/>한 번에 찾습니다.</h1><div className="dfSearchBox"><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="사업명 · 지역 · 정책 · 기사 검색"/><span>⌕</span></div></section>
 <section className="focusBlock">{loading?<div className="focusEmpty"><b>검색 데이터를 준비 중입니다.</b></div>:!q.trim()?<div className="focusEmpty"><b>검색어를 입력하세요.</b><span>현재 공개된 검증 기사에서 검색합니다.</span></div>:results.length?results.map(a=><a className="focusNews" href={"/focus/article?id="+a.id} key={a.id}><div><small>{a.category||"최신뉴스"}{a.region_code?" · "+a.region_code:""}</small><h3>{a.title}</h3><p>{a.updated_at&&a.updated_at!==a.published_at?"수정기사 · ":""}공식자료 기반</p></div><span className="newsArrow">→</span></a>):<div className="focusEmpty"><b>검색 결과가 없습니다.</b><span>다른 사업명이나 지역명으로 검색해 보세요.</span></div>}</section>
 <DFBottomNav active="news"/></main>
}