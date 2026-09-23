"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
const regions=["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
export default function Region(){
 const[name,setName]=useState("전국"),[items,setItems]=useState([]),[loading,setLoading]=useState(true);
 useEffect(()=>{const q=new URLSearchParams(location.search).get("name")||"전국";setName(q);(async()=>{let query=dfSupabase.from("df_articles").select("id,title,category,region_code,published_at,updated_at").eq("status","published").order("published_at",{ascending:false}).limit(12);if(q!=="전국")query=query.eq("region_code",q);const{data}=await query;setItems(data||[]);setLoading(false)})()},[]);
 return <main className="focusShell dfHigh">
  <header className="dfArticleTop"><a href="/focus">←</a><b>{name} FOCUS</b><a href="/search">⌕</a></header>
  <section className="dfRegionIntro"><small>REGIONAL INTELLIGENCE</small><h1>{name==="전국"?"전국 개발 흐름":name+"의 개발 흐름"}</h1><p>개발사업·정책·고시·분양·금융 정보를 지역 기준으로 모아봅니다.</p></section>
  <section className="dfRegionPicker"><div className="focusTitle"><div><small className="focusEyebrow">REGION</small><h2>지역 선택</h2></div></div><div className="regionGrid">{["전국",...regions].map(x=><a className={x===name?"on":""} href={"/focus/region?name="+encodeURIComponent(x)} key={x}>{x}</a>)}</div></section>
  <section className="focusBlock"><div className="focusTitle"><div><small className="focusEyebrow">LATEST</small><h2>{name} 주요 개발정보</h2></div><a href="/focus/live">전체보기 →</a></div>
  {loading?<div className="focusEmpty"><b>불러오는 중입니다</b></div>:items.length?items.map((a,i)=><a className={"focusNews "+(i===0?"leadNews":"")} href={"/focus/article?id="+a.id} key={a.id}><div><small>{a.category||"최신뉴스"}</small><h3>{a.title}</h3><p>{a.updated_at&&a.updated_at!==a.published_at?"수정기사 · ":""}공식자료 기반</p></div><span className="newsArrow">→</span></a>):<div className="focusEmpty"><b>현재 공개된 지역 기사가 없습니다.</b><span>검증·승인된 기사만 표시됩니다.</span></div>}
  </section>
  <section className="dfRegionAction"><small>LAND INTELLIGENCE</small><b>{name==="전국"?"관심 부동산을 등록하세요":name+"의 내 부동산을 추적하세요"}</b><span>주변 개발사업과 고시·실거래 변화를 한곳에서 확인합니다.</span><a href="/search">땅짚고에서 등록하기 →</a></section>
 </main>