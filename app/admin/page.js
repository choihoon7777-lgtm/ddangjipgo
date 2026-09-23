const queue=[
 {title:"개발계획 변경안 검토 기사",region:"대전 FOCUS",category:"개발사업",sources:3,risk:"LOW",checks:5},
 {title:"도시개발 신규 고시 분석",region:"전국",category:"정책·고시",sources:2,risk:"LOW",checks:5},
 {title:"광역교통 사업 진행상황",region:"경기 FOCUS",category:"교통/SOC",sources:2,risk:"REVIEW",checks:4}
];
export default function Admin(){
 return <main className="df-admin">
  <header className="admin-head"><div><b>DEVELOPMENT FOCUS</b><span>모바일 편집국</span></div><button>관리자</button></header>
  <section className="admin-hero"><p>오늘의 편집국</p><h1>발행할 기사만<br/>확인하세요.</h1><div className="admin-kpis"><div><b>09</b><span>발행가능</span></div><div><b>05</b><span>추가확인</span></div><div><b>02</b><span>위험검토</span></div></div></section>
  <section className="admin-section"><div className="section-title"><h2>발행 대기</h2><span>전체보기</span></div>
   {queue.map((x,i)=><article className="queue-card" key={i}><div className="queue-meta"><span>{x.region}</span><span>{x.category}</span><em className={x.risk==="LOW"?"safe":"review"}>{x.risk}</em></div><h3>{x.title}</h3><p>공식출처 {x.sources}건 · 검증 {x.checks}/5 · AI 편집완료</p><div className="check-row"><span>사실 ✓</span><span>숫자 ✓</span><span>날짜 ✓</span><span>출처 ✓</span><span>중복 ✓</span></div><div className="queue-actions"><button>원문</button><button>수정</button><button>보류</button><button className="publish">발행</button></div></article>)}
  </section>
  <section className="admin-section"><div className="section-title"><h2>운영 현황</h2></div><div className="ops-grid"><div><b>기사 관리</b><span>발행·정정·휴지통</span></div><div><b>공지 관리</b><span>전체·지역·예약</span></div><div><b>광고 센터</b><span>심사·기간·성과</span></div><div><b>트래픽</b><span>PV·방문·인기지역</span></div></div></section>
  <nav className="admin-nav"><span>⌂<b>홈</b></span><span>▤<b>편집국</b></span><span>AD<b>광고</b></span><span>↗<b>통계</b></span><span>☰<b>관리</b></span></nav>
 </main>
}