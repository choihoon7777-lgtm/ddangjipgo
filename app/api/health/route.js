export async function GET(){
 const direct=!!process.env.OPENAI_API_KEY;
 const gateway=!!(process.env.AI_GATEWAY_API_KEY||process.env.VERCEL_OIDC_TOKEN);
 return Response.json({
  service:"development-focus",
  status:"ok",
  mode:"development",
  components:{
   database:"configured",
   ai:direct||gateway?"configured":"missing",
   aiTransport:direct?"openai-direct":gateway?"vercel-ai-gateway":"missing",
   landTradeApi:process.env.DATA_GO_KR_SERVICE_KEY?"configured":"missing",
   officialCollector:"not_connected"
  },
  timestamp:new Date().toISOString()
 })
}