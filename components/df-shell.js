"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../lib/df-browser";
const categories=["최신뉴스","지역 FOCUS","개발사업","정책·고시","분양","금융","건설사 동향"];
const regions=["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
const hrefFor=(x)=>x==="최신뉴스"?"/focus/live":x==="지역 FOCUS"?"/focus/region":x==="개발사업"?"/focus/projects":"/focus/live?category="+encodeURIComponent(x);

export function DFBrandHeader(){
 const[regionOpen,setRegionOpen]=useState(false),[menuOpen,setMenuOpen]=useState(false),[route,setRoute]=useState(""),[isAdmin,setIsAdmin]=useState(false);
 useEffect(()=>{let live=true;setRoute(location.pathname+location.search);const close=e=>{if(e.key==="Escape"){setRegionOpen(false);setMenuOpen(false)}};window.addEventListener("keydown",close);(async()=>{const{data:{user}}=await dfSupabase.auth.getUser();if(!live||!user)return;const{data}=await dfSupabase.from("df_admin_roles").select("profile_id").eq("profile_id",user.id).eq("is_active",true).maybeSingle();if(live)setIsAdmin(!!data)})();return()=>{live=false;window.removeEventListener("keydown",close)}},[]);
 const currentPath=route.split("?")[0]||"";
 const params=new URLSearchParams(route.includes("?")?route.slice(route.indexOf("?")+1):"");
 const currentCategory=params.get("category");
 const activeFor=x=>{
  if(x==="홈")return currentPath==="/focus";
  if(x==="최신뉴스")return currentPath==="/focus/live"&&!currentCategory;
  if(x==="지역 FOCUS")return currentPath==="/focus/region";
  if(x==="개발사업")return currentPath==="/focus/projects"||(currentPath==="/focus/live"&&currentCategory==="개발사업");
  return currentPath==="/focus/live"&&currentCategory===x;
 };
 return <div className="focusHeaderWrap">
  <header className="focusHeader">
   <a className="focusBrand" href="/focus" aria-label="개발포커스 홈"><img className="focusBrandLogo" src="/development-focus-logo.jpg" alt="개발포커스 DEVELOPMENT FOCUS"/></a>
   <div className="focusTools">
    <button type="button" className={"focusTool focusRegionTrigger "+(regionOpen?"on":"")} aria-expanded={regionOpen} aria-controls="focus-region-menu" onClick={()=>{setRegionOpen(v=>!v);setMenuOpen(false)}}>전국 <span>⌄</span></button>
    <a className="focusTool focusToolIcon" href="/focus/search" aria-label="통합검색"><span className="focusSearchGlyph">⌕</span></a>
    <button type="button" className={"focusTool focusToolIcon "+(menuOpen?"on":"")} aria-expanded={menuOpen} aria-controls="focus-quick-menu" aria-label="메뉴" onClick={()=>{setMenuOpen(v=>!v);setRegionOpen(false)}}><span className="focusMenuGlyph">☰</span></button>
   </div>
  </header>
  {regionOpen&&<div className="focusHeaderPopover focusRegionMenu" id="focus-region-menu"><div className="focusPopoverHead"><b>지역 FOCUS</b><a href="/focus/region">전국보기 →</a></div><div className="focusRegionMenuGrid">{["전국",...regions].map(x=><a key={x} href={x==="전국"?"/focus/region":"/focus/region?name="+encodeURIComponent(x)} onClick={()=>setRegionOpen(false)}>{x}</a>)}</div></div>}
  {menuOpen&&<div className="focusHeaderPopover focusQuickMenu" id="focus-quick-menu">{isAdmin&&<a className="focusAdminShortcut" href="/focus-admin"><b>운영센터</b><span>기사·공지·광고 관리 →</span></a>}<a href="/focus/region"><b>지역 FOCUS</b><span>전국 개발정보 →</span></a><a href="/focus/live"><b>뉴스·개발정보</b><span>전체 기사 보기 →</span></a><a href="/my"><b>MY FOCUS</b><span>내 정보 관리 →</span></a><a href="/alerts"><b>알림</b><span>관심부동산 변화 →</span></a><a href="/search"><b>땅짚고</b><span>주소로 부동산 분석 →</span></a></div>}
  <nav className="focusTabs" aria-label="개발포커스 주요 메뉴"><a className={activeFor("홈")?"active":""} href="/focus">홈</a>{categories.map(x=><a className={activeFor(x)?"active":""} href={hrefFor(x)} key={x}>{x}</a>)}</nav>
 </div>
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

export function DFAdminHeader({title="개발포커스 운영센터",kicker="OPERATIONS",back="/focus-admin"}){
 return <header className="dfAdminUnifiedHead"><a className="dfAdminBack" href={back}>←</a><div><small>{kicker}</small><b>{title}</b></div><a className="dfAdminPublic" href="/focus">개발포커스</a></header>
}
export function DFAdminBottomNav({active="home"}){
 const items=[["home","⌂","운영","/focus-admin"],["editor","▤","기사","/focus-admin/publish"],["ads","◇","광고","/focus-admin/ads"],["stats","▥","통계","/focus-admin/stats"],["system","☰","관리","/focus-admin/system"]];
 return <nav className="adminBottom dfAdminBottom">{items.map(([id,icon,label,href])=><a className={active===id?"active":""} href={href} key={id}><span>{icon}</span><b>{label}</b></a>)}</nav>
}


export function DFToast({message,onClose,tone="default"}){
 useEffect(()=>{if(!message)return;const t=setTimeout(()=>onClose?.(),2800);return()=>clearTimeout(t)},[message,onClose]);
 if(!message)return null;
 return <div className={"dfToast "+tone} role="status"><span>{message}</span><button type="button" aria-label="닫기" onClick={()=>onClose?.()}>×</button></div>
}
export function DFConfirmModal({open,title,body,confirmLabel="확인",cancelLabel="취소",danger=false,onConfirm,onCancel}){
 if(!open)return null;
 return <div className="dfModalBackdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onCancel?.()}}>
  <section className="dfConfirmModal" role="dialog" aria-modal="true" aria-labelledby="df-confirm-title">
   <small>CONFIRM</small><h2 id="df-confirm-title">{title}</h2>{body&&<p>{body}</p>}
   <div><button type="button" className="dfModalCancel" onClick={()=>onCancel?.()}>{cancelLabel}</button><button type="button" className={danger?"dfModalDanger":"dfModalConfirm"} onClick={()=>onConfirm?.()}>{confirmLabel}</button></div>
  </section>
 </div>
}
