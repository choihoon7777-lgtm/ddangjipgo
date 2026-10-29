"use client";
import{useEffect,useRef,useState}from"react";
import{dfSupabase}from"../lib/df-browser";
const categories=["최신 뉴스","정책·고시","시장 분석","분양·청약","지역별 정보"];
const hrefFor=(x)=>x==="최신 뉴스"?"/focus/live":x==="시장 분석"?"/focus/live?category=인사이트":x==="지역별 정보"?"/focus/region":x==="개발사업"?"/focus/projects":x==="정책·고시"?"/focus/policy":x==="분양·청약"?"/focus/housing":"/focus/live?category="+encodeURIComponent(x);

export function DFBrandHeader(){
 const[menuOpen,setMenuOpen]=useState(false),[route,setRoute]=useState(""),[isAdmin,setIsAdmin]=useState(false),[unread,setUnread]=useState(0);
 useEffect(()=>{let live=true;setRoute(location.pathname+location.search);const close=e=>{if(e.key==="Escape")setMenuOpen(false)};window.addEventListener("keydown",close);(async()=>{const{data:{user}}=await dfSupabase.auth.getUser();if(!live||!user)return;const[role,alerts]=await Promise.all([dfSupabase.from("df_admin_roles").select("profile_id").eq("profile_id",user.id).eq("is_active",true).maybeSingle(),dfSupabase.from("df_land_alerts").select("id",{count:"exact",head:true}).in("status",["pending","sent"])]);if(live){setIsAdmin(!!role.data);setUnread(alerts.count||0)}})();return()=>{live=false;window.removeEventListener("keydown",close)}},[]);
 const currentPath=route.split("?")[0]||"";
 const params=new URLSearchParams(route.includes("?")?route.slice(route.indexOf("?")+1):"");
 const currentCategory=params.get("category");
 const activeFor=x=>{
  if(x==="홈")return currentPath==="/focus";
  if(x==="최신 뉴스")return currentPath==="/focus/live"&&!currentCategory;
  if(x==="지역별 정보")return currentPath==="/focus/region";
  if(x==="시장 분석")return currentPath==="/focus/live"&&currentCategory==="인사이트";
  if(x==="개발사업")return currentPath==="/focus/projects"||(currentPath==="/focus/live"&&currentCategory==="개발사업");
  if(x==="정책·고시")return currentPath==="/focus/policy";
  if(x==="분양·청약")return currentPath==="/focus/housing";
  return currentPath==="/focus/live"&&currentCategory===x;
 };
 return <div className="focusHeaderWrap">
  <header className="focusHeader">
   <a className="focusBrand dfCityBrand" href="/focus" aria-label="도시맥 홈"><img className="dfCityMark" src="/dosimaek-mark.svg" alt="" width="36" height="36"/><span className="dfCityWordmark">도시<span>맥</span></span></a>
   <div className="focusTools">
    <a className="focusTool focusToolIcon dfHeaderBell" href="/alerts" aria-label={"내 부동산 알림"+(unread?" 읽지 않은 알림 "+unread+"건":"")} title="내 부동산 알림"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>{unread>0&&<span className="dfHeaderBellCount">{unread>99?"99+":unread}</span>}</a>
    <a className="focusTool focusToolIcon" href="/focus/search" aria-label="통합검색"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><circle cx="10.7" cy="10.7" r="6.7"/><path d="m16 16 5 5"/></svg></a>
    <button type="button" className={"focusTool focusToolIcon "+(menuOpen?"on":"")} aria-expanded={menuOpen} aria-controls="focus-quick-menu" aria-label="메뉴" onClick={()=>setMenuOpen(v=>!v)}><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
   </div>
  </header>
  {menuOpen&&<div className="focusHeaderPopover focusQuickMenu" id="focus-quick-menu">{isAdmin&&<a className="focusAdminShortcut" href="/focus-admin"><b>운영센터</b><span>기사·공지·광고 관리 →</span></a>}<a href="/focus-admin/updates"><b>전국 신규자료 업데이트</b><span>로그인 없이 공식자료 지금 수집 →</span></a><a href="/focus/region"><b>지역 FOCUS</b><span>전국 개발정보 →</span></a><a href="/focus/housing"><b>분양·청약</b><span>전국 분양가·청약일정 →</span></a><a href="/focus/live"><b>뉴스·개발정보</b><span>전체 기사 보기 →</span></a><a href="/focus/live?category=인사이트"><b>시장 분석 · 투자GO</b><span>부동산 개발·금융 전문 분석 →</span></a><a href="/my"><b>MY FOCUS</b><span>내 정보 관리 →</span></a><a href="/alerts"><b>알림</b><span>관심부동산 변화 →</span></a><a href="/search"><b>땅짚고</b><span>주소로 부동산 분석 →</span></a></div>}
  <nav className="focusTabs" aria-label="도시맥 뉴스 카테고리">{categories.map(x=><a className={activeFor(x)?"active":""} href={hrefFor(x)} key={x}>{x}</a>)}</nav>
 </div>
}
export function DFSubHeader({title,back="/focus",right="/focus/search",kicker}){
 return <header className="dfArticleTop"><a href={back}>←</a><div className="dfSubTitle"><b><img className="dfCitySubMark" src="/dosimaek-mark.svg" alt="" width="18" height="18"/>{title}</b>{kicker&&<small>{kicker}</small>}</div>{right?<a href={right}>⌕</a>:<span></span>}</header>
}
function DFNavIcon({id}){return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{id==="home"?<><path d="m3 10 9-7 9 7v10H3z"/><path d="M9 20v-7h6v7"/></>:id==="news"?<><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h8M8 11h8M8 15h5"/></>:id==="policy"?<><path d="M3 10h18L12 4 3 10ZM5 20h14M7 12v6M12 12v6M17 12v6"/></>:id==="land"?<><path d="M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12Z"/><circle cx="12" cy="9" r="2.4"/></>:<><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></>}</svg>;}
export function DFBottomNav({active=""}){const items=[["home","홈","/focus"],["news","뉴스","/focus/live"],["policy","정책","/focus/policy"],["land","내 부동산","/my/properties"],["my","내 정보","/my"]];return <nav className="focusBottom dfPremiumBottom" aria-label="주요 메뉴">{items.map(([id,label,href])=><a className={active===id?"active":""} aria-current={active===id?"page":undefined} href={href} key={id}><DFNavIcon id={id}/><b>{label}</b></a>)}</nav>;}
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

export function DFAdminHeader({title="도시맥 운영센터",kicker="OPERATIONS",back="/focus-admin"}){
 return <header className="dfAdminUnifiedHead"><a className="dfAdminBack" href={back}>←</a><div><small>{kicker}</small><b>{title}</b></div><a className="dfAdminPublic" href="/focus">도시맥</a></header>
}
export function DFAdminBottomNav({active="home"}){
 const items=[["home","⌂","홈","/focus-admin"],["editor","▤","기사","/focus-admin/publish"],["updates","▥","자료","/focus-admin/updates"],["housing","◇","부동산","/focus-admin/housing"],["system","☰","운영","/focus-admin/system"]];
 return <nav className="adminBottom dfAdminBottom" aria-label="운영센터 메뉴">{items.map(([id,icon,label,href])=><a className={active===id?"active":""} aria-current={active===id?"page":undefined} href={href} key={id}><span aria-hidden="true">{icon}</span><b>{label}</b></a>)}</nav>
}


export function DFToast({message,onClose,tone="default"}){
 useEffect(()=>{if(!message)return;const t=setTimeout(()=>onClose?.(),2800);return()=>clearTimeout(t)},[message,onClose]);
 if(!message)return null;
 return <div className={"dfToast "+tone} role="status"><span>{message}</span><button type="button" aria-label="닫기" onClick={()=>onClose?.()}>×</button></div>
}
export function DFConfirmModal({open,title,body,confirmLabel="확인",cancelLabel="취소",danger=false,onConfirm,onCancel}){
 const confirmRef=useRef(null),dialogRef=useRef(null);
 useEffect(()=>{if(!open)return;const prev=document.activeElement;const oldOverflow=document.body.style.overflow;document.body.style.overflow="hidden";const t=setTimeout(()=>confirmRef.current?.focus(),0);const key=e=>{if(e.key==="Escape"){e.preventDefault();onCancel?.();return}if(e.key==="Tab"){const nodes=[...(dialogRef.current?.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')||[])].filter(x=>!x.disabled);if(!nodes.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}return}if(e.key==="Enter"&&e.target?.tagName!=="TEXTAREA")onConfirm?.()};window.addEventListener("keydown",key);return()=>{clearTimeout(t);window.removeEventListener("keydown",key);document.body.style.overflow=oldOverflow;prev?.focus?.()}},[open,onCancel,onConfirm]);
 if(!open)return null;
 return <div className="dfModalBackdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onCancel?.()}}>
  <section ref={dialogRef} className="dfConfirmModal" role="dialog" aria-modal="true" aria-labelledby="df-confirm-title" aria-describedby={body?"df-confirm-body":undefined}>
   <small>CONFIRM</small><h2 id="df-confirm-title">{title}</h2>{body&&<p id="df-confirm-body">{body}</p>}
   <div><button type="button" className="dfModalCancel" onClick={()=>onCancel?.()}>{cancelLabel}</button><button ref={confirmRef} type="button" className={danger?"dfModalDanger":"dfModalConfirm"} onClick={()=>onConfirm?.()}>{confirmLabel}</button></div>
  </section>
 </div>
}
