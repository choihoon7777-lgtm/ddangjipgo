"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFSubHeader,DFBottomNav,DFLiveNotice,DFLiveAd}from"../../../components/df-shell";

const regionMap={"서울특별시":"서울","부산광역시":"부산","대구광역시":"대구","인천광역시":"인천","광주광역시":"광주","대전광역시":"대전","울산광역시":"울산","세종특별자치시":"세종","경기도":"경기","강원특별자치도":"강원","강원도":"강원","충청북도":"충북","충청남도":"충남","전북특별자치도":"전북","전라북도":"전북","전라남도":"전남","경상북도":"경북","경상남도":"경남","제주특별자치도":"제주"};
function regionOf(address){const first=(address||"").split(" ")[0];return regionMap[first]||first.replace(/(특별시|광역시|특별자치시|특별자치도|도)$/,"")}

export default function LandAnalysis(){
 const[address,setAddress]=useState(""),[region,setRegion]=useState(""),[user,setUser]=useState(null),[existing,setExisting]=useState(null),[news,setNews]=useState([]),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 useEffect(()=>{(async()=>{
  const addr=new URLSearchParams(window.location.search).get("address")||"";const reg=regionOf(addr);setAddress(addr);setRegion(reg);
  const{data:{user:u}}=await dfSupabase.auth.getUser();setUser(u||null);
  if(u&&addr){const{data:w}=await dfSupabase.from("df_land_watchlists").select("*").eq("profile_id",u.id).eq("address_text",addr).maybeSingle();setExisting(w||null)}
  if(reg){const{data:a}=await dfSupabase.from("df_articles").select("id,title,category,published_at").in("status",["published","corrected"]).eq("region_code",reg).order("published_at",{ascending:false}).limit(5);setNews(a||[])}
 })()},[]);
 async function save(){
  if(!address)return;if(!user){location.href="/login?next="+encodeURIComponent(location.pathname+location.search);return}
  setBusy(true);setMsg("");
  try{
   const{data,error}=await dfSupabase.from("df_land_watchlists").insert({profile_id:user.id,label:address,address_text:address,parcel_key:address,region_code:region||null,radius_m:1000,is_active:true}).select().single();
   if(error)throw error;location.href="/asset/"+data.id;
  }catch(e){setMsg(e.code==="23505"?"이미 등록한 부동산입니다.":e.message)}finally{setBusy(false)}
 }
 return <main className="focusShell dfHigh"><DFSubHeader title="땅짚고" kicker="LAND INTELLIGENCE" back="/search" right={null}/>
  <DFLiveNotice placement="land" region={region||null}/>
  <section className="dfLandResultHero"><small>SELECTED PROPERTY</small><h1>{address||"분석할 부동산을 선택하세요."}</h1><p>선택한 주소를 기준으로 관심부동산 저장·지역 개발뉴스·공식 토지정보를 연결합니다.</p></section>
  <section className="dfLandModules"><div><b>01 관심부동산</b><span>{existing?"등록 완료 · 변화 추적중":"계정에 저장해 변화 추적"}</span></div><div><b>02 공식 토지정보</b><span>K-GeoP에서 지적도·토지정보 확인</span></div><div><b>03 실거래 확인</b><span>국토부 실거래 공개시스템 연결</span></div><div><b>04 개발 변화</b><span>{region?region+" 관련 검증기사 "+news.length+"건":"지역 선택 필요"}</span></div></section>
  <section className="dfLandActionBox">{existing?<><b>이미 관심부동산에 등록되어 있습니다.</b><a className="adminPrimary" href={"/asset/"+existing.id}>내 부동산 상세보기 →</a></>:<><b>이 부동산을 계속 추적할까요?</b><button className="adminPrimary" disabled={busy||!address} onClick={save}>{busy?"저장 중…":"관심부동산 등록"}</button></>}{msg&&<span>{msg}</span>}</section>
  <section className="focusBlock"><div className="focusTitle"><div><small className="focusEyebrow">OFFICIAL DATA</small><h2>공식정보 바로가기</h2></div></div><div className="dfLandOfficialLinks"><a href="https://www.kgeop.go.kr" target="_blank" rel="noreferrer"><b>K-GeoP 스마트국토정보</b><span>지적도 · 토지 기본정보 ↗</span></a><a href="https://rt.molit.go.kr" target="_blank" rel="noreferrer"><b>국토교통부 실거래가</b><span>토지 실거래 조회 ↗</span></a></div></section>
  <section className="focusBlock"><div className="focusTitle"><div><small className="focusEyebrow">REGIONAL SIGNAL</small><h2>{region||"선택지역"} 개발뉴스</h2></div></div>{news.length?news.map(x=><a className="focusNews" href={"/focus/article?id="+x.id} key={x.id}><div><small>{x.category} · {region}</small><h3>{x.title}</h3><p>{new Date(x.published_at).toLocaleDateString("ko-KR")}</p></div><span className="newsArrow">→</span></a>):<div className="focusEmpty"><b>연결된 검증기사가 아직 없습니다.</b><span>해당 지역 기사가 발행되면 이곳과 알림에 연결됩니다.</span></div>}</section>
  <DFLiveAd placement="land" region={region||null}/>
  <section className="dfLandResultNotice"><b>검증된 데이터만 표시합니다.</b><span>공식 API가 연결되지 않은 항목은 임의의 수치를 만들지 않고 공식 조회 화면으로 연결합니다.</span></section>
  <a className="dfLandBackAction" href="/search">다른 부동산 선택하기 →</a><DFBottomNav active="land"/>
 </main>
}