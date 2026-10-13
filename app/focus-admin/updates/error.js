"use client";
import {useEffect} from "react";
export default function UpdateError({error,reset}){
 useEffect(()=>{console.error("Development Focus: update-screen render failed",error)},[error]);
 const diagnostic=String(error?.digest||error?.message||"RENDER_ERROR").slice(0,160);
 return <main className="adminShell dfAdminUnified"><section className="adminPanel" style={{padding:22,marginTop:24}}>
  <small style={{color:"#ab672c",fontWeight:800}}>화면 연결 오류</small>
  <h1 style={{fontSize:21,lineHeight:1.4,margin:"10px 0",color:"#142f54"}}>자료 업데이트 화면을 불러오지 못했습니다.</h1>
  <p style={{fontSize:13,lineHeight:1.6,color:"#718198"}}>등록된 데이터는 삭제되지 않았습니다. 새로고침하거나 공개자료 화면으로 이동할 수 있습니다.</p>
  <button className="adminPrimary" onClick={()=>{reset();window.location.reload()}}>다시 불러오기</button>
  <a className="adminSecondary" style={{display:"flex",alignItems:"center",justifyContent:"center",padding:12,marginTop:10}} href="/focus/policy">개발정책 공개자료 보기 →</a>
  <details style={{marginTop:18,fontSize:11,color:"#77879a",overflowWrap:"anywhere"}}><summary>진단 정보</summary><code>{diagnostic}</code></details>
 </section></main>;
}
