export async function GET(){
 let oidc=false;
 try{
  const{getVercelOidcToken}=await import("@vercel/oidc");
  oidc=!!(await getVercelOidcToken({project:"prj_mbS3kBWI0cYB9QTDmoFscdQB6ElL",team:"team_wAsV551VHlOwBpqCfY6hPXMg"}));
 }catch{}
 const direct=!!process.env.OPENAI_API_KEY;
 const gatewayKey=!!process.env.AI_GATEWAY_API_KEY;
 const gateway=gatewayKey||!!process.env.VERCEL_OIDC_TOKEN||oidc;
 return Response.json({
  service:"development-focus",
  status:"ok",
  mode:"development",
  components:{
   database:"configured",
   ai:direct||gateway?"configured":"missing",
   aiTransport:direct?"openai-direct":gateway?"vercel-ai-gateway":"missing",
   landTradeApi:process.env.DATA_GO_KR_SERVICE_KEY?"configured":"missing",
   officialCollector:"manual_url"
  },
  timestamp:new Date().toISOString()
 })
}
// Runtime health intentionally exposes status only, never credentials.
