import Link from "next/link";

export const dynamic="force-dynamic";
export const revalidate=0;
const ROOT="https://svafsvyjjufbqvxzoqee.supabase.co";
const PUBLIC_KEY="sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud";
const allowed=new Set(["all","candidate","out_of_scope"]);
const visibleDate=x=>{if(!x)return"게시일 미확인";const d=new Date(x);return Number.isNaN(d.getTime())?"게시일 미확인":d.toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"short",day:"numeric"})};
async function getInventory(){
 const ctl=new AbortController(),timeout=setTimeout(()=>ctl.abort(),11000);
 try{
  const url=ROOT+"/rest/v1/df_blog_import_posts?select=source_post_id,original_title,original_url,original_published_at,original_category,target_category,eligibility,import_status,source_scope,rss_excerpt,rss_thumbnail_url,first_seen_at,extraction_status,migrated_article_id&source_blog_id=eq.devel10-01&order=original_published_at.desc&limit=100";
  const r=await fetch(url,{signal:ctl.signal,headers:{"apikey":PUBLIC_KEY,"Authorization":"Bearer "+PUBLIC_KEY},cache:"no-store"});
  if(!r.ok)throw Error("목록 조회 실패 ("+r.status+")");
  const rows=await r.json();return Array.isArray(rows)?rows:[];
 }finally{clearTimeout(timeout)}
}
function href(scope,category="",q="",page=1){
 const u=new URLSearchParams();
 if(scope!=="all")u.set("scope",scope);
 if(category)u.set("category",category);
 if(q)u.set("q",q);
 if(page>1)u.set("page",String(page));
 return "/focus-admin/blog-import"+(u.size?"?"+u.toString():"");
}
export default async function NaverImportInventory({searchParams}){
 const params=await searchParams;
 const scope=allowed.has(params?.scope)?params.scope:"candidate";
 const category=typeof params?.category==="string"?params.category:"";
 const q=typeof params?.q==="string"?params.q.trim().slice(0,80):"";
 const page=Math.min(10,Math.max(1,Number(params?.page)||1));
 let rows=[],error="";
 try{rows=await getInventory()}catch(e){error="이식 목록을 잠시 불러오지 못했습니다."}
 const counters={all:rows.length,candidate:rows.filter(x=>x.eligibility==="candidate").length,out_of_scope:rows.filter(x=>x.eligibility==="out_of_scope").length};
 const categories=[...new Set(rows.filter(x=>x.eligibility==="candidate").map(x=>x.target_category).filter(Boolean))];
 const filtered=rows.filter(x=>(scope==="all"||x.eligibility===scope)&&(!category||x.target_category===category)&&(!q||(x.original_title||"").toLowerCase().includes(q.toLowerCase())));
 const perPage=10;const pageCount=Math.max(1,Math.ceil(filtered.length/perPage));const currentPage=Math.min(page,pageCount);
 const visible=filtered.slice((currentPage-1)*perPage,currentPage*perPage);
 return <main className="adminShell dfAdminUnified dfNaverImport">
  <header className="dfAdminUnifiedHead"><Link className="dfAdminBack" href="/focus-admin">←</Link><div><small>INVESTGO · NAVER RSS</small><b>블로그 이식 관리</b></div><Link className="dfAdminPublic" href="/focus">개발포커스</Link></header>
  <section className="dfNaverHero"><small>콘텐츠 이전 · 1단계</small><h1>투자GO 기사 이식 현황</h1><p>네이버 원본을 유지하면서 개발포커스에 맞는 전문 글만 선별합니다. 원문 전체를 확보한 전문 글을 개발포커스 <strong>투자GO 인사이트 기사</strong>로 연결합니다.</p>
   <div className="dfNaverStats"><div><strong>{counters.all}</strong><span>수집 목록</span></div><div><strong>{counters.candidate}</strong><span>이식 후보</span></div><div><strong>{counters.out_of_scope}</strong><span>주제 제외</span></div></div>
   <a className="dfNaverOriginalLink" href="https://blog.naver.com/devel10-01" target="_blank" rel="noopener noreferrer">네이버 투자GO 원본 블로그 <span>↗</span></a>
  </section>
  <section className="dfNaverContent">
   <div className="dfNaverSectionTitle"><div><small>INVENTORY</small><h2>기존 게시물 목록</h2></div><span>{filtered.length}건</span></div>
   <div className="dfNaverTabs">{[["candidate","우선 검토",counters.candidate],["out_of_scope","1차 제외",counters.out_of_scope],["all","전체",counters.all]].map(([s,label,count])=><Link key={s} className={scope===s?"current":""} href={href(s,"",q)}>{label} <small>{count}</small></Link>)}</div>
   <form className="dfNaverSearch" method="GET" action="/focus-admin/blog-import"><input type="hidden" name="scope" value={scope}/><input aria-label="제목 검색" name="q" placeholder="글 제목 검색" defaultValue={q}/><button type="submit">검색</button></form>
   {scope==="candidate"&&categories.length>0&&<div className="dfNaverCategories"><Link className={!category?"on":""} href={href(scope,"",q)}>전체 분야</Link>{categories.map(cat=><Link key={cat} className={category===cat?"on":""} href={href(scope,cat,q)}>{cat}</Link>)}</div>}
   {error&&<p className="dfNaverEmpty">{error}</p>}
   {!error&&visible.length===0&&<p className="dfNaverEmpty">이 조건에 해당하는 글이 없습니다.</p>}
   <div className="dfNaverList">{visible.map(x=><article key={x.source_post_id} className="dfNaverEntry">
    <div className="dfNaverEntryTop"><span>{x.target_category||x.original_category||"주제 검토"}</span><time>{visibleDate(x.original_published_at)}</time></div>
    <h3>{x.original_title}</h3>
    {x.rss_excerpt&&<p>{x.rss_excerpt}</p>}
    <div className="dfNaverEntryFooter"><span className={x.eligibility==="candidate"?"dfNaverStateCandidate":"dfNaverStateExcluded"}>{x.migrated_article_id?"개발포커스 기사 연결 완료":x.eligibility==="candidate"?(x.extraction_status==="complete"?"본문 확보 · 기사 연결 대기":"이식 후보 · 원문 대기"):"주제 제외 · 원본 유지"}</span>{x.migrated_article_id&&<a href={"/focus/article?id="+x.migrated_article_id}>기사 보기 →</a>}<a href={x.original_url} target="_blank" rel="noopener noreferrer">네이버 원문 ↗</a></div>
   </article>)}</div>
   {pageCount>1&&<nav aria-label="목록 페이지" className="dfNaverPager">{currentPage>1&&<Link href={href(scope,category,q,currentPage-1)}>← 이전</Link>}<span>{currentPage} / {pageCount}</span>{currentPage<pageCount&&<Link href={href(scope,category,q,currentPage+1)}>다음 →</Link>}</nav>}
  </section>
  <section className="dfNaverNotice"><b>원본 보존과 중복 방지</b><p>네이버 게시물 번호로 중복을 확인합니다. 제목·본문 원본은 수정하지 않습니다. 실제 글의 전문을 가져와 기사로 연결하며, 원래 작성일과 출처를 표시합니다. 원본 이미지는 링크로만 보존하며 자체 저장소로 복제한 것은 아닙니다.</p><p>RSS 최신 50건 이외의 과거 글은 별도의 원본 내보내기 또는 추가 확보가 필요합니다.</p></section>
  <nav className="dfNaverFooter"><Link href="/focus-admin">운영센터</Link><Link href="/focus">개발포커스 홈</Link></nav>
 </main>;
}