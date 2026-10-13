import{adapt}from"../../../lib/jitgo-api-adapter";
import{landWithFailover}from"../../../lib/df-land-upstream";
const handler=require("../../../lib/jitgo-api/road-access");
export async function GET(request){return landWithFailover(request,"road-access",handler,"VWORLD_API_KEY",adapt)}
