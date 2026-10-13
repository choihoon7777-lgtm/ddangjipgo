import{adapt}from"../../../lib/jitgo-api-adapter";
import{landWithFailover}from"../../../lib/df-land-upstream";
const handler=require("../../../lib/jitgo-api/building-envelope");
export async function GET(request){return landWithFailover(request,"building-envelope",handler,"VWORLD_API_KEY",adapt)}
