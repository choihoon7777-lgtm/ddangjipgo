
const OFFICIAL_HOME="https://www.applyhome.co.kr/";
export const HOUSING_KINDS={
 APT:["getAPTLttotPblancDetail","getAPTLttotPblancMdl","일반분양"],
 REMAIN:["getRemndrLttotPblancDetail","getRemndrLttotPblancMdl","무순위·잔여세대"],
 OPTIONAL:["getOPTLttotPblancDetail","getOPTLttotPblancMdl","임의공급"]
};
export const HOUSING_SOURCE="https://www.data.go.kr/data/15098547/openapi.do";
const string=v=>v===null||v===undefined?"":String(v).trim();
export function isoDate(input){
 const raw=string(input).replace(/\D/g,"");
 if(!/^\d{8}$/.test(raw))return null;
 const y=Number(raw.slice(0,4)),m=Number(raw.slice(4,6)),d=Number(raw.slice(6,8));
 const dt=new Date(Date.UTC(y,m-1,d));
 if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d)return null;
 return raw.slice(0,4)+"-"+raw.slice(4,6)+"-"+raw.slice(6,8);
}
export function safeCount(v){
 const raw=string(v).replace(/,/g,"");
 return /^\d+$/.test(raw)&&Number.isSafeInteger(Number(raw))?Number(raw):null;
}
export function maxPriceManwon(v){
 const raw=string(v).replace(/,/g,"").replace(/\s/g,"");
 return /^\d+$/.test(raw)&&Number.isSafeInteger(Number(raw))?Number(raw):null;
}
export function officialLink(v){
 try{const u=new URL(string(v));return u.protocol==="https:"&&(/(^|\.)applyhome\.co\.kr$/i.test(u.hostname)||/(^|\.)reb\.or\.kr$/i.test(u.hostname))?u.toString():OFFICIAL_HOME}catch{return OFFICIAL_HOME}
}
export function cleanHousingNotice(raw,kind,models=[]){
 if(!HOUSING_KINDS[kind])throw Error("UNKNOWN_KIND");
 const houseManageNo=string(raw?.HOUSE_MANAGE_NO),pblancNo=string(raw?.PBLANC_NO);
 if(!/^\d+$/.test(houseManageNo)||!/^\d+$/.test(pblancNo)||!string(raw?.HOUSE_NM))return null;
 const unitRows=(Array.isArray(models)?models:[]).filter(m=>string(m.HOUSE_MANAGE_NO)===houseManageNo&&string(m.PBLANC_NO)===pblancNo);
 const prices=unitRows.map(m=>maxPriceManwon(m.LTTOT_TOP_AMOUNT)).filter(x=>x!==null);
 return {
  offer_key:[kind,houseManageNo,pblancNo].join(":"),
  supply_kind:kind,house_manage_no:houseManageNo,pblanc_no:pblancNo,
  house_name:string(raw.HOUSE_NM),region_name:string(raw.SUBSCRPT_AREA_CODE_NM)||null,
  address:string(raw.HSSPLY_ADRES)||null,
  published_date:isoDate(raw.RCRIT_PBLANC_DE),
  special_start_date:isoDate(raw.SPSPLY_RCEPT_BGNDE),
  special_end_date:isoDate(raw.SPSPLY_RCEPT_ENDDE),
  first_date:isoDate(raw.GNRL_RNK1_CRSPAREA_RCEPT_PD)||isoDate(raw.GNRL_RNK1_ETC_AREA_RCPTDE_PD),
  second_date:isoDate(raw.GNRL_RNK2_CRSPAREA_RCEPT_PD)||isoDate(raw.GNRL_RNK2_ETC_AREA_RCPTDE_PD),
  application_start_date:isoDate(raw.RCEPT_BGNDE),
  application_end_date:isoDate(raw.RCEPT_ENDDE),
  winner_date:isoDate(raw.PRZWNER_PRESNATN_DE),
  contract_start_date:isoDate(raw.CNTRCT_CNCLS_BGNDE),
  contract_end_date:isoDate(raw.CNTRCT_CNCLS_ENDDE),
  total_households:safeCount(raw.TOT_SUPLY_HSHLDCO),
  top_price_manwon:prices.length?Math.max(...prices):null,
  official_url:officialLink(raw.PBLANC_URL||raw.HMPG_ADRES||raw.HOMEPAGE_URL),
  models_json:unitRows,source_json:raw,
  refreshed_at:new Date().toISOString()
 };
}
export function housingStage(row,today){
 const start=[row.special_start_date,row.first_date,row.application_start_date].filter(Boolean).sort()[0];
 const end=[row.second_date,row.special_end_date,row.application_end_date,row.first_date].filter(Boolean).sort().at(-1);
 if(!start||!end)return "일정 확인";
 if(today<start)return "청약 예정";
 if(today<=end)return "청약 진행";
 return "청약 마감";
}
export function housingPriceLabel(price){
 if(price===null||price===undefined||!Number.isFinite(Number(price)))return "공식 분양가 확인 전";
 const n=Number(price),eok=Math.floor(n/10000),rest=n%10000;
 return eok?eok+"억"+(rest?(" "+rest.toLocaleString("ko-KR")+"만원"):""):rest.toLocaleString("ko-KR")+"만원";
}
