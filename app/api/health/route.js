export async function GET(){
 let oidc=false;
 try{
  const{getVercelOidcToken}=await import("@vercel/oidc");
  oidc=!!(await getVercelOidcToken());
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
   officialCollector:"rss_plus_html_fallback",
   automation:process.env.CRON_SECRET&&process.env.SUPABASE_SERVICE_ROLE_KEY?"configured":"missing",
   emailAlerts:process.env.RESEND_API_KEY&&process.env.ALERT_FROM_EMAIL?"configured":"missing",
   siteUrl:process.env.NEXT_PUBLIC_SITE_URL||process.env.VERCEL_PROJECT_PRODUCTION_URL?"configured":"missing"
  },
  timestamp:new Date().toISOString()
 })
}
// Runtime health intentionally exposes status only, never credentials.
