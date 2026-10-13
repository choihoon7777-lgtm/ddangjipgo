import{adapt}from"../../../lib/jitgo-api-adapter";
import{readJitgoLand}from"../../../lib/df-land-upstream";
const handler=require("../../../lib/jitgo-api/land-transactions");
export async function GET(request){if(!process.env.DATA_GO_KR_SERVICE_KEY)return readJitgoLand(request,"land-transactions");return adapt(handler,request)}
