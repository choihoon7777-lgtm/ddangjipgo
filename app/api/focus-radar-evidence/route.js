import{createClient}from"@supabase/supabase-js";
import{previewEvidence,compareDocumentVersions}from"../../../lib/df-radar-official";
const DB_URL="https://svafsvyjjufbqvxzoqee.supabase.co";
const PUBLIC_KEY="sb_publishable_xdUQguOcbb3TlaMQ7my4Zg_MKT7eeud";
export const runtime="nodejs";
export const maxDuration=30;
const json=(payload,status=200)=>Response.json(payload,{status,headers:{"Cache-Control":"private, no-store"}});
async function authorize(req){
 const header=req.headers.get("authorization")||"";
 if(!header.startsWith("Bearer "))return null;
 const token=header.slice(7);if(token.length<50||token.length>5000)return null;
 const scoped=createClient(DB_URL,PUBLIC_KEY,{global:{headers:{Authorization:"Bearer "+token}},auth:{persistSession:false,autoRefreshToken:false}});
 const {data:{user},error}=await scoped.auth.getUser(token);
 if(error||!user)return null;
 const role=await scoped.from("df_admin_roles").select("profile_id").eq("profile_id",user.id).eq("is_active",true).maybeSingle();
 return role.data?scoped:null;
}
export async function GET(req){
 const sb=await authorize(req);
 if(!sb)return json({ok:false,error:"ADMIN_LOGIN_REQUIRED"},401);
 const params=new URL(req.url).searchParams;
 const address=(params.get("address")||"").trim();
 const pnu=(params.get("pnu")||"").trim();
 if(address.length<5||address.length>180||pnu&&!/^\d{19}$/.test(pnu))return json({ok:false,error:"VALID_ADDRESS_OR_PNU_REQUIRED"},400);
 // Limit query to already verified official documents. Their full text stays server-side.
 const docs=await sb.from("df_source_documents")
  .select("id,title,source_url,detail_url,content_text,key_content,key_facts,verification_status,published_at,canonical_key")
  .in("verification_status",["verified","confirmed"]).order("published_at",{ascending:false}).limit(150);
 if(docs.error)return json({ok:false,error:"OFFICIAL_DOCS_READ_FAILED"},503);
 const matches=previewEvidence(docs.data||[],{address,pnu},{minScore:1,limit:30});
 const docIds=matches.map(m=>m.documentId);
 let versionInfo={status:"no_candidates",documentCount:0,withMultipleVersions:0,withChangedVersions:0};
 if(docIds.length){
  const hist=await sb.from("df_source_document_versions").select("document_id,content_hash,captured_at").in("document_id",docIds).limit(500);
  if(hist.error)versionInfo={status:"not_authorized_or_unavailable",documentCount:docIds.length,withMultipleVersions:null,withChangedVersions:null};
  else{
   const groups=new Map();for(const v of hist.data||[])groups.set(v.document_id,[...(groups.get(v.document_id)||[]),v]);
   const results=[...groups.values()].map(compareDocumentVersions);
   versionInfo={status:"available",documentCount:docIds.length,withMultipleVersions:results.filter(x=>x.hasHistory).length,withChangedVersions:results.filter(x=>x.changed).length};
  }
 }
 return json({ok:true,mode:"read-only-admin-review",watch:{address,pnu:pnu||null},checkedAt:new Date().toISOString(),
  stats:{verifiedDocumentsScanned:(docs.data||[]).length,candidateCount:matches.length,exactParcelMentions:matches.filter(x=>x.evidenceLevel==="parcel-mention").length,exactAddressMentions:matches.filter(x=>x.evidenceLevel==="address-mention").length},
  versionInfo,candidates:matches,notes:["원문 언급은 개발사업 구역 포함·거리·법적 변경을 증명하지 않습니다.","자료 검토 전 자동 알림·DB 변경이력 저장을 실행하지 않습니다."]});
}
