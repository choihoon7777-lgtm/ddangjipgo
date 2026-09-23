const sections=["최신뉴스","지역 FOCUS","개발사업","정책·고시","분양","교통/SOC","산업·기업"];
const regions=["서울","경기","인천","대전","세종","충남","부산"];
export default function FocusHome(){return <main className="focusShell">
<header className="focusHeader"><div className="focusBrand"><span className="focusSymbol">◆</span><div><strong>개발포커스</strong><small>DEVELOPMENT FOCUS</small></div></div><div className="focusTools"><button>전국⌄</button><button>⌕</button><button>☰</button></div></header>
<div className="focusTabs"><b>홈</b>{sections.map(x=><span key={x}>{x}</span>)}</div>
<section className="focusHero"><em>TOP FOCUS</em><div className="focusHeroImg"><span>DEVELOPMENT<br/>INTELLIGENCE</span></div><h1>도시의 변화를<br/>가장 먼저 읽다</h1><p>전국 개발사업·정책·고시의 변화를 하나의 데이터로 연결합니다.</p></section>
<section className="focusBlock"><div className="focusTitle"><h2>오늘의 주요 뉴스</h2><span>더보기</span></div>{["개발사업 주요 변경사항을 한눈에 확인하세요","새로운 정책·고시의 핵심 변화만 빠르게 정리합니다","교통·산업·분양 정보를 지역과 사업별로 연결합니다"].map((x,i)=><article className="focusNews" key={x}><div><small>{["개발사업","정책·고시","교통/SOC"][i]}</small><h3>{x}</h3><p>공식자료 기반 · 검증 후 발행</p></div><div className="focusThumb">DF</div></article>)}</section>
<section className="focusBlock"><div className="focusTitle"><h2>지역별 FOCUS</h2><span>전국보기</span></div><div className="focusRegions">{regions.map(x=><div key={x}><b>{x}</b><span>FOCUS</span><small>개발정보 보기 →</small></div>)}</div></section>
<section className="focusLand"><small>땅짚고 · LAND INTELLIGENCE</small><h2>내 부동산 주변의<br/>변화를 놓치지 마세요.</h2><p>기존 땅짚고의 관심부동산·지도·알림을 개발포커스 데이터와 연결합니다.</p><a href="/">땅짚고 보기</a></section>
<nav className="focusBottom"><span>⌂<b>홈</b></span><span>▤<b>뉴스</b></span><span>◎<b>지역</b></span><span>◇<b>땅짚고</b></span><span>☰<b>MY</b></span></nav></main>}