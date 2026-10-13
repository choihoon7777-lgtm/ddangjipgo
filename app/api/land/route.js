import{adapt}from"../../../lib/jitgo-api-adapter";
import{landWithFailover}from"../../../lib/df-land-upstream";
const handler=require("../../../lib/jitgo-api/land");
export async function GET(request){return landWithFailover(request,"land",handler,"VWORLD_API_KEY",adapt)}
