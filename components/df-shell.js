"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../lib/df-browser";
const categories=["최신뉴스","지역 FOCUS","개발사업","정책·고시","분양","금융","건설사 동향"];
const hrefFor=(x)=>x==="최신뉴스"?"/focus/live":x==="지역 FOCUS"?"/focus/region":x==="개발사업"?"/focus/projects":"/focus/live?category="+encodeURIComponent(x);

export function DFBrandHeader(){
 return <><header className="focusHeader"><a className="focusBrand" href="/focus"><span className="focusSymbol" aria-hidden="true"><i></i></span><div><strong>개발포커스</strong><small>DEVELOPMENT FOCUS</small></div></a><div className="focusTools"><a href="/focus/region">전국⌄</a><a href="/focus/search" aria-label="통합검색">⌕</a><a href="/my" aria-label="마이">☰</a></div></header><div className="focusTabs"><a href="/focus">홈</a>{categories.map(x=><a href={hrefFor(x)} key={x}>{x}</a>)}</div></>
}
export function DFSubHeader({title,back="/focus",right="/focus/search",kicker}){
 return <header className="dfArticleTop"><a href={back}>←</a><div className="dfSubTitle"><b>{title}</b>{kicker&&<small>{kicker}</small>}</div>{right?<a href={right}>⌕</a>:<span></span>}</header>
}
export function DFBottomNav({active=""}){
 const items=[["home","⌂","홈","/focus"],["news","▤","뉴스","/focus/live"],["region","◎","지역","/focus/region"],["land","◇","땅짚고","/search"],["my","☰","MY","/my"]];
 return <nav className="focusBottom">{items.map(([id,icon,label,href])=><a className={active===id?"active":""} href={href} key={id}><span>{icon}</span><b>{label}</b></a>)}</nav>
}
export function DFSectionTitle({eyebrow,title,href,label="전체보기 →"}){
 return <div className="focusTitle"><div>{eyebrow&&<small className="focusEyebrow">{eyebrow}</small>}<h2>{title}</h2></div>{href&&<a href={href}>{label}</a>}</div>
}

export function DFLiveNotice({placement="home",region=null}){
 const[item,setItem]=useState(null);
 useEffect(()=>{let live=true;(async()=>{
  let q=dfSupabase.from("df_notices").select("id,title,body,notice_type,placement,region_code,is_pinned,starts_at,ends_at").eq("status","published").lte("starts_at",new Date().toISOString()).or("ends_at.is.null,ends_at.gt."+new Date().toISOString()).order("is_pinned",{ascending:false}).order("starts_at",{ascending:false}).limit(8);
  const{data}=await q;
  if(!live)return;
  const rows=(data||[]).filter(x=>(x.placement==="all"||x.placement===placement)&&(!x.region_code||(region&&x.region_code===region)));
  setItem(rows[0]||null);
 })();return()=>{live=false}},[placement,region]);
 if(!item)return null;
 return <section className={"dfLiveNotice "+item.notice_type}><small>{item.notice_type==="urgent"?"긴급 공지":"NOTICE"}</small><b>{item.title}</b><span>{item.body}</span></section>
}

export function DFLiveAd({placement="home",region=null}){
 const[item,setItem]=useState(null);
 useEffect(()=>{let live=true;(async()=>{
  const{data:slots}=await dfSupabase.from("df_ad_slots").select("id,placement,region_code").eq("is_active",true).eq("placement",placement);
  const slotIds=(slots||[]).filter(s=>!s.region_code||(region&&s.region_code===region)).map(s=>s.id);
  if(!slotIds.length){if(live)setItem(null);return}
  const now=new Date().toISOString();
  const{data}=await dfSupabase.from("df_ad_campaigns").select("id,advertiser_name,creative_url,target_url,disclosure_label,region_code,start_at,end_at").eq("status","active").lte("start_at",now).gte("end_at",now).in("slot_id",slotIds).order("approved_at",{ascending:false}).limit(10);
  const row=(data||[]).find(x=>!x.region_code||(region&&x.region_code===region))||null;
  if(!live)return;setItem(row);
  if(row)dfSupabase.rpc("df_record_ad_event",{p_campaign_id:row.id,p_event:"impression"});
 })();return()=>{live=false}},[placement,region]);
 if(!item)return null;
 const inner=<><small>{item.disclosure_label||"광고"}</small>{item.creative_url?<img src={item.creative_url} alt={item.advertiser_name}/>:<b>{item.advertiser_name}</b>}<span>{item.target_url?"자세히 보기 ↗":"광고 캠페인"}</span></>;
 if(!item.target_url)return <div className="dfLiveAd">{inner}</div>;
 function click(){dfSupabase.rpc("df_record_ad_event",{p_campaign_id:item.id,p_event:"click"})}
 return <a className="dfLiveAd" href={item.target_url} target="_blank" rel="noreferrer" onClick={click}>{inner}</a>
}

export function DFAdminHeader({title="편집국 운영센터",kicker="NEWSROOM",back="/my"}){
 return <header className="dfAdminUnifiedHead"><a className="dfAdminBack" href={back}>←</a><div><small>{kicker}</small><b>{title}</b></div><a className="dfAdminPublic" href="/focus">개발포커스</a></header>
}
export function DFAdminBottomNav({active="home"}){
 const items=[["home","⌂","운영","/focus-admin"],["editor","▤","편집국","/focus-admin/publish"],["ads","◇","광고","/focus-admin/ads"],["stats","▥","통계","/focus-admin/stats"],["system","☰","관리","/focus-admin/system"]];
 return <nav className="adminBottom dfAdminBottom">{items.map(([id,icon,label,href])=><a className={active===id?"active":""} href={href} key={id}><span>{icon}</span><b>{label}</b></a>)}</nav>
}
