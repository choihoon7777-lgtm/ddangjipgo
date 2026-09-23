const sections=["최신뉴스","지역 FOCUS","개발사업","정책·고시","분양","금융","건설사 동향"];
const regions=["서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
export default function FocusHome(){return <main className="focusShell">
<header className="focusHeader"><div className="focusBrand"><span className="focusSymbol">◆</span><div><strong>개발포커스</strong><small>DEVELOPMENT FOCUS</small></div></div><div className="focusTools"><button>전국⌄</button><button>⌕</button><button>☰</button></div></header>
<div className="focusTabs"><b>홈</b>{sections.map(x=><span key={x}>{x}</span>)}</div>
<section className="focusHero"><div className="focusLandBox">
<div className="focusLandBoxHead"><div><small>LAND INTELLIGENCE</small><h1>땅짚고</h1></div><span className="focusLandBadge">내 부동산 관리</span></div>
<p className="focusLandTagline">내 땅의 변화를 놓치지 않도록</p>
<p className="focusLandDesc">내 토지·건물을 등록하면 주변의 중요한 변화를 지속적으로 추적하고 한곳에서 관리합니다.</p>
<div className="focusLandFeatures"><span><b>01</b>개발사업</span><span><b>02</b>도시계획·고시</span><span><b>03</b>실거래</span><span><b>04</b>개발호재</span></div>
<div className="focusHeroActions"><a className="focusHeroPrimary" href="/">내 부동산 등록</a><a className="focusHeroSecondary" href="/">땅짚고 보기 →</a></div>
</div></section>
<section className="focusBlock"><div className="focusTitle"><h2>오늘의 주요 뉴스</h2><span>더보기</span></div>{["개발사업 주요 변경사항을 한눈에 확인하세요","새로운 정책·고시의 핵심 변화만 빠르게 정리합니다","교통·산업·분양 정보를 지역과 사업별로 연결합니다"].map((x,i)=><article className="focusNews" key={x}><div><small>{["개발사업","정책·고시","금융"][i]}</small><h3>{x}</h3><p>공식자료 기반 · 검증 후 발행</p></div><div className="focusThumb">DF</div></article>)}</section>
<section className="focusBlock"><div className="focusTitle"><h2>지역별 FOCUS</h2><a href="/focus/region" className="focusAll">전국보기 →</a></div><div className="focusRegions">{regions.map(x=><a href={"/focus/region?name="+encodeURIComponent(x)} className="focusRegionCard" key={x}><b>{x}</b><span>FOCUS</span><small>개발정보 보기 →</small></a>)}</div></section>

<nav className="focusBottom"><span>⌂<b>홈</b></span><span>▤<b>뉴스</b></span><span>◎<b>지역</b></span><span>◇<b>땅짚고</b></span><span>☰<b>MY</b></span></nav></main>}