export const REGION_NAMES=["전국","서울","부산","대구","인천","광주","대전","울산","세종","경기","강원","충북","충남","전북","전남","경북","경남","제주"];
export const OFFICIAL_CHANNELS=["전체","보도자료","고시·공고","입법예고","조례·규칙"];
const codes={"서울특별시":"서울","부산광역시":"부산","대구광역시":"대구","인천광역시":"인천","광주광역시":"광주","대전광역시":"대전","울산광역시":"울산","세종특별자치시":"세종","세종시":"세종","경기도":"경기","강원도":"강원","강원특별자치도":"강원","충청북도":"충북","충청남도":"충남","전라북도":"전북","전북특별자치도":"전북","전라남도":"전남","경상북도":"경북","경상남도":"경남","제주특별자치도":"제주","제주도":"제주"};
export function officialRegion(record){
 const raw=String(record?.region_code||"").trim();
 if(raw)return codes[raw]|| (REGION_NAMES.includes(raw)?raw:null);
 // Region can be inferred from an explicitly region-named government source,
 // but NEVER from a generic article title or arbitrary national-source content.
 const source=String(record?.source_name||"").trim();
 for(const [full,short] of Object.entries(codes))if(source.startsWith(full))return short;
 return null;
}
export function officialChannel(record){
 const channel=String(record?.channel||"");
 if(channel==="고시공고"||channel==="고시·공고")return "고시·공고";
 if(channel==="조례규칙"||channel==="조례·규칙")return "조례·규칙";
 return OFFICIAL_CHANNELS.includes(channel)?channel:"보도자료";
}
export function filteredOfficial(records,region="전국",channel="전체"){
 return (Array.isArray(records)?records:[]).filter(r=>(region==="전국"||officialRegion(r)===region)&&(channel==="전체"||officialChannel(r)===channel))
  .sort((a,b)=>new Date(b.published_at||b.fetched_at||0)-new Date(a.published_at||a.fetched_at||0));
}
export const officialDate=(v)=>{if(!v)return "";const d=new Date(v);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(d)};
