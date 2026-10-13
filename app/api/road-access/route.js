import{adapt}from"../../../lib/jitgo-api-adapter";
import{readJitgoLand}from"../../../lib/df-land-upstream";
const handler=require("../../../lib/jitgo-api/road-access");
export async function GET(request){if(!process.env.VWORLD_API_KEY)return readJitgoLand(request,"road-access");return adapt(handler,request)}
