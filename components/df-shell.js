"use client";
const categories=["최신뉴스","지역 FOCUS","개발사업","정책·고시","분양","금융","건설사 동향"];
const hrefFor=(x)=>x==="최신뉴스"?"/focus/live":x==="지역 FOCUS"?"/focus/region":x==="개발사업"?"/focus/projects":"/focus/live?category="+encodeURIComponent(x);

export function DFBrandHeader(){
 return <><header className="focusHeader"><a className="focusBrand" href="/focus"><span className="focusSymbol" aria-hidden="true"><i></i></span><div><strong>개발포커스</strong><small>DEVELOPMENT FOCUS</small></div></a><div className="focusTools"><a href="/focus/region">전국⌄</a><a href="/search" aria-label="검색">⌕</a><a href="/my" aria-label="마이">☰</a></div></header><div className="focusTabs"><a href="/focus">홈</a>{categories.map(x=><a href={hrefFor(x)} key={x}>{x}</a>)}</div></>
}
export function DFSubHeader({title,back="/focus",right="/search",kicker}){
 return <header className="dfArticleTop"><a href={back}>←</a><div className="dfSubTitle"><b>{title}</b>{kicker&&<small>{kicker}</small>}</div>{right?<a href={right}>⌕</a>:<span></span>}</header>
}
export function DFBottomNav({active=""}){
 const items=[["home","⌂","홈","/focus"],["news","▤","뉴스","/focus/live"],["region","◎","지역","/focus/region"],["land","◇","땅짚고","/search"],["my","☰","MY","/my"]];
 return <nav className="focusBottom">{items.map(([id,icon,label,href])=><a className={active===id?"active":""} href={href} key={id}><span>{icon}</span><b>{label}</b></a>)}</nav>
}
export function DFSectionTitle({eyebrow,title,href,label="전체보기 →"}){
 return <div className="focusTitle"><div>{eyebrow&&<small className="focusEyebrow">{eyebrow}</small>}<h2>{title}</h2></div>{href&&<a href={href}>{label}</a>}</div>
}


export function DFAdminHeader({title="편집국 운영센터",kicker="NEWSROOM",back="/my"}){
 return <header className="dfAdminUnifiedHead"><a className="dfAdminBack" href={back}>←</a><div><small>{kicker}</small><b>{title}</b></div><a className="dfAdminPublic" href="/focus">개발포커스</a></header>
}
export function DFAdminBottomNav({active="home"}){
 const items=[["home","⌂","운영","/focus-admin"],["editor","▤","편집국","/focus-admin/publish"],["ads","◇","광고","/focus-admin/ads"],["stats","▥","통계","/focus-admin/stats"],["system","☰","관리","/focus-admin/system"]];
 return <nav className="adminBottom dfAdminBottom">{items.map(([id,icon,label,href])=><a className={active===id?"active":""} href={href} key={id}><span>{icon}</span><b>{label}</b></a>)}</nav>
}
