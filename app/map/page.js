"use client";
import{useEffect,useMemo,useState}from"react";
import{dfSupabase}from"../../lib/df-browser";
import{DFSubHeader,DFBottomNav,DFLiveAd}from"../../components/df-shell";
const regions=["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
export default function MapPage(){
 const[articles,setArticles]=useState([]),[watch,setWatch]=useState([]);
 useEffect(()=>{(async()=>{
  const{data:a}=await dfSupabase.from("df_articles").select("id,title,category,region_code,published_at").in("status",["published","corrected"]).order("published_at",{ascending:false}).limit(300);setArticles(a||[]);
  const{data:{user}}=await dfSupabase.auth.getUser();if(user){const{data:w}=await dfSupabase.from("df_land_watchlists").select("id,label,address_text,region_code,is_active").eq("profile_id",user.id).eq("is_active",true);setWatch(w||[])}
 })()},[]);
 const counts=useMemo(()=>{const m={};for(const a of articles){if(a.region_code)m[a.region_code]=(m[a.region_code]||0)+1}return m},[articles]);
 return <main className="focusShell dfHigh"><DFSubHeader title="개발지도" kicker="MAP" right={null}/>
 <section className="dfMapHero"><small>DEVELOPMENT MAP</small><h1>전국 개발정보를<br/>지역 기준으로 한눈에 봅니다.</h1><p>실제 발행된 검증기사와 내 관심부동산만 지도 데이터에 반영합니다.</p></section>
 <section className="dfMapFrame"><iframe title="대한민국 지도" src="https://www.openstreetmap.org/export/embed.html?bbox=124.5%2C33%2C131.9%2C38.7&layer=mapnik" loading="lazy"/><span>기본지도 · OpenStreetMap</span></section>
 <section className="focusBlock"><div className="focusTitle"><div><small className="focusEyebrow">REGION SIGNAL</small><h2>지역별 개발기사</h2></div></div><div className="dfMapRegionGrid">{regions.map(x=><a href={"/focus/region?name="+encodeURIComponent(x)} key={x}><b>{x}</b><strong>{counts[x]||0}</strong><span>검증기사</span></a>)}</div></section>
 <section className="focusBlock"><div className="focusTitle"><div><small className="focusEyebrow">MY PROPERTY</small><h2>내 관심부동산</h2></div><a href="/search">+ 등록</a></div>{watch.length?<div className="dfPropertyList">{watch.map(x=><article key={x.id}><a href={"/asset/"+x.id}><small>{x.region_code||"지역 미분류"}</small><b>{x.label||x.address_text}</b><span>{x.address_text}</span></a></article>)}</div>:<div className="focusEmpty"><b>등록된 관심부동산이 없습니다.</b><span>땅짚고에서 등록하면 이 지도 화면에서도 바로 접근할 수 있습니다.</span></div>}</section>
 <DFLiveAd placement="map_sponsor"/>
 <section className="dfLandResultNotice"><b>임의의 지도 핀은 표시하지 않습니다.</b><span>좌표가 검증된 사업·부동산만 향후 실제 핀으로 표시합니다. 현재는 실제 기사 지역 집계와 저장 부동산을 연결합니다.</span></section>
 <DFBottomNav active="region"/></main>
}