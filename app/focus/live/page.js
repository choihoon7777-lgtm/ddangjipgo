"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFSubHeader,DFBottomNav,DFSectionTitle}from"../../../components/df-shell";
const cats=["전체","개발사업","정책·고시","분양","금융","건설사 동향"];
export default function Live(){
 const[category,setCategory]=useState("전체"),[items,setItems]=useState([]),[loading,setLoading]=useState(true);
 useEffect(()=>{const q=new URLSearchParams(location.search).get("category")||"전체";setCategory(cats.includes(q)?q:"전체")},[]);
 useEffect(()=>{(async()=>{setLoading(true);let q=dfSupabase.from("df_articles").select("id,title,subtitle,category,region_code,published_at,updated_at").eq("status","published").order("published_at",{ascending:false}).limit(30);if(category!=="전체")q=q.eq("category",category);const{data}=await q;setItems(data||[]);setLoading(false)})()},[category]);
 return <main className="focusShell dfHigh"><DFSubHeader title="최신뉴스" kicker="VERIFIED NEWS"/>
 <section className="dfLiveHero"><small>DEVELOPMENT FOCUS</small><h1>검증된 개발뉴스만</h1><p>공식자료를 기준으로 사실·숫자·날짜를 확인한 기사만 공개합니다.</p></section>
 <div className="dfNewsFilters">{cats.map(x=><a key={x} className={x===category?"on":""} href={x==="전체"?"/focus/live":"/focus/live?category="+encodeURIComponent(x)}>{x}</a>)}</div>
 <section className="focusBlock"><DFSectionTitle eyebrow="LATEST" title={category==="전체"?"전체 뉴스":category} />
 {loading?<div className="focusEmpty"><b>뉴스를 불러오는 중입니다.</b></div>:items.length?items.map((a,i)=><a className={"focusNews "+(i===0?"leadNews":"")} href={"/focus/article?id="+a.id} key={a.id}><div><small>{a.category||"최신뉴스"}{a.region_code?" · "+a.region_code:""}</small><h3>{a.title}</h3>{a.subtitle&&i===0&&<p className="dfNewsSubtitle">{a.subtitle}</p>}<p>{a.updated_at&&a.updated_at!==a.published_at?"수정기사 · ":""}공식자료 기반</p></div><span className="newsArrow">→</span></a>):<div className="focusEmpty"><b>현재 공개된 기사가 없습니다.</b><span>검증·승인된 기사만 표시됩니다.</span></div>}
 </section><DFBottomNav active="news"/></main>
}