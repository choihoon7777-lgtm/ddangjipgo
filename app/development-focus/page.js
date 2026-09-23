const news=["개발사업 주요 변경사항을 한눈에 확인하세요","전국 정책·고시의 핵심 변화를 빠르게 정리합니다","교통·산업·분양 개발정보를 지역별로 연결합니다"];
const regions=["서울","경기","인천","대전","세종","충남","부산"];
export default function Focus(){
 return <main className="df-site">
  <header className="df-head"><div className="df-mark"><i>◆</i><div><b>개발포커스</b><small>DEVELOPMENT FOCUS</small></div></div><div className="head-tools"><span>전국⌄</span><button>⌕</button><button>☰</button></div></header>
  <div className="cat-strip"><b>홈</b><span>최신뉴스</span><span>지역포커스</span><span>개발사업</span><span>정책·고시</span><span>분양</span><span>교통</span></div>
  <section className="top-focus"><label>TOP FOCUS</label><div className="hero-visual"><span>DEVELOPMENT<br/>INTELLIGENCE</span></div><h1>도시의 변화를<br/>가장 먼저 읽다</h1><p>전국 개발사업·정책·고시의 변화를 검증된 데이터로 연결합니다.</p></section>
  <section className="news-section"><div className="section-title"><h2>오늘의 주요 뉴스</h2><span>더보기</span></div>{news.map((n,i)=><article className="news-row" key={n}><div><small>{["개발사업","정책·고시","교통/SOC"][i]}</small><h3>{n}</h3><p>공식자료 기반 · 검증 완료 콘텐츠</p></div><div className="thumb">DF</div></article>)}</section>
  <section className="region-section"><div className="section-title"><h2>지역별 FOCUS</h2><span>전국보기</span></div><div className="region-scroll">{regions.map(r=><div className="region-card" key={r}><b>{r}</b><span>FOCUS</span><small>개발정보 보기 →</small></div>)}</div></section>
  <section className="landintel"><label>땅짚고 · LAND INTELLIGENCE</label><h2>내 부동산 주변의<br/>변화를 놓치지 마세요.</h2><p>개발사업 · 고시 · 실거래 · 규제변경을 한 곳에서 연결합니다.</p><button>내 부동산 등록</button></section>
  <nav className="public-nav"><span>⌂<b>홈</b></span><span>▤<b>뉴스</b></span><span>◎<b>지역</b></span><span>◇<b>땅짚고</b></span><span>☰<b>MY</b></span></nav>
 </main>
}