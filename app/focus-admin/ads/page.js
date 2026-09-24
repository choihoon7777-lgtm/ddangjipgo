"use client";
import{useEffect,useState}from"react";
import{dfSupabase}from"../../../lib/df-browser";
import{DFAdminHeader,DFAdminBottomNav}from"../../../components/df-shell";

const init={advertiser_name:"",contact_name:"",contact_phone:"",contact_email:"",slot_id:"",region_code:"",start_at:"",end_at:"",creative_url:"",target_url:"",amount:"",payment_status:"unpaid"};
export default function Ads(){
 const[slots,setSlots]=useState([]),[items,setItems]=useState([]),[form,setForm]=useState(init),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 async function load(){
  const[s,c]=await Promise.all([
   dfSupabase.from("df_ad_slots").select("*").eq("is_active",true).order("placement"),
   dfSupabase.from("df_ad_campaigns").select("*,df_ad_slots(name,placement)").order("created_at",{ascending:false})
  ]);
  if(s.error||c.error)setMsg(s.error?.message||c.error?.message);else{setSlots(s.data||[]);setItems(c.data||[])}
 }
 useEffect(()=>{load()},[]);
 async function create(){
  setBusy(true);setMsg("");
  try{
   if(!form.start_at||!form.end_at)throw new Error("광고 시작일과 종료일을 입력하세요.");
   if(new Date(form.end_at)<=new Date(form.start_at))throw new Error("광고 종료일시는 시작일시보다 뒤여야 합니다.");
   const{error}=await dfSupabase.from("df_ad_campaigns").insert({
    advertiser_name:form.advertiser_name.trim(),contact_name:form.contact_name.trim()||null,contact_phone:form.contact_phone.trim()||null,contact_email:form.contact_email.trim()||null,
    slot_id:form.slot_id||null,region_code:form.region_code.trim()||null,start_at:new Date(form.start_at).toISOString(),end_at:new Date(form.end_at).toISOString(),
    creative_url:form.creative_url.trim()||null,target_url:form.target_url.trim()||null,amount:form.amount?Number(form.amount):null,payment_status:form.payment_status,status:"pending"
   });
   if(error)throw error;setForm(init);setShow(false);await load();setMsg("광고 캠페인을 등록했습니다.");
  }catch(e){setMsg(e.message||"등록 실패")}finally{setBusy(false)}
 }
 async function patch(id,data){setBusy(true);setMsg("");const{error}=await dfSupabase.from("df_ad_campaigns").update(data).eq("id",id);if(error)setMsg(error.message);await load();setBusy(false)}
 return <main className="adminShell dfAdminUnified"><DFAdminHeader title="광고 관리" kicker="AD OPERATIONS"/>
 <section className="adminPanel"><div className="adminSectionTitle"><div><small>CAMPAIGNS</small><h2>광고 운영</h2></div><button className="miniBtn" onClick={()=>setShow(!show)}>+ 광고 등록</button></div>
 <div className="pipeline"><span>신청</span><i>→</i><span>심사</span><i>→</i><span>결제</span><i>→</i><span>소재</span><i>→</i><span>게시</span></div>
 {show&&<div className="dfAdminFormBox">
  <label>광고주<input value={form.advertiser_name} onChange={e=>setForm({...form,advertiser_name:e.target.value})} placeholder="회사명"/></label>
  <div className="dfAiClassify"><label>광고 슬롯<select value={form.slot_id} onChange={e=>setForm({...form,slot_id:e.target.value})}><option value="">슬롯 선택</option>{slots.map(x=><option value={x.id} key={x.id}>{x.name} · {x.placement}</option>)}</select></label><label>지역<input value={form.region_code} onChange={e=>setForm({...form,region_code:e.target.value})} placeholder="전국이면 비움"/></label></div>
  <div className="dfAiClassify"><label>시작<input type="datetime-local" value={form.start_at} onChange={e=>setForm({...form,start_at:e.target.value})}/></label><label>종료<input type="datetime-local" value={form.end_at} onChange={e=>setForm({...form,end_at:e.target.value})}/></label></div>
  <label>소재 이미지 URL<input value={form.creative_url} onChange={e=>setForm({...form,creative_url:e.target.value})} placeholder="https://..."/></label>
  <label>클릭 URL<input value={form.target_url} onChange={e=>setForm({...form,target_url:e.target.value})} placeholder="https://..."/></label>
  <div className="dfAiClassify"><label>광고금액<input type="number" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})} placeholder="원"/></label><label>결제상태<select value={form.payment_status} onChange={e=>setForm({...form,payment_status:e.target.value})}><option value="unpaid">미결제</option><option value="paid">결제완료</option></select></label></div>
  <label>담당자<input value={form.contact_name} onChange={e=>setForm({...form,contact_name:e.target.value})}/></label>
  <div className="dfAiClassify"><label>연락처<input value={form.contact_phone} onChange={e=>setForm({...form,contact_phone:e.target.value})}/></label><label>이메일<input value={form.contact_email} onChange={e=>setForm({...form,contact_email:e.target.value})}/></label></div>
  <button className="adminPrimary" disabled={busy||!form.advertiser_name.trim()||!form.slot_id||!form.start_at||!form.end_at} onClick={create}>광고 캠페인 등록</button>
 </div>}
 {msg&&<p className="adminDataNote">{msg}</p>}
 {!items.length?<div className="adminEmpty"><b>진행 광고 없음</b><span>광고를 등록하면 심사·결제·활성·종료 상태를 실제 데이터로 관리합니다.</span></div>:<div className="dfAdminList">{items.map(x=><article key={x.id}><div><small>{x.df_ad_slots?.name||"슬롯 미지정"}{x.region_code?" · "+x.region_code:" · 전국"}</small><b>{x.advertiser_name}</b><span>{new Date(x.start_at).toLocaleDateString("ko-KR")} ~ {new Date(x.end_at).toLocaleDateString("ko-KR")}</span><em>{x.status} · {x.payment_status}{x.amount?" · "+Number(x.amount).toLocaleString()+"원":""}</em></div><div className="dfListActions">
 {x.status==="pending"&&<button onClick={()=>patch(x.id,{status:"approved",approved_at:new Date().toISOString()})}>승인</button>}
 {x.payment_status!=="paid"&&<button onClick={()=>patch(x.id,{payment_status:"paid"})}>결제확인</button>}
 {["approved","paused"].includes(x.status)&&x.payment_status==="paid"&&<button onClick={()=>patch(x.id,{status:"active"})}>게시</button>}
 {x.status==="active"&&<button onClick={()=>patch(x.id,{status:"paused"})}>일시정지</button>}
 {!["ended","rejected"].includes(x.status)&&<button onClick={()=>patch(x.id,{status:"ended"})}>종료</button>}
 </div></article>)}</div>}
 </section><DFAdminBottomNav active="ads"/></main>
}