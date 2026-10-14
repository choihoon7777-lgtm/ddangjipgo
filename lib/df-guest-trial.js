// Browser-only guest trial. No authentication secrets or account data are stored here.
const ROOT="df_guest_trial_v1:";
const read=(key,limit=200)=>{if(typeof window==="undefined")return[];try{const arr=JSON.parse(localStorage.getItem(ROOT+key)||"[]");return Array.isArray(arr)?arr.slice(0,limit):[]}catch{return[]}};
const write=(key,items,limit=200)=>{if(typeof window==="undefined")throw Error("이 기기 저장소를 사용할 수 없습니다.");try{localStorage.setItem(ROOT+key,JSON.stringify(items.slice(0,limit)));window.dispatchEvent(new Event("df:guest-update"));}catch{throw Error("기기의 저장 공간이 차단되거나 가득 찼습니다.")}};
const now=()=>new Date().toISOString();
export const isGuestId=id=>/^guest-[a-z0-9-]{12,70}$/i.test(String(id||""));
export const guestProperties=()=>read("properties",50);
export const guestProperty=id=>guestProperties().find(p=>p.id===id)||null;
export function guestAddProperty(item){
 const address=String(item.address_text||"").trim().slice(0,190);
 if(address.length<5)throw Error("주소를 확인해 주세요.");
 const list=guestProperties();
 const existing=list.find(p=>p.address_text===address);
 if(existing)return existing;
 if(list.length>=30)throw Error("체험 등록은 기기당 30개까지 지원합니다.");
 const id="guest-"+(typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+"-"+Math.random().toString(36).slice(2));
 const row={id,profile_id:null,label:String(item.label||address).slice(0,190),address_text:address,parcel_key:/^\d{19}$/.test(String(item.parcel_key||""))?String(item.parcel_key):null,region_code:String(item.region_code||"").slice(0,15),latitude:Number.isFinite(Number(item.latitude))&&item.latitude!=null?Number(item.latitude):null,longitude:Number.isFinite(Number(item.longitude))&&item.longitude!=null?Number(item.longitude):null,radius_m:1000,is_active:true,watch_official:true,watch_dong_updates:false,created_at:now(),guest:true};
 write("properties",[row,...list],50);return row;
}
export function guestUpdateProperty(id,patch){
 if(!isGuestId(id))throw Error("체험 부동산이 아닙니다.");
 const allow=["is_active","watch_official","watch_dong_updates"];
 const filtered=Object.fromEntries(Object.entries(patch||{}).filter(([k,v])=>allow.includes(k)&&typeof v==="boolean"));
 const list=guestProperties();if(!list.some(x=>x.id===id))throw Error("등록한 부동산을 찾지 못했습니다.");
 write("properties",list.map(x=>x.id===id?{...x,...filtered}:x),50);
 return guestProperty(id);
}
export function guestRemoveProperty(id){
 if(!isGuestId(id))throw Error("체험 부동산이 아닙니다.");
 write("properties",guestProperties().filter(x=>x.id!==id),50);
 write("alerts",guestAlerts().filter(x=>x.watchlist_id!==id),200);
}
export const guestAlerts=()=>read("alerts",200);
export const guestUnread=()=>guestAlerts().filter(x=>["pending","sent"].includes(x.status)).length;
export function guestUpsertAlert(a){
 if(!isGuestId(a.watchlist_id)||!guestProperty(a.watchlist_id))return null;
 const list=guestAlerts(),key=String(a.key||"").slice(0,220);
 if(list.some(x=>x.key===key&&x.watchlist_id===a.watchlist_id))return null;
 const row={id:"guest-alert-"+(typeof crypto!=="undefined"&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)),key,watchlist_id:a.watchlist_id,article_id:null,alert_type:String(a.alert_type||"guest_info"),title:String(a.title||"새 알림").slice(0,200),payload:a.payload||{},status:"pending",created_at:now()};
 write("alerts",[row,...list],200);return row;
}
export function guestAlertStatus(id,status){
 if(!["pending","sent","read","dismissed"].includes(status))return;
 write("alerts",guestAlerts().map(x=>x.id===id?{...x,status}:x),200);
}
export const guestSaved=()=>read("saved",150);
export const guestRecent=()=>read("recent",150);
export const guestIsSaved=id=>guestSaved().some(x=>x.article_id===id);
export function guestToggleSaved(article){
 const id=String(article?.id||"");if(!/^[0-9a-f-]{36}$/i.test(id))return false;
 const list=guestSaved(),had=list.some(x=>x.article_id===id);
 write("saved",had?list.filter(x=>x.article_id!==id):[{article_id:id,created_at:now(),df_articles:{id,title:String(article.title||"").slice(0,200),category:article.category||"개발정보",region_code:article.region_code||"",status:"published"}},...list],150);
 return!had;
}
export function guestRecordRecent(article){
 const id=String(article?.id||"");if(!/^[0-9a-f-]{36}$/i.test(id))return;
 const list=guestRecent(),prior=list.find(x=>x.article_id===id);
 write("recent",[{article_id:id,last_viewed_at:now(),view_count:(prior?.view_count||0)+1,df_articles:{id,title:String(article.title||"").slice(0,200),category:article.category||"개발정보",region_code:article.region_code||"",status:"published"}},...list.filter(x=>x.article_id!==id)],150);
}
export const guestClearRecent=()=>write("recent",[],150);
