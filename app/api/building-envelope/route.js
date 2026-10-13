import{adapt}from"../../../lib/jitgo-api-adapter";
import{readJitgoLand}from"../../../lib/df-land-upstream";
const handler=require("../../../lib/jitgo-api/building-envelope");
export async function GET(request){if(!process.env.VWORLD_API_KEY)return readJitgoLand(request,"building-envelope");return adapt(handler,request)}
